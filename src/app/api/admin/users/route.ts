import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/ensure-employee";
import { createServiceClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  /** Owner may create another Admin (manager). Default: regular user. */
  role: z.enum(["employee", "manager"]).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { employee } = auth as Awaited<ReturnType<typeof requireAdmin>> & {
    employee: { shop_id: string; id: string; role?: string | null };
  };

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid name, email, or password" }, { status: 400 });
  }

  let admin;
  try {
    admin = createServiceClient();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Service role key required to create users. Set SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 },
    );
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: body.email.trim().toLowerCase(),
    password: body.password,
    email_confirm: true,
    user_metadata: {
      full_name: body.fullName.trim(),
      shop_name: "Staff",
    },
  });

  if (createError || !created.user) {
    return NextResponse.json(
      { error: createError?.message || "Could not create auth user" },
      { status: 400 },
    );
  }

  const wantAdmin = body.role === "manager";
  if (wantAdmin && employee.role !== "owner") {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return NextResponse.json(
      { error: "Only the Owner can create other Admins." },
      { status: 403 },
    );
  }

  const staffRole = wantAdmin ? "manager" : "employee";

  // Attach to this shop — never create a second Owner via this form
  const { error: empError } = await admin.from("employees").upsert(
    {
      id: created.user.id,
      shop_id: employee.shop_id,
      full_name: body.fullName.trim(),
      email: body.email.trim().toLowerCase(),
      role: staffRole,
    },
    { onConflict: "id" },
  );

  if (empError) {
    // Roll back auth user if profile insert fails
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return NextResponse.json({ error: empError.message }, { status: 500 });
  }

  // Prevent handle_new_user trigger from creating a second shop if it ran —
  // if a stray shop was created, leave it; employee row points to admin's shop.
  const supabase = await createClient();
  void supabase;

  return NextResponse.json({
    ok: true,
    userId: created.user.id,
    role: staffRole,
  });
}

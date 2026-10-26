import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/ensure-employee";
import { createServiceClient } from "@/lib/supabase/admin";

const BodySchema = z.object({
  role: z.enum(["manager", "employee"]),
});

type Ctx = { params: Promise<{ id: string }> };

/** Owner only: promote staff to Admin (manager) or demote to User. */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { employee, user } = auth as Awaited<ReturnType<typeof requireAdmin>> & {
    employee: { shop_id: string; id: string; role?: string | null };
    user: { id: string };
  };

  if (employee.role !== "owner") {
    return NextResponse.json(
      { error: "Only the workspace Owner can change admin roles." },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;
  if (!id || id === user.id) {
    return NextResponse.json({ error: "Cannot change your own role here." }, { status: 400 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Role must be manager or employee" }, { status: 400 });
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
            : "SUPABASE_SERVICE_ROLE_KEY required to change roles.",
      },
      { status: 500 },
    );
  }

  const { data: target, error: findError } = await admin
    .from("employees")
    .select("id, shop_id, role")
    .eq("id", id)
    .maybeSingle();

  if (findError || !target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.shop_id !== employee.shop_id) {
    return NextResponse.json({ error: "User is not in your workspace" }, { status: 403 });
  }
  if (target.role === "owner") {
    return NextResponse.json({ error: "Cannot change the Owner role" }, { status: 400 });
  }

  const { error: updError } = await admin
    .from("employees")
    .update({ role: body.role, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updError) {
    return NextResponse.json({ error: updError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, role: body.role });
}

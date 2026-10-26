import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireEmployee } from "@/lib/auth/ensure-employee";
import { isAdminRole } from "@/lib/auth/roles";
const BodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  workspace: z.string().trim().max(160).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(160)
    .optional()
    .transform((v) => v || "")
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Invalid email"),
  message: z.string().trim().min(1).max(4000),
});

/** Public: save a marketing contact message into the admin inbox. */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Please fill name and message." }, { status: 400 });
    }

    const { name, workspace, phone, email, message } = parsed.data;
    const admin = createServiceClient();
    const { error } = await admin.from("contact_messages").insert({
      name,
      workspace_name: workspace?.trim() || null,
      phone: phone?.trim() || null,
      email: email?.trim() || null,
      message,
    });

    if (error) {
      console.error("contact insert failed", error.message);
      return NextResponse.json(
        {
          error:
            "Could not save your message. In Supabase → SQL Editor, run supabase/migrations/009_admin_dashboard.sql, then try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    if (/SUPABASE_SERVICE_ROLE|Missing NEXT_PUBLIC/i.test(msg)) {
      return NextResponse.json(
        { error: "Server is missing Supabase service key. Check environment variables." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Admin: list inbox messages (service role after admin check). */
export async function GET() {
  const auth = await requireEmployee();
  if ("error" in auth && auth.error) return auth.error;
  const { employee } = auth as Awaited<ReturnType<typeof requireEmployee>> & {
    employee: { role: string };
  };
  if (!isAdminRole(employee.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("contact_messages")
      .select("id, name, workspace_name, phone, email, message, created_at, read_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ messages: data || [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load messages" },
      { status: 500 },
    );
  }
}

/** Admin: mark message as read. */
export async function PATCH(request: NextRequest) {
  const auth = await requireEmployee();
  if ("error" in auth && auth.error) return auth.error;
  const { employee } = auth as Awaited<ReturnType<typeof requireEmployee>> & {
    employee: { role: string };
  };
  if (!isAdminRole(employee.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const admin = createServiceClient();
    const { error } = await admin
      .from("contact_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}

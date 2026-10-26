import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { requireEmployee } from "@/lib/auth/ensure-employee";
import { isAdminRole } from "@/lib/auth/roles";
const BodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  workspace: z.string().trim().max(160).optional().or(z.literal("")),
  rating: z.coerce.number().int().min(1).max(5),
  message: z.string().trim().min(1).max(2000),
});

/** Public: submit a site review. */
export async function POST(request: NextRequest) {
  try {
    const parsed = BodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Please add your name, a 1–5 rating, and a short review." },
        { status: 400 },
      );
    }

    const { name, workspace, rating, message } = parsed.data;
    const admin = createServiceClient();
    const { error } = await admin.from("site_reviews").insert({
      name,
      workspace_name: workspace?.trim() || null,
      rating,
      message,
    });

    if (error) {
      console.error("review insert failed", error.message);
      return NextResponse.json(
        {
          error:
            "Could not save review. Run migration 009_admin_dashboard.sql in Supabase, then try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    if (/SUPABASE_SERVICE_ROLE|Missing NEXT_PUBLIC/i.test(msg)) {
      return NextResponse.json(
        { error: "Server is missing Supabase service key." },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** Admin: list reviews (service role after admin check). */
export async function GET() {
  const auth = await requireEmployee();
  if ("error" in auth && auth.error) return auth.error;
  const { employee } = auth as Awaited<ReturnType<typeof requireEmployee>> & {
    employee: { role?: string | null };
  };
  if (!isAdminRole(employee.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const admin = createServiceClient();
    const { data, error } = await admin
      .from("site_reviews")
      .select("id, name, workspace_name, rating, message, created_at, approved_at, archived_at")
      .is("archived_at", null)
      .order("created_at", { ascending: false })
      .limit(80);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ reviews: data || [] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not load reviews" },
      { status: 500 },
    );
  }
}

/** Admin: approve or archive a review. */
export async function PATCH(request: NextRequest) {
  const auth = await requireEmployee();
  if ("error" in auth && auth.error) return auth.error;
  const { employee } = auth as Awaited<ReturnType<typeof requireEmployee>> & {
    employee: { role?: string | null };
  };
  if (!isAdminRole(employee.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = String(body.id || "");
  const action = String(body.action || "");
  if (!id || !["approve", "archive"].includes(action)) {
    return NextResponse.json({ error: "id and action (approve|archive) required" }, { status: 400 });
  }

  const patch =
    action === "approve"
      ? { approved_at: new Date().toISOString() }
      : { archived_at: new Date().toISOString() };

  try {
    const admin = createServiceClient();
    const { error } = await admin.from("site_reviews").update(patch).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    );
  }
}

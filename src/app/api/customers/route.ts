import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/ensure-employee";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth && auth.error) return auth.error;
  const { supabase, employee } = auth as Awaited<ReturnType<typeof requireAdmin>> & {
    supabase: Awaited<ReturnType<typeof createClient>>;
    employee: { shop_id: string };
  };

  const q = (request.nextUrl.searchParams.get("q") || "").trim();
  let query = supabase
    .from("customers")
    .select("id, full_name, phone, email, city, updated_at")
    .eq("shop_id", employee.shop_id)
    .order("updated_at", { ascending: false })
    .limit(30);

  if (q) {
    query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customers: data });
}

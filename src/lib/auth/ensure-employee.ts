import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { isAdminRole } from "@/lib/auth/roles";

export type EmployeeRow = {
  id: string;
  shop_id: string;
  full_name: string;
  email?: string | null;
  role?: string | null;
};

/**
 * Ensures the signed-in auth user has shop + employee rows.
 * 1) Try read existing
 * 2) Try RPC bootstrap_employee_profile (works without service role)
 * 3) Fallback: service-role insert
 */
export async function ensureEmployeeForUser(user: User): Promise<EmployeeRow> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("employees")
    .select("id, shop_id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.shop_id) {
    return existing as EmployeeRow;
  }

  const meta = user.user_metadata || {};
  const fullName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    user.email?.split("@")[0] ||
    "Employee";
  const shopName =
    (typeof meta.shop_name === "string" && meta.shop_name.trim()) || "My Workspace";
  const workspaceType =
    (typeof meta.workspace_type === "string" && meta.workspace_type.trim()) || "general";

  // Preferred: DB function (no service key needed) — run migration 003 first
  const { data: bootstrapped, error: rpcError } = await supabase.rpc(
    "bootstrap_employee_profile",
    {
      p_full_name: fullName,
      p_shop_name: shopName,
    },
  );

  if (!rpcError && bootstrapped) {
    const row = Array.isArray(bootstrapped) ? bootstrapped[0] : bootstrapped;
    if (row?.shop_id) return row as EmployeeRow;
  }

  // Fallback with service role
  let admin;
  try {
    admin = createServiceClient();
  } catch (e) {
    const rpcHint = rpcError?.message
      ? ` RPC error: ${rpcError.message}.`
      : " If RPC missing, run supabase/migrations/003_employee_self_select.sql in Supabase SQL Editor.";
    throw new Error(
      (e instanceof Error ? e.message : "Service key unavailable.") + rpcHint,
    );
  }

  const { data: byId } = await admin
    .from("employees")
    .select("id, shop_id, full_name, email, role")
    .eq("id", user.id)
    .maybeSingle();

  if (byId?.shop_id) {
    return byId as EmployeeRow;
  }

  let shop: { id: string } | null = null;
  {
    const first = await admin
      .from("shops")
      .insert({ name: shopName, workspace_type: workspaceType })
      .select("id")
      .single();
    if (first.data?.id) {
      shop = first.data;
    } else {
      const fallback = await admin.from("shops").insert({ name: shopName }).select("id").single();
      if (fallback.error || !fallback.data) {
        throw new Error(first.error?.message || fallback.error?.message || "Failed to create workspace");
      }
      shop = fallback.data;
    }
  }

  if (!shop) {
    throw new Error("Failed to create workspace profile");
  }

  const { data: employee, error: empError } = await admin
    .from("employees")
    .insert({
      id: user.id,
      shop_id: shop.id,
      full_name: fullName,
      email: user.email || `${user.id}@local.invalid`,
      role: "owner",
    })
    .select("id, shop_id, full_name, email, role")
    .single();

  if (empError || !employee) {
    throw new Error(empError?.message || "Failed to create employee profile");
  }

  return employee as EmployeeRow;
}

export async function requireAdmin() {
  const result = await requireEmployee();
  if ("error" in result && result.error) return result;

  const { employee } = result as Awaited<ReturnType<typeof requireEmployee>> & {
    employee: EmployeeRow;
  };
  if (!isAdminRole(employee.role)) {
    return {
      error: NextResponse.json(
        { error: "Admin access only. Customers are hidden for regular users." },
        { status: 403 },
      ),
    };
  }
  return result;
}

export async function requireEmployee() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const employee = await ensureEmployeeForUser(user);
    return { supabase, user, employee };
  } catch (error) {
    return {
      error: NextResponse.json(
        {
          error:
            error instanceof Error ? error.message : "Employee profile not found",
        },
        { status: 403 },
      ),
    };
  }
}

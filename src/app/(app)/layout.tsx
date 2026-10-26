import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployeeForUser } from "@/lib/auth/ensure-employee";
import { isAdminRole } from "@/lib/auth/roles";
import { getWorkspaceLabels } from "@/lib/workspace/types";
import { AppShell } from "@/components/layout/app-shell";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  let employeeName: string | undefined;
  let shopName: string | undefined;
  let role: string | undefined;
  let isAdmin = false;
  let workspaceType = "general";

  try {
    const employee = await ensureEmployeeForUser(user);
    employeeName = employee.full_name;
    role = employee.role || "employee";
    isAdmin = isAdminRole(role);

    const { data: shop } = await supabase
      .from("shops")
      .select("name, workspace_type")
      .eq("id", employee.shop_id)
      .maybeSingle();
    shopName = shop?.name;
    if (shop && "workspace_type" in shop && shop.workspace_type) {
      workspaceType = String(shop.workspace_type);
    }
  } catch {
    // Profile may still be missing until migrations applied
  }

  const labels = getWorkspaceLabels(workspaceType);

  return (
    <WorkspaceProvider labels={labels}>
      <AppShell
        shopName={shopName}
        employeeName={employeeName}
        role={role}
        isAdmin={isAdmin}
        clientNoun={labels.clientNoun}
        clientNounPlural={labels.clientNounPlural}
        orgNoun={labels.orgNoun}
        helperHint={labels.helperHint}
      >
        {children}
      </AppShell>
    </WorkspaceProvider>
  );
}

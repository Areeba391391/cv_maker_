import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployeeForUser } from "@/lib/auth/ensure-employee";
import { isAdminRole } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

/** Customers directory is admin-only. Regular users are sent to CV Studio. */
export default async function CustomersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employee = await ensureEmployeeForUser(user);
  if (!isAdminRole(employee.role)) {
    redirect("/dashboard");
  }

  return children;
}

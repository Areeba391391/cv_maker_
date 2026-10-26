import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, Shield, Users, UserPlus, Inbox, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployeeForUser } from "@/lib/auth/ensure-employee";
import { isAdminRole } from "@/lib/auth/roles";
import { getWorkspaceLabels } from "@/lib/workspace/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AdminAddUserForm } from "@/components/admin/add-user-form";
import { ContactInbox } from "@/components/admin/contact-inbox";
import { ReviewsInbox } from "@/components/admin/reviews-inbox";
import { StaffRoleControls } from "@/components/admin/staff-role-controls";

export const dynamic = "force-dynamic";

type StaffRow = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  created_at: string;
};

type CustomerRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  updated_at: string;
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const employee = await ensureEmployeeForUser(user);
  if (!isAdminRole(employee.role)) {
    redirect("/dashboard");
  }

  const isOwner = employee.role === "owner";

  const { data: shop } = await supabase
    .from("shops")
    .select("workspace_type, name")
    .eq("id", employee.shop_id)
    .maybeSingle();
  const labels = getWorkspaceLabels(
    shop && "workspace_type" in shop ? String(shop.workspace_type || "general") : "general",
  );
  const shopName =
    shop && "name" in shop && typeof shop.name === "string" ? shop.name : labels.orgNoun;

  let customerCount = 0;
  let cvCount = 0;
  let staff: StaffRow[] = [];
  let recentCustomers: CustomerRow[] = [];
  const cvByUser = new Map<string, number>();

  const { count: cCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", employee.shop_id);
  customerCount = cCount ?? 0;

  const { count: vCount } = await supabase
    .from("cvs")
    .select("*", { count: "exact", head: true })
    .eq("shop_id", employee.shop_id);
  cvCount = vCount ?? 0;

  const { data: cvRows } = await supabase
    .from("cvs")
    .select("created_by")
    .eq("shop_id", employee.shop_id);
  for (const row of cvRows || []) {
    const key = row.created_by as string | null;
    if (!key) continue;
    cvByUser.set(key, (cvByUser.get(key) || 0) + 1);
  }

  const { data: staffRows } = await supabase
    .from("employees")
    .select("id, full_name, email, role, created_at")
    .eq("shop_id", employee.shop_id)
    .order("created_at", { ascending: true });
  staff = (staffRows || []) as StaffRow[];

  const { data: custRows } = await supabase
    .from("customers")
    .select("id, full_name, phone, updated_at")
    .eq("shop_id", employee.shop_id)
    .order("updated_at", { ascending: false })
    .limit(8);
  recentCustomers = (custRows || []) as CustomerRow[];

  const adminCount = staff.filter((s) => isAdminRole(s.role)).length;

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <PageHeader
        eyebrow="Admin desk"
        title={`${shopName} · admin`}
        description="Users, CV totals per person, website messages, and reviews. Only Owners and Admins see this page."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              {labels.clientNounPlural}
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{customerCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              CVs made
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{cvCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              Team
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{staff.length}</CardTitle>
            <p className="text-xs text-[var(--muted)]">{adminCount} admin(s)</p>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Star className="h-3.5 w-3.5" />
              Your role
            </CardDescription>
            <CardTitle className="text-xl">{isOwner ? "Owner" : "Admin"}</CardTitle>
            <p className="text-xs text-[var(--muted)]">
              {isOwner ? "You can promote Admins" : "Ask Owner to promote others"}
            </p>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team & CV activity</CardTitle>
          <CardDescription>
            Who signed in to this workspace, and how many CVs each person created.
            {isOwner ? " As Owner, use Make Admin on any User." : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-[var(--border)]">
            {staff.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--ink)]">
                    {s.full_name}
                    {s.id === user.id ? (
                      <span className="ml-2 text-xs font-medium text-[var(--muted)]">(you)</span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-[var(--muted)]">{s.email}</p>
                </div>
                <StaffRoleControls
                  staffId={s.id}
                  role={s.role}
                  canManage={isOwner}
                  isSelf={s.id === user.id}
                  cvCount={cvByUser.get(s.id) || 0}
                />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Website messages
            </CardTitle>
            <CardDescription>Contact form → inbox. Reply by phone or email.</CardDescription>
          </CardHeader>
          <CardContent>
            <ContactInbox />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Reviews
            </CardTitle>
            <CardDescription>Ratings from the Contact page. Approve or archive.</CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewsInbox />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle>{labels.clientNounPlural}</CardTitle>
              <CardDescription>Only admins can browse this list</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/customers">Open directory</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!recentCustomers.length ? (
              <p className="text-sm text-[var(--muted)]">
                {`No ${labels.clientNounPlural.toLowerCase()} yet. Make a CV to add one.`}
              </p>
            ) : (
              <ul className="space-y-1">
                {recentCustomers.map((c) => (
                  <li key={c.id}>
                    <Link href={`/customers/${c.id}`} className="ui-row -mx-1">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--ink)]">
                          {c.full_name || "Unnamed"}
                        </p>
                        <p className="truncate text-sm text-[var(--muted)]">{c.phone || "No phone"}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add team member
            </CardTitle>
            <CardDescription>
              {isOwner
                ? "Create a User (CVs only) or an Admin (desk + customers + inbox)."
                : `Users can make CVs. They will not see ${labels.clientNounPlural.toLowerCase()} or this desk.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminAddUserForm canCreateAdmins={isOwner} />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/cvs/new">Make a CV</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/dashboard">Open CV Studio</Link>
        </Button>
      </div>
    </div>
  );
}

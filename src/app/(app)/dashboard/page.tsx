import Link from "next/link";
import { ArrowUpRight, ChevronRight, FilePlus2, FileText, Shield, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ensureEmployeeForUser } from "@/lib/auth/ensure-employee";
import { isAdminRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateShort } from "@/lib/format-date";

type RecentCv = {
  id: string;
  target_position: string;
  updated_at: string;
  customer_name: string | null;
  customer_phone: string | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let recentCvs: RecentCv[] = [];
  let customerCount = 0;
  let isAdmin = false;

  if (user) {
    try {
      const employee = await ensureEmployeeForUser(user);
      isAdmin = isAdminRole(employee.role);

      const { data: listed } = await supabase.rpc("list_my_cvs", { p_limit: 12 });
      if (Array.isArray(listed) && listed.length) {
        recentCvs = listed.map((row: Record<string, unknown>) => ({
          id: String(row.id),
          target_position: String(row.target_position || ""),
          updated_at: String(row.updated_at || new Date().toISOString()),
          customer_name: (row.customer_name as string) || null,
          customer_phone: (row.customer_phone as string) || null,
        }));
      } else {
        const { data } = await supabase
          .from("cvs")
          .select("id, target_position, updated_at, customers(full_name, phone)")
          .eq("shop_id", employee.shop_id)
          .order("updated_at", { ascending: false })
          .limit(12);

        recentCvs = (data || []).map((cv) => {
          const customer = Array.isArray(cv.customers) ? cv.customers[0] : cv.customers;
          return {
            id: cv.id,
            target_position: cv.target_position,
            updated_at: cv.updated_at,
            customer_name:
              customer && typeof customer === "object" && "full_name" in customer
                ? String(customer.full_name || "") || null
                : null,
            customer_phone:
              customer && typeof customer === "object" && "phone" in customer
                ? String(customer.phone || "") || null
                : null,
          };
        });
      }

      const { count } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("shop_id", employee.shop_id);
      customerCount = count ?? 0;
    } catch {
      // Keep empty dashboard rather than crash
    }
  }

  return (
    <div className="space-y-7">
      <section className="hero-wash relative overflow-hidden rounded-2xl px-6 py-9 text-white sm:px-10">
        <div className="site-grid pointer-events-none absolute inset-0 opacity-[0.08]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="anim-rise max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
              CV Studio
            </p>
            <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Make CVs here.
            </h1>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-white/65">
              Name + experience → generate → print. LinkedIn import and ATS templates when you need
              them.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/cvs/new">
                <FilePlus2 className="h-4 w-4" />
                New CV
              </Link>
            </Button>
            {isAdmin ? (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 !text-white hover:bg-white/20"
              >
                <Link href="/admin">
                  <Shield className="h-4 w-4" />
                  Admin desk
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-white/10 !text-white hover:bg-white/20"
              >
                <Link href="/customers">
                  <Users className="h-4 w-4" />
                  Customers
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      {isAdmin ? (
        <Card className="border-[var(--cobalt)]/25 bg-[var(--mist)]/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-[var(--cobalt)]" />
              Admin desk
            </CardTitle>
            <CardDescription>
              Open <strong>/admin</strong> from the top nav (or tap Admin desk). There you manage
              website messages, team users, and {`customers`}. Regular users never see this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <Link href="/admin">Go to Admin desk</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="ui-lift overflow-hidden">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              Customers
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{customerCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="ui-lift">
          <CardHeader>
            <CardDescription className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" />
              Recent CVs
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{recentCvs.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="ui-lift">
          <CardHeader>
            <CardDescription>Quick start</CardDescription>
            <CardTitle className="text-base font-medium leading-snug text-stone-600">
              New CV → generate → print
            </CardTitle>
            <Link
              href="/cvs/new"
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--cobalt)] transition hover:gap-2 hover:underline"
            >
              Open form
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Open any CV to edit, export, or reprint</CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/cvs/new">New CV</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {!recentCvs.length ? (
            <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--mist)]/60 px-4 py-12 text-center">
              <p className="text-sm font-medium text-[var(--ink)]">No CVs yet</p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Create your first document to start the client history.
              </p>
              <Button asChild className="mt-5">
                <Link href="/cvs/new">Create CV</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-1">
              {recentCvs.map((cv) => (
                <li key={cv.id}>
                  <Link href={`/cvs/${cv.id}`} className="ui-row -mx-1">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        {cv.customer_name || "Unnamed client"}
                      </p>
                      <p className="truncate text-sm text-[var(--muted)]">
                        {cv.target_position}
                        {cv.customer_phone ? ` · ${cv.customer_phone}` : ""}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--muted)]">
                      {formatDateShort(cv.updated_at)}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

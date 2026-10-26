import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateShort } from "@/lib/format-date";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: employee } = await supabase
    .from("employees")
    .select("shop_id")
    .eq("id", user.id)
    .single();
  if (!employee) redirect("/login");

  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("shop_id", employee.shop_id)
    .single();
  if (!customer) notFound();

  const { data: cvs } = await supabase
    .from("cvs")
    .select("id, target_position, updated_at, status")
    .eq("customer_id", id)
    .eq("shop_id", employee.shop_id)
    .order("updated_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Customer"
        title={customer.full_name || "Customer"}
        description={[customer.phone, customer.email, customer.city].filter(Boolean).join(" · ")}
        action={
          <Button asChild>
            <Link href={`/cvs/new?customerId=${customer.id}`}>New CV</Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Document history</CardTitle>
          <CardDescription>Open a previous CV to update or reprint</CardDescription>
        </CardHeader>
        <CardContent>
          {!cvs?.length ? (
            <p className="text-sm text-stone-500">No CVs yet for this customer.</p>
          ) : (
            <ul className="space-y-1">
              {cvs.map((cv) => (
                <li key={cv.id}>
                  <Link href={`/cvs/${cv.id}`} className="ui-row -mx-1">
                    <div>
                      <p className="font-medium">{cv.target_position}</p>
                      <p className="text-sm text-stone-500">{cv.status}</p>
                    </div>
                    <span className="flex items-center gap-2 text-xs text-stone-400">
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

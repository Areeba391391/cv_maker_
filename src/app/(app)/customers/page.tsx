"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useWorkspaceLabels } from "@/components/workspace/workspace-context";

interface Customer {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  updated_at: string;
}

export default function CustomersPage() {
  const labels = useWorkspaceLabels();
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/customers?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setCustomers(data.customers || []);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Directory"
        title={labels.clientNounPlural}
        description={`Find a ${labels.clientNoun.toLowerCase()} by name, phone, or email`}
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input
          className="h-11 pl-10"
          placeholder={`Search ${labels.clientNounPlural.toLowerCase()}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
          <CardDescription>
            {loading ? "Searching…" : `${customers.length} result${customers.length === 1 ? "" : "s"}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && !customers.length ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-stone-100" />
              ))}
            </div>
          ) : !customers.length ? (
            <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/50 px-4 py-10 text-center">
              <p className="text-sm font-medium text-stone-700">No matches</p>
              <p className="mt-1 text-sm text-stone-500">
                {`Try another name or phone, or create a CV for a new ${labels.clientNoun.toLowerCase()}.`}
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {customers.map((c) => (
                <li key={c.id}>
                  <Link href={`/customers/${c.id}`} className="ui-row -mx-1">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.full_name || "Unnamed"}</p>
                      <p className="truncate text-sm text-stone-500">
                        {[c.phone, c.email, c.city].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-stone-400" />
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

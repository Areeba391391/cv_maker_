"use client";

import { useEffect, useState } from "react";
import { Star, Check, Archive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-date";

type Review = {
  id: string;
  name: string;
  workspace_name: string | null;
  rating: number;
  message: string;
  created_at: string;
  approved_at: string | null;
  archived_at: string | null;
};

export function ReviewsInbox() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews");
      const data = (await res.json()) as { reviews?: Review[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not load reviews");
      setReviews(data.reviews || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function act(id: string, action: "approve" | "archive") {
    try {
      const res = await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "Update failed");
      }
      if (action === "archive") {
        setReviews((prev) => prev.filter((r) => r.id !== id));
        toast.success("Archived");
      } else {
        setReviews((prev) =>
          prev.map((r) => (r.id === id ? { ...r, approved_at: new Date().toISOString() } : r)),
        );
        toast.success("Approved");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const pending = reviews.filter((r) => !r.approved_at).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {loading
            ? "Loading…"
            : pending
              ? `${pending} pending · ${reviews.length} total`
              : `${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => void load()}>
          Refresh
        </Button>
      </div>

      {error ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {error}
        </p>
      ) : null}

      {!loading && !reviews.length && !error ? (
        <p className="text-sm text-[var(--muted)]">
          No reviews yet. Visitors can leave a rating on the Contact page.
        </p>
      ) : null}

      <ul className="space-y-2">
        {reviews.map((r) => (
          <li
            key={r.id}
            className={`rounded-xl border px-4 py-3 ${
              r.approved_at
                ? "border-[var(--border)] bg-white"
                : "border-amber-200/80 bg-amber-50/40"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-[var(--ink)]">{r.name}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-[var(--muted)]">
                  <span className="inline-flex items-center gap-0.5 text-amber-600">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3 w-3 ${i < r.rating ? "fill-current" : "opacity-25"}`}
                      />
                    ))}
                  </span>
                  <span>· {formatDateTime(r.created_at)}</span>
                  {r.workspace_name ? <span>· {r.workspace_name}</span> : null}
                  {r.approved_at ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                      APPROVED
                    </span>
                  ) : (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                      PENDING
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-1.5">
                {!r.approved_at ? (
                  <Button type="button" size="sm" variant="outline" onClick={() => void act(r.id, "approve")}>
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="ghost" onClick={() => void act(r.id, "archive")}>
                  <Archive className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--ink)]">
              {r.message}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

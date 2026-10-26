import { Star } from "lucide-react";
import { Reveal } from "@/components/marketing/reveal";
import { ReviewForm } from "@/components/marketing/review-form";
import type { PublicReview } from "@/lib/marketing/reviews";

export function ReviewsStrip({ reviews }: { reviews: PublicReview[] }) {
  return (
    <section className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
            Reviews
          </p>
          <h2 className="font-display mt-2 max-w-xl text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            Desks that already switched.
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--muted)]">
            Approved ratings from the database — leave yours below.
          </p>
        </Reveal>

        {reviews.length ? (
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal key={r.id} delay={(Math.min(i, 3) + 1) as 1 | 2 | 3 | 4}>
                <article className="flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--mist)]/30 p-5 shadow-[var(--shadow)]">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        className={`h-4 w-4 ${s < r.rating ? "fill-current" : "opacity-25"}`}
                      />
                    ))}
                  </div>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--ink)]">{r.message}</p>
                  <div className="mt-4 border-t border-[var(--border)] pt-3">
                    <p className="font-display text-sm font-bold text-[var(--ink)]">{r.name}</p>
                    {r.workspace_name ? (
                      <p className="text-xs text-[var(--muted)]">{r.workspace_name}</p>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        ) : null}

        <div className="mx-auto mt-12 max-w-xl">
          <Reveal delay={2}>
            <ReviewForm />
          </Reveal>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { TEMPLATE_GALLERY } from "@/lib/marketing/template-gallery";

export function TemplateStage() {
  const [active, setActive] = useState(0);
  const current = TEMPLATE_GALLERY[active];

  return (
    <div className="grid items-center gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-12">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
          Live templates
        </p>
        <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          Pick any of {TEMPLATE_GALLERY.length}.
          <span className="mt-1 block text-[var(--muted)]">Preview updates instantly.</span>
        </h2>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[var(--muted)]">
          Hover or tap a style to see the print-ready page. Same templates you get inside the
          studio.
        </p>

        <div className="mt-8 grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1">
          {TEMPLATE_GALLERY.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              className={cn(
                "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition duration-200",
                i === active
                  ? "border-[var(--ink)] bg-[var(--ink)] text-white shadow-[0_14px_36px_rgba(11,20,38,0.18)]"
                  : "border-[var(--border)] bg-white/80 text-[var(--ink)] hover:border-[var(--cobalt)]/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold",
                  i === active
                    ? "bg-[var(--signal)] text-white"
                    : "bg-[var(--mist)] text-[var(--cobalt)]",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-sm font-bold">{t.name}</span>
                  {t.badge ? (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                        i === active
                          ? "bg-emerald-400/20 text-emerald-200"
                          : "bg-emerald-100 text-emerald-800",
                      )}
                    >
                      {t.badge}
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs leading-relaxed",
                    i === active ? "text-white/65" : "text-[var(--muted)]",
                  )}
                >
                  {t.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
        <div className="absolute -inset-4 rounded-[2rem] bg-[radial-gradient(ellipse_at_center,rgba(26,79,139,0.16),transparent_65%)] blur-2xl" />
        <div className="relative overflow-hidden rounded-[1.35rem] border border-[var(--border)] bg-white shadow-[0_28px_70px_rgba(11,20,38,0.14)]">
          <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-4 py-2.5">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
            </div>
            <p className="text-[11px] font-semibold tracking-wide text-stone-400">
              {current.name} · preview
            </p>
          </div>
          <div className="relative aspect-[3/4] bg-stone-100">
            {TEMPLATE_GALLERY.map((t, i) => (
              <Image
                key={t.id}
                src={t.src}
                alt={`${t.name} CV`}
                fill
                className={cn(
                  "object-cover object-top transition-all duration-500",
                  i === active ? "opacity-100 scale-100" : "opacity-0 scale-[1.03]",
                )}
                sizes="(max-width:1024px) 90vw, 42vw"
                priority={i === 0}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

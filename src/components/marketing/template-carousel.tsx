"use client";

import { useState } from "react";
import Image from "next/image";
import { TEMPLATE_GALLERY } from "@/lib/marketing/template-gallery";

const CARD_W = 260;
const GAP = 18;

export function TemplateCarousel() {
  const [paused, setPaused] = useState(false);
  // Two copies → CSS translates -50% = one seamless loop
  const loop = [...TEMPLATE_GALLERY, ...TEMPLATE_GALLERY];

  return (
    <section className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
            All templates
          </p>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            {TEMPLATE_GALLERY.length} styles. One studio.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
            Every template glides past — same ones you pick inside the studio.
          </p>
        </div>

        <div
          className="group/marquee relative mt-10 overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => {
            window.setTimeout(() => setPaused(false), 1600);
          }}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent sm:w-20" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent sm:w-20" />

          <div
            className="anim-template-marquee flex w-max will-change-transform group-hover/marquee:[animation-play-state:paused]"
            style={{ gap: GAP, animationPlayState: paused ? "paused" : "running" }}
          >
            {loop.map((t, i) => (
              <article
                key={`${t.id}-${i}`}
                className="shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow)]"
                style={{ width: CARD_W }}
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
                  <Image
                    src={t.src}
                    alt={`${t.name} CV`}
                    fill
                    className="object-cover object-top"
                    sizes="260px"
                    draggable={false}
                  />
                  {t.badge ? (
                    <span className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {t.badge}
                    </span>
                  ) : null}
                </div>
                <div className="border-t border-[var(--border)] px-4 py-3">
                  <p className="font-display text-sm font-bold text-[var(--ink)]">{t.name}</p>
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--muted)]">
                    {t.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { FilePlus2, Keyboard, Printer, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "1",
    title: "Open New CV",
    urdu: "Naya CV kholo",
    detail: "Tap the orange New CV button. No menus to hunt.",
    icon: FilePlus2,
  },
  {
    n: "2",
    title: "Write the job name",
    urdu: "Job ka naam likho",
    detail: "Example: Salesman, Driver, Cashier. This is the only required field.",
    icon: Keyboard,
  },
  {
    n: "3",
    title: "Add what you know",
    urdu: "Jo pata ho, woh bharein",
    detail:
      "Name, phone, city — or Import from LinkedIn (paste / Save-to-PDF). Empty boxes stay empty.",
    icon: UserRound,
  },
  {
    n: "4",
    title: "Generate & print",
    urdu: "CV banao aur print karo",
    detail: "Review once, pick ATS template for portals if needed, download PDF or DOCX.",
    icon: Printer,
  },
];

export function HowToAnimated({ compact = false }: { compact?: boolean }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((v) => (v + 1) % STEPS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={cn("w-full", compact ? "" : "py-2")}>
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
          Picture guide
        </p>
        <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          Four big steps. That&apos;s it.
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
          Designed so anyone at the desk can make a CV — even with little English reading.
        </p>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
        <ol className="space-y-2">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const on = i === active;
            return (
              <li key={step.n}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex w-full items-start gap-4 rounded-xl px-3 py-3.5 text-left transition",
                    on
                      ? "bg-white shadow-[var(--shadow)] ring-1 ring-[var(--border)]"
                      : "hover:bg-white/70",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold",
                      on
                        ? "bg-[var(--ink)] text-white"
                        : "bg-[var(--mist)] text-[var(--cobalt)]",
                    )}
                  >
                    {step.n}
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-[var(--muted)]" />
                      <span className="font-display text-base font-bold text-[var(--ink)]">
                        {step.title}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-[var(--cobalt)]">
                      {step.urdu}
                    </span>
                    <span className="mt-1.5 block text-sm leading-relaxed text-[var(--muted)]">
                      {step.detail}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--ink)] p-7 text-white sm:p-8">
          <div className="site-grid pointer-events-none absolute inset-0 opacity-[0.07]" />
          <div className="relative">
            <div className="mb-8 flex items-center justify-between text-xs font-semibold tracking-wide text-white/45">
              <span>LIVE PREVIEW</span>
              <span>
                {active + 1} / {STEPS.length}
              </span>
            </div>

            <div key={active} className="anim-draw">
              <p className="font-display text-5xl font-extrabold tabular-nums text-[var(--signal)]">
                {STEPS[active].n}
              </p>
              <h3 className="font-display mt-4 text-2xl font-bold">{STEPS[active].title}</h3>
              <p className="mt-1 text-sm font-medium text-white/55">{STEPS[active].urdu}</p>
              <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/70">
                {STEPS[active].detail}
              </p>
            </div>

            <div className="mt-10 flex gap-2">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to step ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-1 rounded-full transition-all",
                    i === active ? "w-8 bg-[var(--signal)]" : "w-4 bg-white/20",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STAGES = [
  { label: "Reading customer details", ms: 900 },
  { label: "Writing professional English", ms: 1100 },
  { label: "Fitting A4 layout", ms: 900 },
  { label: "CV ready to print", ms: 1200 },
];

export function GenerateDemo() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function run() {
      while (!cancelled) {
        setDone(false);
        for (let i = 0; i < STAGES.length; i++) {
          if (cancelled) return;
          setStep(i);
          await new Promise((r) => {
            timer = setTimeout(r, STAGES[i].ms);
          });
        }
        if (cancelled) return;
        setDone(true);
        await new Promise((r) => {
          timer = setTimeout(r, 1800);
        });
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#0f1a2e] text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-[var(--signal)]" />
          Generate demo
        </div>
        <span className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white/55">
          ~10s path
        </span>
      </div>

      <div className="grid gap-0 lg:grid-cols-2">
        <div className="space-y-3 border-b border-white/10 p-5 lg:border-b-0 lg:border-r">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            Typed seed
          </p>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
            <p className="text-[10px] font-semibold text-white/40">Target job</p>
            <p className="mt-1 text-sm font-semibold">Sales Associate</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
            <p className="text-[10px] font-semibold text-white/40">Name · City</p>
            <p className="mt-1 text-sm font-semibold">Ayesha Khan · Lahore</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 px-3.5 py-3">
            <p className="text-[10px] font-semibold text-white/40">Experience</p>
            <p className="mt-1 text-sm leading-relaxed text-white/80">
              City Mart · Cash handling · Customer care
            </p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/40">
            Pipeline
          </p>
          <ol className="mt-4 space-y-3">
            {STAGES.map((s, i) => {
              const active = !done && i === step;
              const complete = done || i < step;
              return (
                <li
                  key={s.label}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition",
                    active
                      ? "border-[var(--signal)]/40 bg-[var(--signal)]/10"
                      : complete
                        ? "border-emerald-400/25 bg-emerald-400/10"
                        : "border-white/8 bg-white/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg",
                      complete
                        ? "bg-emerald-500 text-white"
                        : active
                          ? "bg-[var(--signal)] text-white"
                          : "bg-white/10 text-white/40",
                    )}
                  >
                    {complete ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="text-[10px] font-bold">{i + 1}</span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      active || complete ? "text-white" : "text-white/45",
                    )}
                  >
                    {s.label}
                  </span>
                </li>
              );
            })}
          </ol>

          <div
            className={cn(
              "mt-5 flex items-center gap-3 rounded-xl border px-3.5 py-3 transition",
              done
                ? "border-emerald-400/30 bg-emerald-400/10"
                : "border-white/10 bg-white/5",
            )}
          >
            <FileText className={cn("h-5 w-5", done ? "text-emerald-300" : "text-white/40")} />
            <div>
              <p className="text-sm font-semibold">
                {done ? "ayesha_khan_cv.pdf" : "Building document…"}
              </p>
              <p className="text-xs text-white/50">
                {done ? "Open in studio · Print · DOCX" : "Honest English · empty fields stay empty"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

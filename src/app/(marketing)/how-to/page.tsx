import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { HowToAnimated } from "@/components/marketing/how-to-animated";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "How to use",
  description: "Animated guide — make a professional CV in four clear steps.",
};

const tips = [
  {
    title: "Only fill what is true",
    text: "Blank boxes are OK. Empty education stays off the CV.",
  },
  {
    title: "Job title first",
    text: "Salesman, Driver, Cashier — this shapes the wording.",
  },
  {
    title: "Import from LinkedIn",
    text: "Paste About/Experience or upload Save-to-PDF on New CV — then review and Generate.",
  },
  {
    title: "Use ATS template for portals",
    text: "Pick the ATS template when applying through online job systems.",
  },
  {
    title: "Review before print",
    text: "One quick check for name and phone, then PDF / DOCX.",
  },
  {
    title: "Save customers",
    text: "Next time the same person returns, reopen their history.",
  },
];

export default function HowToPage() {
  return (
    <div className="page-fade">
      <section className="relative overflow-hidden border-b border-[var(--border)]">
        <div className="absolute inset-0">
          <Image
            src="/marketing/cv-sample-modern.jpg"
            alt=""
            fill
            priority
            className="object-cover object-top"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/94 to-white/70" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
            How to use
          </p>
          <h1 className="font-display mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl">
            Four steps. Clear icons. Ready to print.
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--muted)]">
            Built for operators who prefer pictures over long manuals — English with Roman Urdu
            cues.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <HowToAnimated />
      </section>

      <section className="border-t border-[var(--border)] bg-[var(--mist)]/40">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="font-display text-2xl font-bold text-[var(--ink)] sm:text-3xl">
            Quick desk tips
          </h2>
          <dl className="mt-8 grid gap-x-12 gap-y-8 sm:grid-cols-2">
            {tips.map((t, i) => (
              <div key={t.title} className="border-l-2 border-[var(--border)] pl-4">
                <dt className="font-display flex items-baseline gap-2 text-base font-bold text-[var(--ink)]">
                  <span className="text-sm tabular-nums text-[var(--signal)]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {t.title}
                </dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{t.text}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-12">
            <Button asChild size="xl">
              <Link href="/signup">Create free account</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

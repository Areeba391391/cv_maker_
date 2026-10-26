import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FeatureMarquee } from "@/components/marketing/feature-marquee";
import { TemplateCarousel } from "@/components/marketing/template-carousel";
import { Reveal } from "@/components/marketing/reveal";

export const metadata: Metadata = {
  title: "About",
  description: "AI CV Maker — professional CV templates for any workplace.",
};

const values = [
  {
    title: "Honest content",
    text: "We polish language. We never invent schools, employers, or years of experience that were not provided.",
  },
  {
    title: "LinkedIn + ATS",
    text: "Import from LinkedIn paste or Save-to-PDF, then use our ATS-safe single-column template for job portals.",
  },
  {
    title: "Desk clarity",
    text: "Large controls, numbered steps, and short cues so operators of every literacy level succeed.",
  },
];

export default function AboutPage() {
  return (
    <div className="page-fade">
      <section className="border-b border-[var(--border)] bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr]">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">About</p>
            <h1 className="font-display mt-3 max-w-2xl text-4xl font-extrabold tracking-tight text-[var(--ink)] sm:text-5xl">
              Built so other sites want the same features.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
              Fast generate, LinkedIn import, ATS templates, and print-ready English — for shops,
              coaches, schools, and freelancers under real desk pressure.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] shadow-[0_24px_60px_rgba(11,20,38,0.12)]">
              <Image
                src="/marketing/cv-templates-fan.jpg"
                alt="CV template samples"
                fill
                priority
                className="object-cover"
                sizes="(max-width:1024px) 100vw, 45vw"
              />
            </div>
          </Reveal>
        </div>
      </section>

      <FeatureMarquee />
      <TemplateCarousel />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3 md:gap-8">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={(i + 1) as 1 | 2 | 3}>
              <article className="border-t-2 border-[var(--ink)] pt-5">
                <h2 className="font-display text-xl font-bold text-[var(--ink)]">{v.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{v.text}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal>
          <div className="relative mt-16 overflow-hidden rounded-[1.75rem]">
            <div className="absolute inset-0">
              <Image
                src="/marketing/cv-sample-ats.jpg"
                alt=""
                fill
                className="object-cover object-top"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-[var(--ink)]/90" />
            </div>
            <div className="relative px-6 py-10 text-white sm:px-10 sm:py-12">
              <h2 className="font-display text-2xl font-bold sm:text-3xl">What we believe</h2>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/70">
                A good CV should open doors — not invent a biography. Teams deserve software that is
                fast under pressure. Applicants deserve documents they can proudly submit.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <Link href="/signup">Start a workspace</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-transparent !text-white hover:bg-white/10"
                >
                  <Link href="/contact">Talk to us</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}

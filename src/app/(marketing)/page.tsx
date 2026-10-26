import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CheckCircle2, FileCheck2, Link2, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HowToAnimated } from "@/components/marketing/how-to-animated";
import { FeatureMarquee } from "@/components/marketing/feature-marquee";
import { TemplateStage } from "@/components/marketing/template-stage";
import { GenerateDemo } from "@/components/marketing/generate-demo";
import { ReviewsStrip } from "@/components/marketing/reviews-strip";
import { Reveal } from "@/components/marketing/reveal";
import { getApprovedReviews } from "@/lib/marketing/reviews";

const pillars = [
  {
    icon: Zap,
    title: "Desk-speed generate",
    text: "Typed name and experience become a print-ready CV in seconds — attachments stay optional.",
  },
  {
    icon: Link2,
    title: "LinkedIn import",
    text: "Paste profile text or upload Save-to-PDF. We fill the form; you review and generate.",
  },
  {
    icon: FileCheck2,
    title: "ATS-safe templates",
    text: "Single-column layout with standard headings so job portals can read the document.",
  },
  {
    icon: ShieldCheck,
    title: "No invented facts",
    text: "We polish language. Empty fields stay empty — never fake schools or employers.",
  },
];

const audiences = [
  {
    title: "Shops & typing centers",
    text: "Walk-ins in minutes with large, clear controls.",
    image: "/marketing/cv-sample-professional.jpg",
  },
  {
    title: "Coaches & freelancers",
    text: "Client CVs without long forms or messy Word files.",
    image: "/marketing/cv-sample-modern.jpg",
  },
  {
    title: "Schools & HR desks",
    text: "Honest documents students and candidates can submit.",
    image: "/marketing/cv-sample-ats.jpg",
  },
];

export default async function HomePage() {
  const reviews = await getApprovedReviews(6);

  return (
    <>
      {/* Hero — brand first, one visual plane */}
      <section className="relative min-h-[min(94vh,900px)] overflow-hidden text-white">
        <Image
          src="/marketing/cv-templates-fan.jpg"
          alt="AI CV Maker template samples"
          fill
          priority
          className="anim-ken object-cover object-center"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--ink)] via-[var(--ink)]/92 to-[var(--ink)]/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/80 via-transparent to-[var(--ink)]/45" />
        <div className="site-grid pointer-events-none absolute inset-0 opacity-[0.06]" />

        <div className="relative mx-auto flex min-h-[min(94vh,900px)] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 lg:justify-center lg:pb-28 lg:pt-24">
          <div className="anim-rise max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--signal)]">
              The CV product others copy
            </p>
            <p className="font-display mt-4 text-[2.75rem] font-extrabold leading-[1.02] tracking-tight sm:text-5xl lg:text-[3.6rem]">
              AI CV Maker
            </p>
            <h1 className="mt-5 text-lg font-semibold leading-snug text-white/90 sm:text-xl">
              CVs so clean that visitors want the same features on their own site.
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/65">
              LinkedIn import. ATS templates. Instant generate. Print-ready English — built for
              desks that cannot waste a minute.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="xl">
                <Link href="/signup">
                  Start free workspace
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                size="xl"
                variant="outline"
                className="border-white/25 bg-white/8 !text-white hover:bg-white/14"
              >
                <Link href="/how-to">Watch the flow</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <FeatureMarquee />

      {/* Interactive templates — wow moment */}
      <section className="border-b border-[var(--border)] bg-[var(--mist)]/30">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal>
            <TemplateStage />
          </Reveal>
        </div>
      </section>

      {/* Generate demo */}
      <section className="border-b border-[var(--border)] bg-[var(--ink)]">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:py-24">
          <Reveal>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
              The generate moment
            </p>
            <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Typed seed in.
              <span className="mt-1 block text-white/50">Print-ready CV out.</span>
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-white/60">
              This is the path shops feel: fill what is true, tap Generate, hand over PDF or DOCX.
              Attachments stay optional — speed stays sacred.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Instant path when details are typed",
                "LinkedIn paste / Save-to-PDF fills the form",
                "ATS template preferred for job portals",
              ].map((line) => (
                <li key={line} className="flex gap-3 text-sm text-white/75">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal)]" />
                  {line}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={2}>
            <GenerateDemo />
          </Reveal>
        </div>
      </section>

      {/* Print quality split */}
      <section className="border-b border-[var(--border)] bg-[var(--mist)]/40">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:py-24">
          <Reveal>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.35rem] border border-[var(--border)] shadow-[0_28px_70px_rgba(11,20,38,0.14)] sm:aspect-[4/3] lg:aspect-[4/5]">
              <Image
                src="/marketing/cv-sample-professional.jpg"
                alt="Professional template CV close-up"
                fill
                className="object-cover object-top"
                sizes="(max-width:1024px) 100vw, 50vw"
              />
            </div>
          </Reveal>
          <Reveal delay={2}>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
              Print quality
            </p>
            <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
              Looks senior on paper — not just in a browser tab.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-[var(--muted)]">
              Clear hierarchy, honest wording, and A4 margins that survive real printers. Pick
              Professional for offices, Modern for bold roles, or ATS when portals parse the file.
            </p>
            <div className="mt-8">
              <Button asChild size="lg">
                <Link href="/signup">
                  Make your first CV
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
            Why teams switch
          </p>
          <h2 className="font-display mt-2 max-w-2xl text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
            Features people screenshot and rebuild on their sites.
          </h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {pillars.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.title} delay={(Math.min(i, 3) + 1) as 1 | 2 | 3 | 4}>
                <article className="group h-full rounded-2xl border border-[var(--border)] bg-white p-6 shadow-[var(--shadow)] transition duration-300 hover:-translate-y-1 hover:border-[var(--cobalt)]/30 hover:shadow-[0_20px_50px_rgba(11,20,38,0.1)]">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--mist)] text-[var(--cobalt)] transition duration-300 group-hover:bg-[var(--ink)] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="font-display mt-4 text-lg font-bold text-[var(--ink)]">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{p.text}</p>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <Reveal>
            <HowToAnimated compact />
          </Reveal>
          <Reveal delay={2}>
            <div className="mt-10">
              <Button asChild size="lg" variant="secondary">
                <Link href="/how-to">
                  Full picture guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
            Who it&apos;s for
          </p>
          <h2 className="font-display mt-2 max-w-xl text-3xl font-bold tracking-tight text-[var(--ink)]">
            One product. Three desks that move fast.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {audiences.map((a, i) => (
            <Reveal key={a.title} delay={(i + 1) as 1 | 2 | 3}>
              <article className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-white shadow-[var(--shadow)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(11,20,38,0.12)]">
                <div className="relative h-48 w-full overflow-hidden">
                  <Image
                    src={a.image}
                    alt={a.title}
                    fill
                    className="object-cover object-top transition duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width:768px) 100vw, 33vw"
                  />
                </div>
                <div className="p-5">
                  <p className="font-display text-sm font-extrabold tabular-nums text-[var(--signal)]">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <h3 className="font-display mt-1 text-lg font-bold text-[var(--ink)]">{a.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{a.text}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <ReviewsStrip reviews={reviews} />

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[1.75rem]">
            <div className="absolute inset-0">
              <Image
                src="/marketing/hero-cv-slate.jpg"
                alt=""
                fill
                className="object-cover"
                sizes="100vw"
              />
              <div className="absolute inset-0 bg-[var(--ink)]/90" />
            </div>
            <div className="site-grid pointer-events-none absolute inset-0 opacity-[0.07]" />
            <div className="relative flex flex-col gap-8 px-6 py-12 text-white sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-xl">
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Build the desk everyone wants to copy.
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-white/65">
                  Free workspace. Real CV templates. LinkedIn + ATS. Ready before the next walk-in.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="xl">
                  <Link href="/signup">Create workspace</Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="outline"
                  className="border-white/25 bg-transparent !text-white hover:bg-white/10"
                >
                  <Link href="/contact">Ask a question</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}

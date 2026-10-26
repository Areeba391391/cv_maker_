import Image from "next/image";
import { Reveal } from "@/components/marketing/reveal";

const SAMPLES = [
  {
    src: "/marketing/cv-sample-ats.jpg",
    name: "ATS",
    blurb: "Portal-safe · single column",
    badge: "ATS-safe",
  },
  {
    src: "/marketing/cv-sample-professional.jpg",
    name: "Professional",
    blurb: "Clean corporate — offices & shops",
  },
  {
    src: "/marketing/cv-sample-modern.jpg",
    name: "Modern",
    blurb: "Bold header — creative roles",
  },
] as const;

export function CvShowcase() {
  return (
    <section className="border-b border-[var(--border)] bg-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <Reveal>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--signal)]">
                Our CVs
              </p>
              <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
                This is what you print.
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">
                Real template styles from AI CV Maker — professional English, clear sections, ready
                for PDF or DOCX.
              </p>
            </div>
            <p className="text-sm font-medium text-[var(--cobalt)]">7 templates · A4 · print-ready</p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {SAMPLES.map((s, i) => (
            <Reveal key={s.name} delay={(i + 1) as 1 | 2 | 3}>
              <figure className="group overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--mist)]/50 shadow-[var(--shadow)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(11,20,38,0.12)]">
                <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
                  <Image
                    src={s.src}
                    alt={`${s.name} CV sample`}
                    fill
                    className="object-cover object-top transition duration-500 group-hover:scale-[1.04]"
                    sizes="(max-width:640px) 100vw, 33vw"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
                  {"badge" in s && s.badge ? (
                    <span className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                      {s.badge}
                    </span>
                  ) : null}
                </div>
                <figcaption className="border-t border-[var(--border)] bg-white px-4 py-3.5">
                  <p className="font-display text-base font-bold text-[var(--ink)]">{s.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{s.blurb}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

const ITEMS = [
  "LinkedIn import",
  "ATS-safe templates",
  "7 CV templates",
  "A4 · Letter · Legal",
  "10-second generate",
  "PDF & DOCX export",
  "Honest English only",
  "Admin desk",
  "Voice & photo optional",
  "No invented facts",
];

export function FeatureMarquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-[var(--ink)] py-3.5">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[var(--ink)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[var(--ink)] to-transparent" />
      <div className="anim-marquee flex w-max gap-0">
        {row.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-3 px-5 text-sm font-semibold tracking-wide text-white/70"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal)]" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

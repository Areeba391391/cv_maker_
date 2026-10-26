import Link from "next/link";

const siteLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/how-to", label: "How to use" },
  { href: "/contact", label: "Contact" },
];

export function AuthShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <aside className="hero-wash relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <div className="site-grid pointer-events-none absolute inset-0 opacity-[0.12]" />
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--signal)] text-sm font-extrabold tracking-[0.12em] text-white">
              CV
            </span>
            <span>
              <span className="font-display block text-xl font-bold tracking-tight">AI CV Maker</span>
              <span className="text-xs tracking-wide text-white/65">Professional CV platform</span>
            </span>
          </Link>
          <nav className="mt-8 flex flex-wrap gap-2">
            {siteLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/85 hover:bg-white/12"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="relative z-10 max-w-lg">
          <p className="font-display text-[2.75rem] font-extrabold leading-[1.12] tracking-tight xl:text-5xl">
            Print-ready CVs.
            <br />
            For every workplace.
          </p>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70">
            Shops, coaches, schools, HR desks, freelancers — one fast studio. Admins manage clients;
            users make CVs.
          </p>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            {[
              { k: "01", t: "A4 templates" },
              { k: "02", t: "PDF & DOCX" },
              { k: "03", t: "Any industry" },
            ].map((item) => (
              <div
                key={item.k}
                className="rounded-2xl border border-white/20 bg-white/[0.08] px-4 py-3 backdrop-blur-sm"
              >
                <p className="text-[11px] font-bold tracking-[0.14em] text-[var(--signal)]">{item.k}</p>
                <p className="mt-1 text-sm font-semibold text-white">{item.t}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs tracking-wide text-white/40">
          Built for professional CV delivery
        </p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-10 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.45]"
          style={{
            background:
              "radial-gradient(600px 280px at 80% 0%, rgba(26,79,139,0.08), transparent 60%)",
          }}
        />
        <div className="relative w-full max-w-[420px]">
          <Link href="/" className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--signal)] text-xs font-extrabold tracking-wide text-white">
              CV
            </span>
            <span className="font-display text-xl font-bold text-[var(--ink)]">AI CV Maker</span>
          </Link>

          <nav className="mb-6 flex flex-wrap gap-2 lg:hidden">
            {siteLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)]"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="mb-7">
            <h1 className="font-display text-[1.75rem] font-bold tracking-tight text-[var(--ink)]">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}

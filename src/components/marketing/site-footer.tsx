import Link from "next/link";

const cols = [
  {
    title: "Product",
    links: [
      { href: "/", label: "Home" },
      { href: "/how-to", label: "How to use" },
      { href: "/signup", label: "Create workspace" },
      { href: "/login", label: "Sign in" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "For teams",
    links: [
      { href: "/login?next=/dashboard", label: "Open studio" },
      { href: "/login?next=/cvs/new", label: "New CV" },
      { href: "/how-to", label: "Picture guide" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/10 bg-[var(--ink)] text-white">
      <div className="pointer-events-none absolute -right-20 top-0 h-56 w-56 rounded-full bg-[var(--signal)]/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full bg-[var(--cobalt)]/25 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.45fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--signal)] text-xs font-extrabold tracking-[0.12em] shadow-[0_8px_24px_rgba(255,92,53,0.35)]">
              CV
            </span>
            <span className="font-display text-lg font-bold">AI CV Maker</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/55">
            The CV desk people want to rebuild: LinkedIn import, ATS templates, instant generate,
            print-ready English.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/35">{col.title}</p>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-medium text-white/70 transition hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="relative border-t border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} AI CV Maker</p>
          <p>LinkedIn · ATS · Print</p>
        </div>
      </div>
    </footer>
  );
}

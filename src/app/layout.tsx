import type { Metadata } from "next";
import { Outfit, Figtree } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AI CV Maker — Fast professional CVs for every shop",
    template: "%s · AI CV Maker",
  },
  description:
    "Professional CVs with LinkedIn import and ATS-safe templates — for shops, coaches, schools, and freelancers. Honest English, ready to print.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full`}>
      <body
        className="min-h-full antialiased"
        style={{ fontFamily: "var(--font-body), sans-serif" }}
        suppressHydrationWarning
      >
        {children}
        <Toaster
          richColors
          position="top-right"
          closeButton
          duration={2600}
          toastOptions={{
            className: "rounded-xl border border-[var(--border)] shadow-lg",
          }}
        />
      </body>
    </html>
  );
}

import Link from "next/link";
import { Wordmark } from "@/components/ui/wordmark";

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms & Conditions" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refund-policy", label: "Refund Policy" },
  { href: "/faq", label: "FAQs" },
];

export function LegalLayout({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[var(--ink-100)] bg-white sticky top-0 z-10">
        <div className="max-w-[760px] mx-auto px-6 flex items-center justify-between h-16">
          <Wordmark small />
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--ink-600)] hover:text-[var(--ink-900)] no-underline transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-[760px] mx-auto px-6 py-12 pb-20">
        <h1 className="bh-display text-[32px] md:text-[40px] tracking-[-0.03em] mb-2">{title}</h1>
        <p className="text-sm text-[var(--ink-400)] mb-10">
          Last updated: June 2026 · Prince K Ventures
        </p>
        <div className="prose-legal">{children}</div>
      </main>

      <footer className="border-t border-[var(--ink-100)] bg-[var(--ink-50)]">
        <div className="max-w-[760px] mx-auto px-6 py-8 flex flex-wrap gap-x-6 gap-y-2 items-center justify-between">
          <span className="text-sm text-[var(--ink-400)]">© {new Date().getFullYear()} Prince K Ventures. All rights reserved.</span>
          <nav className="flex flex-wrap gap-x-5 gap-y-1">
            {LEGAL_LINKS.map(l => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-[var(--ink-500)] hover:text-[var(--ink-800)] no-underline transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

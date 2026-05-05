import { useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Platform", href: "/platform" },
  { label: "Evidence Ladder", href: "/evidence-ladder" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Resources", href: "/resources" },
];

const ASSURANCE_FOOTER_NOTE =
  "Synerxus provides structured evidence records for reporting and assurance preparation. Synerxus does not provide formal assurance opinions, guarantee regulatory compliance, or establish causal attribution.";

const footerLinks = [
  ["Platform", "/platform"],
  ["Use Cases", "/use-cases"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();
  const isLanding = location === "/landing" || location === "/";

  const handleLandingSectionClick = (
    event: MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    const [, sectionId] = href.split("#");
    if (!sectionId) return;

    setMobileOpen(false);

    if (!isLanding) return;

    event.preventDefault();
    const target = document.getElementById(sectionId);
    if (!target) return;

    window.history.replaceState(null, "", href);
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link
            href="/landing"
            className="shrink-0"
            onClick={(e) => {
              if (isLanding) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
          >
            <Logo size="sm" />
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const active = location === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(event) => handleLandingSectionClick(event, item.href)}
                  className={`rounded-md px-2.5 py-2 text-xs font-semibold transition-colors ${
                    active
                      ? "bg-slate-100 text-[#0A1F44]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-[#0A1F44]"
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/login" className="rounded-md px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:text-[#0A1F44]">
              Sign In
            </Link>
            <Button asChild className="bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
              <Link href="/request-assessment">Request Assessment</Link>
            </Button>
          </div>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 text-slate-700 lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden">
            <div className="grid gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/login" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Sign In
              </Link>
              <Button asChild className="mt-1 bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
                <Link href="/request-assessment">Request Assessment</Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#D4980C]/20 bg-gradient-to-r from-[#fffdf7] via-[#fffaf0] to-[#f7d27a]/55">
        <div className="mx-auto max-w-7xl px-4 py-5 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-md">
              <Logo size="sm" clickable={false} />
              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                Structured evidence records for ESG reporting and assurance preparation.
              </p>
            </div>
            <div className="flex flex-col gap-3 md:items-end">
              <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-4 gap-y-2">
                {footerLinks.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-xs font-semibold text-slate-700 transition-colors hover:text-[#0A1F44]"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <a
                href="mailto:hello@synerxus.com"
                className="text-xs font-semibold text-slate-700 transition-colors hover:text-[#0A1F44]"
              >
                hello@synerxus.com
              </a>
            </div>
          </div>

          <div className="mt-4 border-t border-[#D4980C]/20 pt-3">
            <p className="text-xs text-slate-600">
              © 2026 Synerxus. All rights reserved.
            </p>
            <p className="mt-2 max-w-5xl text-[11px] leading-relaxed text-slate-600">
              {ASSURANCE_FOOTER_NOTE}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

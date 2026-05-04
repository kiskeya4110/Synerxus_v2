import { useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { ASSURANCE_BOUNDARY } from "./marketing-data";

const navItems = [
  { label: "Platform", href: "/platform" },
  { label: "Evidence Ladder", href: "/evidence-ladder" },
  { label: "Use Cases", href: "/use-cases" },
  { label: "Resources", href: "/resources" },
];

const footerGroups = [
  {
    title: "Explore",
    links: [
      ["Platform", "/platform"],
      ["Evidence Ladder", "/evidence-ladder"],
      ["Use Cases", "/use-cases"],
      ["Resources", "/resources"],
    ],
  },
  {
    title: "Get Started / Legal",
    links: [
      ["Request Assessment", "/request-assessment"],
      ["View Sample Evidence Object", "/platform"],
      ["Contact", "/request-assessment"],
      ["Privacy Policy", "/privacy"],
      ["Terms of Use", "/terms"],
    ],
  },
];

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

      <footer className="border-t border-slate-800 bg-slate-950 text-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="grid gap-5 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <Logo size="sm" clickable={false} />
              <p className="mt-2 text-xs font-bold text-[#FFD95A]">
                Impacts. Verified.
              </p>
              <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-300">
                ESG claims are only as strong as the evidence behind them.
              </p>
            </div>
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FFD95A]">
                  {group.title}
                </h3>
                <ul className="mt-2 space-y-1">
                  {group.links.map(([label, href]) => (
                    <li key={`${group.title}-${label}`}>
                      <Link
                        href={href}
                        className="text-xs text-slate-300 transition-colors hover:text-white"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-3 md:flex-row md:items-start md:justify-between">
            <p className="max-w-4xl text-xs leading-relaxed text-slate-400">
              {ASSURANCE_BOUNDARY}
            </p>
            <p className="shrink-0 text-xs text-slate-500">
              © 2026 Synerxus. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronDown, Facebook, Linkedin, LayoutDashboard, Menu, X } from "lucide-react";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const navItems = [
  { label: "Platform", href: "/platform" },
  { label: "Integrations", href: "/integrations" },
  { label: "Evidence Ladder", href: "/evidence-ladder" },
  { label: "Resources", href: "/resources" },
];

const solutionItems = [
  { label: "Solutions Overview", href: "/solutions" },
  { label: "For ESG Teams", href: "/for-esg-teams" },
  { label: "For NGOs and Partners", href: "/use-cases" },
];

const ASSURANCE_FOOTER_NOTE =
  "Synerxus supports evidence organization, reporting preparation, and assurance preparation. Synerxus does not provide formal assurance, legal advice, compliance guarantees, SDG impact certification, or causal attribution.";

const footerLinks = [
  ["Platform", "/platform"],
  ["Integrations", "/integrations"],
  ["Evidence Ladder", "/evidence-ladder"],
  ["Solutions", "/solutions"],
  ["For ESG Teams", "/for-esg-teams"],
  ["Use Cases", "/use-cases"],
  ["Resources", "/resources"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

const socialLinks = [
  {
    label: "Synerxus on LinkedIn",
    href: "https://linkedin.com/company/synerxus",
    icon: Linkedin,
  },
  {
    label: "Synerxus on Facebook",
    href: "https://www.facebook.com/people/Synerxus/61582543747103/",
    icon: Facebook,
  },
] as const;

export function MarketingLayout({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [location, navigate] = useLocation();
  const isLanding = location === "/landing" || location === "/";
  const { dbUser } = useAuth();
  const dashboardHref = dbUser ? "/dashboard" : "/login";

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
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-8 md:py-4">
          <Logo size="sm" className="shrink-0" />

          <nav className="hidden items-center gap-7 lg:flex">
            {navItems.map((item) => {
              const active = location === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(event) => handleLandingSectionClick(event, item.href)}
                  className={`border-b-2 px-0 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "border-[#c88914] text-[#0A1F44]"
                      : "border-transparent text-[#0A1F44] hover:border-[#c88914]/60"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div
              className="group relative"
              onMouseEnter={() => setSolutionsOpen(true)}
              onMouseLeave={() => setSolutionsOpen(false)}
            >
              <button
                type="button"
                aria-expanded={solutionsOpen}
                aria-haspopup="menu"
                onClick={() => setSolutionsOpen((open) => !open)}
                className={`flex items-center gap-1 border-b-2 px-0 py-2 text-sm font-semibold transition-colors ${
                  location === "/solutions" || location === "/for-esg-teams" || location.startsWith("/use-cases")
                    ? "border-[#c88914] text-[#0A1F44]"
                    : "border-transparent text-[#0A1F44] hover:border-[#c88914]/60"
                }`}
              >
                Solutions <ChevronDown className={`h-4 w-4 transition-transform duration-150 ${solutionsOpen ? "rotate-180" : ""}`} />
              </button>
              <div
                role="menu"
                className={`absolute left-0 top-full z-50 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-xl transition-all ${
                  solutionsOpen
                    ? "visible translate-y-0 opacity-100"
                    : "invisible translate-y-2 opacity-0 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100"
                }`}
              >
                {solutionItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSolutionsOpen(false)}
                    className={`block rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                      location === item.href
                        ? "bg-slate-100 text-[#0A1F44]"
                        : "text-slate-700 hover:bg-slate-50 hover:text-[#0A1F44]"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild className="bg-[#0A1F44] text-white hover:bg-[#102b5a]">
              <Link href={dashboardHref}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {dbUser ? "Go to Dashboard" : "Access Dashboard"}
              </Link>
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
              <div className="px-3 pt-3 text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
                Solutions
              </div>
              {solutionItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
              <Button asChild className="mt-1 bg-[#0A1F44] text-[#ffcc33] hover:bg-[#102b5a]">
                <Link href={dashboardHref} onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {dbUser ? "Go to Dashboard" : "Access Dashboard"}
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#0A1F44]/15 bg-[#061A36] text-white">
        <div className="mx-auto max-w-7xl px-4 py-3 md:hidden">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-[11px] font-semibold text-white/75">
              © 2026 Synerxus
            </p>
            <div className="flex items-center gap-3">
              <Link href="/privacy" className="text-[11px] font-semibold text-white/75 hover:text-white">
                Privacy
              </Link>
              <Link href="/terms" className="text-[11px] font-semibold text-white/75 hover:text-white">
                Terms
              </Link>
              <a href="mailto:hello@synerxus.com" className="text-[11px] font-semibold text-white/75 hover:text-white">
                Contact
              </a>
            </div>
          </div>
        </div>

        <div className="mx-auto hidden max-w-7xl px-4 py-3 md:block md:px-8 md:py-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
            <div className="max-w-md">
              <Logo size="sm" clickable={false} theme="dark" />
              <p className="mt-2 text-xs leading-snug text-white/60">
                Structured evidence records for ESG reporting and assurance preparation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-3 gap-y-1.5">
                {footerLinks.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-[11px] font-semibold text-white/75 transition-colors hover:text-white"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <a
                href="mailto:hello@synerxus.com"
                className="text-[11px] font-semibold text-white/75 transition-colors hover:text-white"
              >
                hello@synerxus.com
              </a>
              <div className="flex items-center gap-2" aria-label="Synerxus social pages">
                {socialLinks.map(({ label, href, icon: Icon }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    title={label}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-white/30 bg-white/15 text-white transition-colors hover:bg-white/25"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-white/15 pt-3">
            <p className="text-xs text-white/70">
              © 2026 Synerxus. All rights reserved.
            </p>
            <p className="mt-1.5 max-w-5xl text-[11px] leading-snug text-white/65">
              {ASSURANCE_FOOTER_NOTE}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

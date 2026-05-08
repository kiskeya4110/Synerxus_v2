import { useState, type MouseEvent, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Facebook, Linkedin, LayoutDashboard, Menu, X } from "lucide-react";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

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
  const [location, navigate] = useLocation();
  const isLanding = location === "/landing" || location === "/";
  const { dbUser, loading: authLoading } = useAuth();
  const isLoggedIn = !authLoading && !!dbUser;

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
    <div className="min-h-screen bg-[linear-gradient(to_bottom_left,#b3d9e6_0%,#f8fbfc_100%)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-8">
          <Link
            href="/landing"
            className="shrink-0"
            onClick={(e) => {
              e.preventDefault();
              const hero = document.getElementById("hero");
              const focusHero = () => hero?.focus({ preventScroll: true });

              if (isLanding) {
                hero?.scrollIntoView({ behavior: "smooth", block: "start" });
                focusHero();
                return;
              }

              navigate("/landing#hero");
            }}
          >
            <Logo size="sm" clickable={false} />
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
            {isLoggedIn ? (
              <Button asChild className="bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
                <Link href="/dashboard">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Link>
              </Button>
            ) : (
              <>
                <Link href="/login" className="rounded-md px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:text-[#0A1F44]">
                  Sign In
                </Link>
                <Button asChild className="bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
                  <Link href="/request-assessment">Request Assessment</Link>
                </Button>
              </>
            )}
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
              {isLoggedIn ? (
                <Button asChild className="mt-1 bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              ) : (
                <>
                  <Link href="/login" className="rounded-md px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={() => setMobileOpen(false)}>
                    Sign In
                  </Link>
                  <Button asChild className="mt-1 bg-[#0A1F44] text-[#FFD95A] hover:bg-[#102b5a]">
                    <Link href="/request-assessment" onClick={() => setMobileOpen(false)}>Request Assessment</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="border-t border-[#D4980C]/20 bg-gradient-to-r from-[#e7f0ff] via-[#dbe8ff] to-[#cfdfff]">
        <div className="mx-auto max-w-7xl px-4 py-4 md:px-8 md:py-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
            <div className="max-w-md">
              <Logo size="sm" clickable={false} />
              <p className="mt-2 text-xs leading-snug text-slate-600">
                Structured evidence records for ESG reporting and assurance preparation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 md:justify-end">
              <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-3 gap-y-1.5">
                {footerLinks.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="text-[11px] font-semibold text-slate-700 transition-colors hover:text-[#0A1F44]"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
              <a
                href="mailto:hello@synerxus.com"
                className="text-[11px] font-semibold text-slate-700 transition-colors hover:text-[#0A1F44]"
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
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#D4980C]/25 bg-white/80 text-[#0A1F44] transition-colors hover:border-[#0A1F44]/30 hover:bg-white"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 border-t border-[#D4980C]/20 pt-3">
            <p className="text-xs text-slate-600">
              © 2026 Synerxus. All rights reserved.
            </p>
            <p className="mt-1.5 max-w-5xl text-[11px] leading-snug text-slate-600">
              {ASSURANCE_FOOTER_NOTE}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

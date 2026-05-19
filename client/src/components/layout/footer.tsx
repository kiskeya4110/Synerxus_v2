import { Link } from "wouter";
import { Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/ui/logo";

// Global registry to track footer instances and prevent duplicates
const footerRegistry = {
  instances: new Set<string>(),
  counter: 0,
};

const FOOTER_LINKS = {
  primary: [
    { href: "/help", label: "Help" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
  ],
} as const;

const ASSURANCE_FOOTER_NOTE =
  "Synerxus supports evidence organization, reporting preparation, and assurance preparation. Synerxus does not provide formal assurance, legal advice, compliance guarantees, SDG impact certification, or causal attribution.";

export default function Footer() {
  const instanceId = useRef<string>(`footer-${++footerRegistry.counter}`);
  const [isRegistered, setIsRegistered] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const id = instanceId.current;

    // Only register if no other footer is registered
    if (footerRegistry.instances.size === 0) {
      footerRegistry.instances.add(id);
      setIsRegistered(true);
    }

    return () => {
      footerRegistry.instances.delete(id);
    };
  }, []);

  // Don't render if this instance isn't the registered one
  if (!isRegistered) {
    return null;
  }

  return (
    <footer
      className="mt-auto border-t border-[#ffcc33]/20 bg-gradient-to-r from-[#fffdf7] via-[#fffaf0] to-[#ffcc33]/55"
      data-footer-id={instanceId.current}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-10 md:py-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
          <div className="max-w-md space-y-2">
            <Logo size="sm" variant="full" clickable={false} />
            <p className="text-xs leading-snug text-slate-600">
              Structured evidence records for ESG reporting and assurance preparation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-3 gap-y-1.5">
              {FOOTER_LINKS.primary.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[11px] font-semibold text-slate-700 transition-colors hover:text-[#0A1F44]"
                >
                    {link.label}
                </Link>
              ))}
            </nav>
            <a
              href="mailto:hello@synerxus.com"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:text-[#0A1F44]"
            >
              <Mail className="h-3.5 w-3.5 flex-shrink-0" />
              hello@synerxus.com
            </a>
          </div>
        </div>

        <div className="mt-3 border-t border-[#ffcc33]/20 pt-3">
          <p className="text-xs text-slate-600">
            © {currentYear}{" "}
            <span style={{ color: "#0A2463", fontWeight: 700 }}>SYNER</span>
            <span style={{ color: "#ffcc33", fontWeight: 700 }}>XUS</span>. All rights reserved.
          </p>
          <p className="mt-1.5 max-w-5xl text-[11px] leading-snug text-slate-600">
            {ASSURANCE_FOOTER_NOTE}
          </p>
          <p className="mt-1.5 text-[11px] leading-snug text-slate-600">
            Sustainable Development Goals (SDGs) are a registered trademark of the United Nations.
          </p>
        </div>
      </div>
    </footer>
  );
}

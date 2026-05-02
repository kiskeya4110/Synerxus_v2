import { Link } from "wouter";
import { Linkedin, Facebook, Mail, ExternalLink } from "lucide-react";
import { SiX } from "react-icons/si";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/ui/logo";
import { Divider } from "@/components/ui/section";

// Global registry to track footer instances and prevent duplicates
const footerRegistry = {
  instances: new Set<string>(),
  counter: 0,
};

const FOOTER_LINKS = {
  support: [{ href: "/help", label: "Help Center" }],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

const SOCIAL_LINKS = [
  { href: "https://x.com/synerxus", label: "X (Twitter)", icon: SiX },
  {
    href: "https://www.linkedin.com/company/synerxus",
    label: "LinkedIn",
    icon: Linkedin,
  },
  {
    href: "https://www.facebook.com/861509087040686",
    label: "Facebook",
    icon: Facebook,
  },
];

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
      className="bg-secondary border-t border-border mt-auto"
      data-footer-id={instanceId.current}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 py-6">
        {/* 4-column grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-5">

          {/* Column 1: Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <Logo size="sm" variant="full" clickable={false} />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Partner-Confirmed, Audit-Ready Evidence for Global ESG Reporting
            </p>
            <div className="flex gap-2">
              {SOCIAL_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md bg-stone-100 text-muted-foreground hover:text-primary hover:bg-indigo-50 transition-colors"
                    aria-label={link.label}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Column 2: Support */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Support</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.support.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Contact</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:hello@synerxus.com"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                  hello@synerxus.com
                </a>
              </li>
              <li>
                <a
                  href="https://synerxus.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  synerxus.com
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Legal */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

        </div>

        <Divider />

        {/* Copyright bar */}
        <div className="pt-4 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground">
            © {currentYear}{" "}
            <span style={{ color: "#0A2463", fontWeight: 700 }}>SYNER</span>
            <span style={{ color: "#D4980C", fontWeight: 700 }}>XUS</span>. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Partner-confirmed, audit-ready evidence for a transparent world
          </p>
        </div>
      </div>
    </footer>
  );
}

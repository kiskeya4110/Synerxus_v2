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
  platform: [
    { href: "/volunteer-dashboard", label: "Dashboard" },
    { href: "/discover-opportunities", label: "Opportunities" },
    { href: "/projects", label: "Projects" },
    { href: "/organizations", label: "Organizations" },
  ],
  resources: [{ href: "/help", label: "Help Center" }],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

const SOCIAL_LINKS = [
  { href: "https://x.com", label: "X (Twitter)", icon: SiX },
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
      <div className="container max-w-7xl mx-auto px-4 py-4">
        {/* Top row: brand + nav links + contact */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 flex-shrink-0">
            <Logo size="sm" variant="full" clickable={false} />
            <span className="hidden md:block text-xs text-muted-foreground">·</span>
            <p className="hidden md:block text-xs text-muted-foreground">
              Turn Volunteer Hours into Audit-Ready ESG Data
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            {FOOTER_LINKS.platform.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
            {FOOTER_LINKS.resources.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
            <a href="mailto:hello@synerxus.com" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Mail className="h-3 w-3" />
              hello@synerxus.com
            </a>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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

        <Divider />

        {/* Bottom row: copyright + legal */}
        <div className="pt-3 flex flex-col md:flex-row justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground">
            © {currentYear}{" "}
            <span style={{ color: "#0A2463", fontWeight: 700 }}>SYNER</span>
            <span style={{ color: "#B8860B", fontWeight: 700 }}>XUS</span>. All rights reserved.
          </p>
          <div className="flex gap-4">
            {FOOTER_LINKS.legal.map((link) => (
              <Link key={link.href} href={link.href} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

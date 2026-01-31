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
  resources: [
    { href: "/help", label: "Help Center" },
  ],
  legal: [
    { href: "/privacy", label: "Privacy Policy" },
    { href: "/terms", label: "Terms of Service" },
  ],
};

const SOCIAL_LINKS = [
  { href: "https://x.com", label: "X (Twitter)", icon: SiX },
  { href: "https://www.linkedin.com/company/synerxus", label: "LinkedIn", icon: Linkedin },
  { href: "https://www.facebook.com/861509087040686", label: "Facebook", icon: Facebook },
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
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Section */}
          <div className="md:col-span-1 space-y-4">
            <Logo size="sm" variant="full" clickable={false} />
            <p className="text-sm text-muted-foreground">
              Turn Volunteer Hours into Audit-Ready ESG Data
            </p>
            <div className="flex gap-3">
              {SOCIAL_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-stone-100 text-muted-foreground hover:text-primary hover:bg-indigo-50 transition-colors"
                    aria-label={link.label}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Platform Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Platform</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Resources</h4>
            <ul className="space-y-2">
              {FOOTER_LINKS.resources.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-foreground">Contact</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:support@synerxus.com"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4" />
                  support@synerxus.com
                </a>
              </li>
              <li>
                <a
                  href="https://synerxus.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  synerxus.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <Divider />

        {/* Bottom Section */}
        <div className="pt-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {currentYear} Synerxus. All rights reserved.
          </p>
          <div className="flex gap-6">
            {FOOTER_LINKS.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  variant?: "icon" | "wordmark" | "full";
  onClick?: () => void;
  clickable?: boolean;
  theme?: "light" | "dark" | "auto";
  // Legacy props for backward compatibility
  showMotto?: boolean;
  showIcon?: boolean;
}

const SIZES = {
  xs: { height: 28, imgMult: 1.18 },
  sm: { height: 36, imgMult: 1.18 },
  md: { height: 44, imgMult: 1.18 },
  lg: { height: 56, imgMult: 1.18 },
  xl: { height: 72, imgMult: 1.18 },
};

export default function Logo({
  className,
  size = "md",
  variant,
  onClick,
  clickable = true,
  theme,
  showMotto: _showMotto,
  showIcon: _showIcon,
}: LogoProps) {
  const [location, navigate] = useLocation();
  const config = SIZES[size];

  const handleLogoClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (!clickable) return;
    // If already on the landing page, scroll back to the top (CTA / hero).
    // Otherwise navigate there.
    if (location === '/landing' || location === '/') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        window.scrollTo(0, 0);
      }
    } else {
      navigate('/landing');
    }
  };

  const handleVerifiedClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/ngo-verification');
  };

  const wordmark = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: `${Math.round(config.height * 0.05)}px`,
    }}>
      <span
        style={{
          fontSize: `${Math.round(config.height * 0.70)}px`,
          fontFamily: "'Inter', 'Instrument Sans', sans-serif",
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}
      >
        <span style={{ color: '#0A2463' }}>SYNER</span>
        <span style={{ color: '#D4980C' }}>XUS</span>
      </span>
      <span
        style={{
          fontSize: `${Math.round(config.height * 0.43)}px`,
          fontFamily: "'Inter', 'Instrument Sans', sans-serif",
          fontWeight: 600,
          letterSpacing: '0.01em',
          lineHeight: 1,
          color: '#0F172A',
          textAlign: 'left',
          display: 'block',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ color: '#D4980C' }}>Impacts.</span>{' '}
        <span
          onClick={handleVerifiedClick}
          style={{ cursor: 'pointer', color: '#0A2463' }}
          title="Partner Confirmation"
        >
          Verified!
        </span>
      </span>
    </div>
  );

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? 'Synerxus — go to landing page' : undefined}
      onClick={handleLogoClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleLogoClick();
        }
      }}
      data-testid="button-logo"
      className={cn(
        "inline-flex items-center select-none rounded-md transition-opacity",
        clickable && "cursor-pointer hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4980C] focus-visible:ring-offset-2",
        className,
      )}
      style={{ gap: `${Math.round(config.height * 0.25)}px` }}
    >
      {/* Logo image */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <img
          src="/synerxus-esg-logo.png"
          alt="Synerxus"
          style={{ height: `${Math.round(config.height * config.imgMult)}px`, width: 'auto', display: 'block', flexShrink: 0 }}
        />
      </div>

      {/* Wordmark with independent "Verified" link (uses stopPropagation) */}
      <div>{wordmark}</div>
    </div>
  );
}

// Export sub-components for backward compatibility
function LogoIcon({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/synerxus-esg-logo.png"
      alt="Synerxus"
      style={{ height: `${size}px`, width: 'auto', display: 'block' }}
      className={className}
    />
  );
}

function Wordmark({ fontSize = 22, theme, className }: { fontSize?: number; theme?: string; className?: string }) {
  return null;
}

const LOGO_COLORS = {};
const WORDMARK_COLORS = {};

export { LogoIcon, Wordmark, LOGO_COLORS, WORDMARK_COLORS };

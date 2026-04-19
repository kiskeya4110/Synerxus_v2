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
  xs: { height: 28, imgMult: 0.95 },
  sm: { height: 36, imgMult: 1.03 },
  md: { height: 44, imgMult: 1.03 },
  lg: { height: 56, imgMult: 1.03 },
  xl: { height: 72, imgMult: 1.03 },
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
  const [, navigate] = useLocation();
  const config = SIZES[size];

  const handleLogoClick = () => {
    if (onClick) {
      onClick();
    } else if (clickable) {
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
          title="NGO Verification"
        >
          Verified!
        </span>
      </span>
    </div>
  );

  return (
    <div
      className={cn("inline-flex items-center", className)}
      style={{ gap: `${Math.round(config.height * 0.25)}px` }}
    >
      {/* Clickable logo image */}
      <div
        onClick={handleLogoClick}
        style={{ cursor: clickable ? 'pointer' : 'default', display: 'flex', alignItems: 'center', flexShrink: 0 }}
      >
        <img
          src="/synerxus-esg-logo.png"
          alt="Synerxus"
          style={{ height: `${Math.round(config.height * config.imgMult)}px`, width: 'auto', display: 'block', flexShrink: 0 }}
        />
      </div>

      {/* Wordmark with independent "Verified" link */}
      <div
        onClick={handleLogoClick}
        style={{ cursor: clickable ? 'pointer' : 'default' }}
        data-testid="button-logo"
      >
        {wordmark}
      </div>
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

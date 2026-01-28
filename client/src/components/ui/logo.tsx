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

// Logo colors from design system
const LOGO_COLORS = {
  indigo: "#6366F1",  // Top-Left - Corporate/Tech
  amber: "#F59E0B",   // Top-Right - Impact/Outcome
  green: "#22C55E",   // Bottom-Left - Growth/SDG
  cyan: "#22D3EE",    // Bottom-Right - NGO/Verification
};

// Size configurations
const SIZES = {
  xs: { icon: 24, fontSize: 14, gap: 6 },
  sm: { icon: 32, fontSize: 18, gap: 8 },
  md: { icon: 40, fontSize: 22, gap: 10 },
  lg: { icon: 52, fontSize: 28, gap: 12 },
  xl: { icon: 64, fontSize: 36, gap: 14 },
};

/**
 * Synerxus Logo Icon - S-shaped 4-square grid
 *
 * Layout:
 *   [Indigo] [Amber]    <- Top row shifted RIGHT
 *   [Green] [Cyan]      <- Bottom row shifted LEFT
 *
 * Each square has rounded OUTSIDE corners only
 */
function LogoIcon({ size = 40, className }: { size?: number; className?: string }) {
  // Square dimensions
  const squareSize = size * 0.4;  // Each square is 40% of total size
  const gap = size * 0.08;        // Gap between squares
  const offset = size * 0.1;      // S-curve offset (20-25% of square)
  const cornerRadius = squareSize * 0.35; // 35% corner radius
  const strokeWidth = size * 0.04; // Wireframe stroke width

  // Calculate positions
  const topRowY = 0;
  const bottomRowY = squareSize + gap;

  // Top row shifted right, bottom row shifted left for S-shape
  const topLeftX = offset;
  const topRightX = squareSize + gap + offset;
  const bottomLeftX = 0;
  const bottomRightX = squareSize + gap;

  // Total viewBox dimensions
  const totalWidth = squareSize * 2 + gap + offset;
  const totalHeight = squareSize * 2 + gap;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalWidth} ${totalHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Synerxus Logo"
    >
      {/* Top-Left Square - Indigo (rounded top-left corner) */}
      <rect
        x={topLeftX + strokeWidth / 2}
        y={topRowY + strokeWidth / 2}
        width={squareSize - strokeWidth}
        height={squareSize - strokeWidth}
        rx={cornerRadius}
        ry={cornerRadius}
        stroke={LOGO_COLORS.indigo}
        strokeWidth={strokeWidth}
        fill="none"
        style={{
          clipPath: `inset(0 0 ${cornerRadius}px ${cornerRadius}px round ${cornerRadius}px 0 0 0)`,
        }}
      />
      {/* Custom path for top-left with only top-left corner rounded */}
      <path
        d={`
          M ${topLeftX + cornerRadius} ${topRowY + strokeWidth / 2}
          L ${topLeftX + squareSize - strokeWidth / 2} ${topRowY + strokeWidth / 2}
          L ${topLeftX + squareSize - strokeWidth / 2} ${topRowY + squareSize - strokeWidth / 2}
          L ${topLeftX + strokeWidth / 2} ${topRowY + squareSize - strokeWidth / 2}
          L ${topLeftX + strokeWidth / 2} ${topRowY + cornerRadius}
          Q ${topLeftX + strokeWidth / 2} ${topRowY + strokeWidth / 2} ${topLeftX + cornerRadius} ${topRowY + strokeWidth / 2}
        `}
        stroke={LOGO_COLORS.indigo}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
      />

      {/* Top-Right Square - Amber (rounded top-right corner) */}
      <path
        d={`
          M ${topRightX + strokeWidth / 2} ${topRowY + strokeWidth / 2}
          L ${topRightX + squareSize - cornerRadius} ${topRowY + strokeWidth / 2}
          Q ${topRightX + squareSize - strokeWidth / 2} ${topRowY + strokeWidth / 2} ${topRightX + squareSize - strokeWidth / 2} ${topRowY + cornerRadius}
          L ${topRightX + squareSize - strokeWidth / 2} ${topRowY + squareSize - strokeWidth / 2}
          L ${topRightX + strokeWidth / 2} ${topRowY + squareSize - strokeWidth / 2}
          Z
        `}
        stroke={LOGO_COLORS.amber}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
      />

      {/* Bottom-Left Square - Green (rounded bottom-left corner) */}
      <path
        d={`
          M ${bottomLeftX + strokeWidth / 2} ${bottomRowY + strokeWidth / 2}
          L ${bottomLeftX + squareSize - strokeWidth / 2} ${bottomRowY + strokeWidth / 2}
          L ${bottomLeftX + squareSize - strokeWidth / 2} ${bottomRowY + squareSize - strokeWidth / 2}
          L ${bottomLeftX + cornerRadius} ${bottomRowY + squareSize - strokeWidth / 2}
          Q ${bottomLeftX + strokeWidth / 2} ${bottomRowY + squareSize - strokeWidth / 2} ${bottomLeftX + strokeWidth / 2} ${bottomRowY + squareSize - cornerRadius}
          L ${bottomLeftX + strokeWidth / 2} ${bottomRowY + strokeWidth / 2}
        `}
        stroke={LOGO_COLORS.green}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
      />

      {/* Bottom-Right Square - Cyan (rounded bottom-right corner) */}
      <path
        d={`
          M ${bottomRightX + strokeWidth / 2} ${bottomRowY + strokeWidth / 2}
          L ${bottomRightX + squareSize - strokeWidth / 2} ${bottomRowY + strokeWidth / 2}
          L ${bottomRightX + squareSize - strokeWidth / 2} ${bottomRowY + squareSize - cornerRadius}
          Q ${bottomRightX + squareSize - strokeWidth / 2} ${bottomRowY + squareSize - strokeWidth / 2} ${bottomRightX + squareSize - cornerRadius} ${bottomRowY + squareSize - strokeWidth / 2}
          L ${bottomRightX + strokeWidth / 2} ${bottomRowY + squareSize - strokeWidth / 2}
          Z
        `}
        stroke={LOGO_COLORS.cyan}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Wordmark colors
const WORDMARK_COLORS = {
  synerLight: "#0F172A",  // Dark navy blue for light backgrounds
  synerDark: "#F8FAFC",   // White for dark backgrounds
  xus: "#B8860B",         // Dark golden orange
};

/**
 * Synerxus Wordmark
 * SYNER in dark navy blue (or white on dark backgrounds)
 * XUS in dark golden orange
 */
function Wordmark({
  fontSize = 22,
  theme = "auto",
  className
}: {
  fontSize?: number;
  theme?: "light" | "dark" | "auto";
  className?: string;
}) {
  // For white/light backgrounds (theme="light" or "auto"), use dark navy blue for contrast
  // For dark backgrounds (theme="dark"), use white for contrast
  const synerColor = theme === "dark" ? WORDMARK_COLORS.synerDark : WORDMARK_COLORS.synerLight;

  return (
    <span
      className={cn("font-semibold tracking-tight", className)}
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: "'Inter', 'Instrument Sans', sans-serif",
      }}
    >
      <span style={{ color: synerColor }}>SYNER</span>
      <span style={{ color: WORDMARK_COLORS.xus }}>XUS</span>
    </span>
  );
}

/**
 * Main Logo Component
 *
 * Variants:
 * - icon: Just the S-shaped 4-square icon
 * - wordmark: Just the "SYNERXUS" text
 * - full: Icon + Wordmark together
 */
export default function Logo({
  className,
  size = "md",
  variant = "full",
  onClick,
  clickable = true,
  theme = "auto",
  showMotto: _showMotto, // Legacy prop, ignored
  showIcon = true, // Legacy prop for backward compatibility
}: LogoProps) {
  const [, navigate] = useLocation();
  const config = SIZES[size];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (clickable) {
      navigate('/landing');
    }
  };

  // Determine what to show based on variant and legacy showIcon prop
  const shouldShowIcon = showIcon && (variant === "icon" || variant === "full");
  const shouldShowWordmark = variant === "wordmark" || variant === "full";

  const content = (
    <div
      className={cn(
        "flex items-center",
        className
      )}
      style={{ gap: `${config.gap}px` }}
    >
      {shouldShowIcon && (
        <LogoIcon size={config.icon} />
      )}
      {shouldShowWordmark && (
        <Wordmark fontSize={config.fontSize} theme={theme} />
      )}
    </div>
  );

  if (clickable) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "inline-flex items-center cursor-pointer transition-all duration-200",
          "hover:opacity-90 active:scale-[0.98]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        )}
        data-testid="button-logo"
        aria-label="Synerxus - Go to home"
      >
        {content}
      </button>
    );
  }

  return content;
}

// Export sub-components for flexible use
export { LogoIcon, Wordmark, LOGO_COLORS, WORDMARK_COLORS };

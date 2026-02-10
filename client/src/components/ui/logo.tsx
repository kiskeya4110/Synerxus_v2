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
  navy: "#0F172A",      // Top-Left - Dark navy blue (filled)
  darkOrange: "#C2410C", // Top-Right - Dark orange (border only)
  yellow: "#FACC15",    // Bottom-Left - Yellow (filled)
  lightBlue: "#7DD3FC", // Bottom-Right - Light blue (filled)
};

// Size configurations - fontSize 25% smaller for balanced proportion with icon
const SIZES = {
  xs: { icon: 24, fontSize: 24, gap: 6 },
  sm: { icon: 32, fontSize: 32, gap: 8 },
  md: { icon: 40, fontSize: 39, gap: 10 },
  lg: { icon: 52, fontSize: 51, gap: 12 },
  xl: { icon: 64, fontSize: 63, gap: 14 },
};

/**
 * Synerxus Logo Icon - S-shaped 4-square grid
 *
 * Layout:
 *   [Navy]   [Orange]    <- Top row shifted RIGHT
 *   [Yellow] [LightBlue] <- Bottom row shifted LEFT
 *
 * Fill styles:
 *   - Top-Left (Navy): Filled
 *   - Top-Right (Dark Orange): Border only, open middle
 *   - Bottom-Left (Yellow): Filled
 *   - Bottom-Right (Light Blue): Filled
 */
function LogoIcon({ size = 40, className }: { size?: number; className?: string }) {
  // Square dimensions
  const squareSize = size * 0.4;  // Each square is 40% of total size
  const gap = size * 0.08;        // Gap between squares
  const offset = size * 0.1;      // S-curve offset (20-25% of square)
  const cornerRadius = squareSize * 0.35; // 35% corner radius
  const strokeWidth = size * 0.06; // Border stroke width for outline square

  // Calculate positions
  const topRowY = 0;
  const bottomRowY = squareSize + gap;

  // Top row shifted right, bottom row shifted left for S-shape
  const topLeftX = offset;
  const topRightX = squareSize + gap + offset;
  const bottomLeftX = 0;
  const bottomRightX = squareSize + gap;

  // Total content dimensions
  const contentWidth = squareSize * 2 + gap + offset;
  const contentHeight = squareSize * 2 + gap;

  // Add padding so the icon isn't edge-to-edge and is centered in its box
  const padding = size * 0.06;
  const viewBoxWidth = contentWidth + padding * 2;
  const viewBoxHeight = contentHeight + padding * 2;

  // Offset all content by padding so it's centered in the viewBox
  const padX = padding;
  const padY = padding;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'block' }}
      aria-label="Synerxus Logo"
    >
      {/* Top-Left Square - Dark Navy Blue (FILLED, rounded top-left corner) */}
      <path
        d={`
          M ${padX + topLeftX + cornerRadius} ${padY + topRowY}
          L ${padX + topLeftX + squareSize} ${padY + topRowY}
          L ${padX + topLeftX + squareSize} ${padY + topRowY + squareSize}
          L ${padX + topLeftX} ${padY + topRowY + squareSize}
          L ${padX + topLeftX} ${padY + topRowY + cornerRadius}
          Q ${padX + topLeftX} ${padY + topRowY} ${padX + topLeftX + cornerRadius} ${padY + topRowY}
          Z
        `}
        fill={LOGO_COLORS.navy}
      />

      {/* Top-Right Square - Dark Orange (BORDER ONLY, rounded top-right corner) */}
      <path
        d={`
          M ${padX + topRightX + strokeWidth / 2} ${padY + topRowY + strokeWidth / 2}
          L ${padX + topRightX + squareSize - cornerRadius} ${padY + topRowY + strokeWidth / 2}
          Q ${padX + topRightX + squareSize - strokeWidth / 2} ${padY + topRowY + strokeWidth / 2} ${padX + topRightX + squareSize - strokeWidth / 2} ${padY + topRowY + cornerRadius}
          L ${padX + topRightX + squareSize - strokeWidth / 2} ${padY + topRowY + squareSize - strokeWidth / 2}
          L ${padX + topRightX + strokeWidth / 2} ${padY + topRowY + squareSize - strokeWidth / 2}
          Z
        `}
        stroke={LOGO_COLORS.darkOrange}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinejoin="round"
      />

      {/* Bottom-Left Square - Yellow (FILLED, rounded bottom-left corner) */}
      <path
        d={`
          M ${padX + bottomLeftX} ${padY + bottomRowY}
          L ${padX + bottomLeftX + squareSize} ${padY + bottomRowY}
          L ${padX + bottomLeftX + squareSize} ${padY + bottomRowY + squareSize}
          L ${padX + bottomLeftX + cornerRadius} ${padY + bottomRowY + squareSize}
          Q ${padX + bottomLeftX} ${padY + bottomRowY + squareSize} ${padX + bottomLeftX} ${padY + bottomRowY + squareSize - cornerRadius}
          L ${padX + bottomLeftX} ${padY + bottomRowY}
          Z
        `}
        fill={LOGO_COLORS.yellow}
      />

      {/* Bottom-Right Square - Light Blue (FILLED, rounded bottom-right corner) */}
      <path
        d={`
          M ${padX + bottomRightX} ${padY + bottomRowY}
          L ${padX + bottomRightX + squareSize} ${padY + bottomRowY}
          L ${padX + bottomRightX + squareSize} ${padY + bottomRowY + squareSize - cornerRadius}
          Q ${padX + bottomRightX + squareSize} ${padY + bottomRowY + squareSize} ${padX + bottomRightX + squareSize - cornerRadius} ${padY + bottomRowY + squareSize}
          L ${padX + bottomRightX} ${padY + bottomRowY + squareSize}
          Z
        `}
        fill={LOGO_COLORS.lightBlue}
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
 * Bold weight to match the visual weight of the logo icon
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
      className={cn("tracking-tight", className)}
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: "'Inter', 'Instrument Sans', sans-serif",
        fontWeight: 800,
        letterSpacing: '-0.02em',
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

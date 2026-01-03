import { useState, useRef, useEffect } from "react";
import { motion, useInView, useMotionValue, useSpring } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

interface ScoreBreakdown {
  label: string;
  value: number;
  weight: number;
  color: string;
}

interface ImpactScoreGaugeProps {
  score: number; // 0-100
  size?: "sm" | "md" | "lg";
  showBreakdown?: boolean;
  breakdown?: ScoreBreakdown[];
  variant?: "volunteer" | "organization" | "csr";
  title?: string;
  subtitle?: string;
}

// Color gradient based on score
const getScoreColor = (score: number): string => {
  if (score >= 71) return "#22c55e"; // Green
  if (score >= 51) return "#eab308"; // Yellow
  if (score >= 31) return "#f97316"; // Orange
  return "#ef4444"; // Red
};

const getScoreLabel = (score: number): string => {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Developing";
  return "Getting Started";
};

const getVariantColors = (variant: string) => {
  switch (variant) {
    case "volunteer":
      return { primary: "#3b82f6", secondary: "#60a5fa" };
    case "organization":
      return { primary: "#10b981", secondary: "#34d399" };
    case "csr":
      return { primary: "#8b5cf6", secondary: "#a78bfa" };
    default:
      return { primary: "#3b82f6", secondary: "#60a5fa" };
  }
};

export function ImpactScoreGauge({
  score,
  size = "md",
  showBreakdown = false,
  breakdown = [],
  variant = "volunteer",
  title = "Impact Score",
  subtitle,
}: ImpactScoreGaugeProps) {
  const [showDialog, setShowDialog] = useState(false);
  const gaugeRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(gaugeRef, { once: true, margin: "-50px" });

  // Animate the score
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    damping: 30,
    stiffness: 50,
  });
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (isInView) {
      motionValue.set(score);
    }
  }, [isInView, score, motionValue]);

  useEffect(() => {
    const unsubscribe = springValue.on("change", (latest) => {
      setDisplayScore(Math.round(latest));
    });
    return unsubscribe;
  }, [springValue]);

  // Size configurations
  const sizeConfig = {
    sm: { width: 160, height: 100, strokeWidth: 12, fontSize: 24, labelSize: 10 },
    md: { width: 240, height: 140, strokeWidth: 16, fontSize: 36, labelSize: 12 },
    lg: { width: 320, height: 180, strokeWidth: 20, fontSize: 48, labelSize: 14 },
  };

  const config = sizeConfig[size];
  const { width, height, strokeWidth, fontSize, labelSize } = config;

  // SVG arc calculations for semi-circle
  const centerX = width / 2;
  const centerY = height - 10;
  const radius = Math.min(centerX, centerY) - strokeWidth;

  // Create arc path for semi-circle (180 degrees)
  const createArc = (startAngle: number, endAngle: number): string => {
    const start = polarToCartesian(centerX, centerY, radius, startAngle);
    const end = polarToCartesian(centerX, centerY, radius, endAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const angleInRadians = ((angle - 180) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(angleInRadians),
      y: cy + r * Math.sin(angleInRadians),
    };
  };

  // Background arc (full semi-circle)
  const backgroundArc = createArc(0, 180);

  // Progress arc based on score (0-100 maps to 0-180 degrees)
  const progressAngle = (displayScore / 100) * 180;
  const progressArc = createArc(0, progressAngle);

  const scoreColor = getScoreColor(displayScore);
  const scoreLabel = getScoreLabel(displayScore);
  const variantColors = getVariantColors(variant);

  return (
    <>
      <motion.div
        ref={gaugeRef}
        className="flex flex-col items-center cursor-pointer hover:scale-[1.02] transition-transform"
        onClick={() => showBreakdown && setShowDialog(true)}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Title */}
        <div className="text-center mb-2">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>
          )}
        </div>

        {/* Gauge SVG */}
        <svg width={width} height={height} className="overflow-visible">
          {/* Gradient definition */}
          <defs>
            <linearGradient id={`gauge-gradient-${variant}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="33%" stopColor="#f97316" />
              <stop offset="66%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <filter id="gauge-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={backgroundArc}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="dark:stroke-gray-700"
          />

          {/* Colored progress arc */}
          <motion.path
            d={progressArc}
            fill="none"
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#gauge-shadow)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          />

          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 180;
            const innerRadius = radius - strokeWidth / 2 - 8;
            const outerRadius = radius - strokeWidth / 2 - 4;
            const pos1 = polarToCartesian(centerX, centerY, innerRadius, angle);
            const pos2 = polarToCartesian(centerX, centerY, outerRadius, angle);
            return (
              <line
                key={tick}
                x1={pos1.x}
                y1={pos1.y}
                x2={pos2.x}
                y2={pos2.y}
                stroke="#9ca3af"
                strokeWidth="2"
                className="dark:stroke-gray-500"
              />
            );
          })}

          {/* Score text in center */}
          <text
            x={centerX}
            y={centerY - 20}
            textAnchor="middle"
            className="fill-gray-900 dark:fill-white font-bold"
            style={{ fontSize: `${fontSize}px` }}
          >
            {displayScore}
          </text>

          {/* "out of 100" label */}
          <text
            x={centerX}
            y={centerY - 5}
            textAnchor="middle"
            className="fill-gray-400 dark:fill-gray-500"
            style={{ fontSize: `${labelSize}px` }}
          >
            out of 100
          </text>

          {/* Score label */}
          <text
            x={centerX}
            y={centerY + 12}
            textAnchor="middle"
            fill={scoreColor}
            style={{ fontSize: `${labelSize + 2}px`, fontWeight: 600 }}
          >
            {scoreLabel}
          </text>
        </svg>

        {/* Click hint */}
        {showBreakdown && breakdown.length > 0 && (
          <p className="text-xs text-gray-400 mt-2 hover:text-gray-600 dark:hover:text-gray-300">
            Click to see breakdown
          </p>
        )}
      </motion.div>

      {/* Breakdown Dialog */}
      {showBreakdown && (
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: scoreColor }}>
                  {score}
                </span>
                <span className="text-gray-500">/ 100</span>
                <span className="ml-2 text-lg font-medium" style={{ color: scoreColor }}>
                  {scoreLabel}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 mt-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your impact score is calculated based on the following factors:
              </p>

              {breakdown.map((item, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {item.value.toFixed(0)} pts ({item.weight}% weight)
                    </span>
                  </div>
                  <div className="relative">
                    <Progress
                      value={item.value}
                      className="h-2"
                      style={{
                        // @ts-ignore - custom CSS variable for indicator color
                        "--progress-indicator-color": item.color,
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400">
                  Score = (Hours × 35%) + (People × 30%) + (Tasks × 20%) + (SDG × 10%) + (Match × 5%)
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default ImpactScoreGauge;

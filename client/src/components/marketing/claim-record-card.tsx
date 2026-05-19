import { motion, useReducedMotion } from "framer-motion";
import { AnimatedMetricValue } from "@/components/marketing/animated-metric-value";

type ClaimMetric = {
  label: string;
  value: string;
};

type ClaimRecordCardProps = {
  claim: string;
  status: string;
  statusTone?: "ready" | "review" | "incomplete";
  metrics?: ClaimMetric[];
  evidenceCoverage: number;
  coverageLabel?: string;
  supportSummary?: string;
  details?: ClaimMetric[];
  compact?: boolean;
  animateMetrics?: boolean;
};

function statusClass(tone: ClaimRecordCardProps["statusTone"] = "review") {
  if (tone === "ready") return "bg-emerald-100 text-emerald-700";
  if (tone === "incomplete") return "bg-amber-100 text-amber-800";
  return "bg-blue-100 text-blue-700";
}

function coverageClass(coverage: number) {
  if (coverage >= 80) return "bg-emerald-600";
  if (coverage >= 60) return "bg-[#c88914]";
  return "bg-amber-500";
}

export function ClaimRecordCard({
  claim,
  status,
  statusTone = "review",
  metrics = [],
  evidenceCoverage,
  coverageLabel = "Evidence coverage",
  supportSummary,
  details = [],
  compact = false,
  animateMetrics = true,
}: ClaimRecordCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const shouldAnimateMetrics = animateMetrics && !shouldReduceMotion;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="rounded-md border border-slate-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-500">Claim</p>
            <h2 className={`${compact ? "text-base" : "text-lg"} mt-1 font-extrabold leading-snug text-[#0A1F44]`}>
              {claim}
            </h2>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusClass(statusTone)}`}>
            {status}
          </span>
        </div>

        {metrics.length > 0 && (
          <div className={`mt-5 grid gap-3 ${compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
            {metrics.map(({ label, value }, index) => (
              <motion.div
                key={label}
                className="rounded-md border border-slate-200 bg-white p-3"
                animate={
                  shouldAnimateMetrics
                    ? {
                        y: [0, -4, 0],
                        borderColor: ["#e2e8f0", "#c88914", "#e2e8f0"],
                        boxShadow: [
                          "0 0 0 rgba(200, 137, 20, 0)",
                          "0 10px 24px rgba(200, 137, 20, 0.16)",
                          "0 0 0 rgba(200, 137, 20, 0)",
                        ],
                      }
                    : undefined
                }
                transition={
                  shouldAnimateMetrics
                    ? {
                        duration: 1.8,
                        delay: index * 0.28,
                        repeat: Infinity,
                        repeatDelay: metrics.length * 0.28,
                        ease: "easeInOut",
                      }
                    : undefined
                }
              >
                <p className="text-[10px] font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-extrabold tabular-nums text-[#0A1F44]">
                  <AnimatedMetricValue value={value} active={animateMetrics} />
                </p>
              </motion.div>
            ))}
          </div>
        )}

        <div className="mt-5 rounded-md bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-extrabold text-[#0A1F44]">{coverageLabel}</p>
            <p className="text-xs font-bold tabular-nums text-emerald-700">{evidenceCoverage}%</p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-3 rounded-full ${coverageClass(evidenceCoverage)}`}
              style={{ width: `${evidenceCoverage}%` }}
            />
          </div>
          {supportSummary && (
            <p className="mt-2 text-[11px] font-semibold text-slate-500">
              {supportSummary}
            </p>
          )}
        </div>

        {details.length > 0 && (
          <div className="mt-4 grid gap-2">
            {details.map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-xs">
                <span className="font-bold text-slate-500">{label}</span>
                <span className="font-extrabold text-[#0A1F44]">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

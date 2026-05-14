import { Lock } from "lucide-react";
import { type PlanFeatures, PLAN_FEATURES } from "@shared/plan-features";

const TIER_ORDER = ["free", "pilot", "starter", "growth", "enterprise"] as const;

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  pilot: "Pilot",
  starter: "Starter — From $8,000/yr",
  growth: "Growth — From $22,000/yr",
  enterprise: "Enterprise — From $38,000/yr",
};

/** Finds the lowest tier that has the given feature enabled */
function lowestTierWith(feature: keyof PlanFeatures): string {
  for (const tier of TIER_ORDER) {
    const val = PLAN_FEATURES[tier][feature];
    if (val === true || (typeof val === "number" && val > 1)) return tier;
  }
  return "enterprise";
}

interface PlanGateProps {
  /** Feature flag from PlanFeatures to check */
  feature: keyof PlanFeatures;
  /** Whether the current user's plan has this feature */
  hasAccess: boolean;
  /** Content to render when access is granted */
  children: React.ReactNode;
  /** Optional: show inline lock badge instead of full overlay */
  inline?: boolean;
}

/**
 * Wraps a feature with an upgrade prompt when the user's plan doesn't include it.
 * - Default: renders children behind a locked overlay
 * - inline: renders a small lock badge next to the wrapped content
 */
export function PlanGate({ feature, hasAccess, children, inline = false }: PlanGateProps) {
  if (hasAccess) return <>{children}</>;

  const requiredTier = lowestTierWith(feature);
  const label = TIER_LABELS[requiredTier] ?? requiredTier;

  if (inline) {
    return (
      <span className="inline-flex items-center gap-1.5 opacity-50 cursor-not-allowed select-none" title={`Requires ${label}`}>
        {children}
        <Lock className="h-3 w-3 text-slate-400 flex-shrink-0" />
      </span>
    );
  }

  return (
    <div className="relative group">
      {/* Blurred children as visual hint */}
      <div className="pointer-events-none select-none blur-[2px] opacity-40">
        {children}
      </div>
      {/* Upgrade overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl border border-dashed border-slate-300 gap-2 px-4 text-center">
        <div className="w-9 h-9 rounded-full bg-[#0A1F44]/10 flex items-center justify-center">
          <Lock className="h-4 w-4 text-[#0A1F44]" />
        </div>
        <p className="text-xs font-bold text-[#0A1F44] leading-tight">
          Requires {TIER_LABELS[requiredTier]?.split(" — ")[0] ?? requiredTier}
        </p>
        <p className="text-[10px] text-slate-400 leading-tight">{label}</p>
        <a
          href="/landing#pricing"
          className="mt-1 inline-block text-[10px] font-bold text-[#ffcc33] hover:underline"
        >
          Upgrade →
        </a>
      </div>
    </div>
  );
}

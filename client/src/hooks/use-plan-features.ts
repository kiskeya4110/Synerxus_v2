import { useQuery } from "@tanstack/react-query";
import { getPlanFeatures, type PlanFeatures } from "@shared/plan-features";
import { useAuth } from "./use-auth";

/**
 * Returns feature flags for the current corporate user's subscription tier.
 * Falls back to "free" if partner data is unavailable.
 */
export function usePlanFeatures(): PlanFeatures & { tier: string; isLoading: boolean } {
  const { dbUser } = useAuth();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["/api/csr/partners"],
    queryFn: async () => {
      const res = await fetch("/api/csr/partners", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: dbUser?.userType === "corporate-partner",
    staleTime: 5 * 60 * 1000,
  });

  const tier = (partner?.subscriptionTier as string) ?? "free";
  return { ...getPlanFeatures(tier), tier, isLoading };
}

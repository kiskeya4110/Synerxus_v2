/**
 * Plan enforcement middleware
 * Blocks API access based on the CSR partner's subscription tier.
 * Use requirePlanFeature() for boolean feature gates and
 * requireNgoPartnerQuota() before creating new NGO partner links.
 */

import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { getPlanFeatures, PlanFeatures } from "@shared/plan-features";

/** Fetch the CSR partner record for the authenticated user, or null. */
async function getCsrPartner(userId: number) {
  const partners = await storage.listCSRPartners();
  return partners.find((p) => p.userId === userId) ?? null;
}

/** Return a 402 if the partner's subscription end date has passed. */
function isExpired(partner: { subscriptionEndDate?: Date | null }): boolean {
  if (!partner.subscriptionEndDate) return false;
  return new Date(partner.subscriptionEndDate) < new Date();
}

/**
 * Middleware factory — blocks the route if the authenticated user's plan
 * does not include the given boolean feature flag.
 *
 * Usage:
 *   router.get("/export/csv", authMiddleware, requireCSRAccess, requirePlanFeature("csvExport"), handler)
 */
export function requirePlanFeature(feature: keyof PlanFeatures) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required." });
        return;
      }

      const partner = await getCsrPartner(user.id);
      if (!partner) {
        res.status(403).json({ error: "FORBIDDEN", message: "CSR partner account not found." });
        return;
      }

      if (isExpired(partner)) {
        res.status(402).json({
          error: "SUBSCRIPTION_EXPIRED",
          message: "Your subscription has expired. Please renew to continue.",
        });
        return;
      }

      const features = getPlanFeatures(partner.subscriptionTier);
      if (features[feature] === false) {
        res.status(403).json({
          error: "PLAN_LIMIT",
          message: `Your current plan (${features.label}) does not include this feature. Please upgrade to access it.`,
          feature: String(feature),
          currentPlan: partner.subscriptionTier,
          requiredUpgrade: true,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("[plan-enforcement] requirePlanFeature error:", err);
      res.status(500).json({ error: "Failed to verify plan access." });
    }
  };
}

/**
 * Middleware — checks the NGO partner count against the plan's maxNgoPartners
 * limit before allowing a new volunteer-employer link to be created.
 *
 * Expects req.body.partnerId to identify whose quota to check.
 * Falls back to the authenticated user's own partner record if partnerId is absent.
 *
 * Usage:
 *   router.post("/volunteer-employers", authMiddleware, requireNgoPartnerQuota(), handler)
 */
export function requireNgoPartnerQuota() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "UNAUTHORIZED", message: "Authentication required." });
        return;
      }

      // Resolve the CSR partner — prefer body.partnerId, fall back to the user's own record
      let partner;
      const bodyPartnerId = req.body?.partnerId ? Number(req.body.partnerId) : null;
      if (bodyPartnerId) {
        partner = await storage.getCSRPartner(bodyPartnerId);
      }
      if (!partner) {
        partner = await getCsrPartner(user.id);
      }
      if (!partner) {
        // No partner found — let the route return its own 404
        next();
        return;
      }

      if (isExpired(partner)) {
        res.status(402).json({
          error: "SUBSCRIPTION_EXPIRED",
          message: "Your subscription has expired. Please renew to continue.",
        });
        return;
      }

      const features = getPlanFeatures(partner.subscriptionTier);
      if (features.maxNgoPartners === Infinity) {
        next();
        return;
      }

      const existingLinks = await storage.listVolunteerEmployerLinksByPartnerId(partner.id);

      if (existingLinks.length >= features.maxNgoPartners) {
        res.status(403).json({
          error: "PLAN_LIMIT",
          message: `Your plan (${features.label}) allows up to ${features.maxNgoPartners} NGO partner link${features.maxNgoPartners === 1 ? "" : "s"}. Please upgrade to add more.`,
          feature: "maxNgoPartners",
          currentPlan: partner.subscriptionTier,
          currentCount: existingLinks.length,
          limit: features.maxNgoPartners,
          requiredUpgrade: true,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("[plan-enforcement] requireNgoPartnerQuota error:", err);
      res.status(500).json({ error: "Failed to verify NGO partner quota." });
    }
  };
}

/**
 * CSR Routes Module
 *
 * This module aggregates all CSR-related routes into a single router.
 * Routes are organized into focused sub-routers for maintainability.
 *
 * Structure:
 * - /csr/partners/* - Partner management
 * - /csr/challenges/* - CSR challenges
 * - /csr/budget-links/* - Budget allocation tracking
 * - /csr/verified-outputs/* - Verification tracking
 * - /csr/engagement-funnel/* - Engagement analytics
 * - /csr/notifications/* - Notification management
 * - /csr/impact-reporting/* - Impact reports
 * - /employee-engagement/* - Employee engagement tracking
 */

import { Router } from "express";
import { csrPartnersRouter } from "./csr-partners.router";
import { csrEngagementRouter } from "./csr-engagement.router";

export const csrModuleRouter = Router();

// Mount sub-routers
csrModuleRouter.use(csrPartnersRouter);
csrModuleRouter.use(csrEngagementRouter);

// Export for use in main routes
export { csrPartnersRouter, csrEngagementRouter };

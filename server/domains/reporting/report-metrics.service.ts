/**
 * Canonical report metrics service.
 *
 * Single source of truth for all KPI calculations used by:
 *   - Organization dashboard
 *   - Verified Evidence Summary report (preview + PDF export)
 *   - Report status calculation
 *
 * Rule: a record is "Verified" when verificationStatus === 'approved'.
 * This matches the organization dashboard's verifiedCount definition so that
 * both views show identical numbers for the same organization + same filters.
 */

import { isFullyVerified } from "@shared/validation";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ReportStatus =
  | "Draft"
  | "Needs Data"
  | "Needs Review"
  | "Ready for Review"
  | "Exported"
  | "Archived";

export interface ReportMetrics {
  organizationId: number;
  reportingPeriod: string;
  reportPeriodType: string;
  startDate: string | null;
  endDate: string | null;
  dataCutoffDate: string;
  filtersApplied: {
    projectsIncluded: number[];
    frameworksIncluded: string[];
    sdgsIncluded: number[];
  };

  // Volume
  activeProjects: number;
  projectsIncluded: number;
  partnersIncluded: number;
  volunteersIncluded: number;

  // Evidence counts
  verifiedEvidenceRecords: number;
  verifiedOutputs: number;
  verifiedHours: number;
  pendingVerificationRecords: number;
  incompleteRecords: number;
  rejectedRecords: number;
  submittedRecords: number;

  // Rates
  verificationRate: number; // 0-100
  eligibleCompletionRate: number; // 0-100
  averageVerificationTime: string; // "Xh" or "N/A"

  // Partner-reported (not independently verified)
  partnerReportedReach: number;
  communitiesServed: number;
  programsIncluded: number;

  // Mapping
  sdgsMapped: number;
  frameworksMapped: number;

  // Quality
  evidenceQualityScore: number; // 0-100 weighted
  evidenceConfidenceBreakdown: {
    verifiedCount: number;
    partnerReportedCount: number;
    derivedMappedCount: number;
    verifiedPct: number;
    partnerReportedPct: number;
    derivedMappedPct: number;
  };
  evidenceCompletenessMetrics: Array<[string, boolean, string]>;

  // Status
  lastActivityDate: string | null;
  reportReadinessStatus: ReportStatus;

  // Raw data for rendering
  verifiedActivities: any[];
  allActivities: any[];
  projects: any[];
  partnerNames: string[];
  countries: string[];
  sdgsFromRecords: number[];
}

export interface ReportMetricsInput {
  activities: any[];
  projects: any[];
  partnerNames?: string[];
  countriesOrRegions?: string[];
  frameworksIncluded?: string[];
  sdgsIncluded?: number[];
  startDate?: Date | null;
  endDate?: Date | null;
  reportPeriodType?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items.filter((v) => v != null && v !== "")));
}

function getHours(a: any): number {
  return Number(a.hours ?? 0);
}

function getReach(a: any): number {
  return Number(a.beneficiaryCount ?? a.editedOutcomeQuantity ?? a.outcomeQuantity ?? 0);
}

function getLocationText(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "object") {
    if (typeof value.location === "string") return value.location.trim() || null;
    if (typeof value.name === "string") return value.name.trim() || null;
    if (typeof value.lat === "number" && typeof value.lng === "number") {
      return `${value.lat.toFixed(4)},${value.lng.toFixed(4)}`;
    }
  }
  return null;
}

function isVerified(a: any): boolean {
  // Canonical: matches dashboard verifiedCount definition
  return a.verificationStatus === "approved" || a.verificationStatus === "verified";
}

function computeWeightedQualityScore(
  checks: Array<[string, boolean, string]>,
  incompleteExcluded: boolean,
  metadataRedacted: boolean,
): number {
  const weights: Record<string, number> = {
    "Output Description Completeness": 15,
    "Partner Confirmation Completeness": 20,
    "Verification Timestamp Completeness": 15,
    "Activity Date Completeness": 10,
    "Source Attachment Availability": 10,
    "Location Context Availability": 10,
    "SDG Mapping Availability": 5,
    "Formal Framework Mapping Availability": 5,
  };
  let score = 0;
  for (const [label, , pctStr] of checks) {
    const w = weights[label] ?? 0;
    const pctNum = parseInt(pctStr.replace("%", ""), 10);
    if (!isNaN(pctNum)) score += w * (pctNum / 100);
  }
  if (incompleteExcluded) score += 5;
  if (metadataRedacted) score += 5;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function computeReadinessStatus(
  verifiedCount: number,
  qualityScore: number,
  incompleteCount: number,
): ReportStatus {
  if (verifiedCount === 0) return "Needs Data";
  if (qualityScore < 70 || incompleteCount > verifiedCount * 0.5) return "Needs Review";
  return "Ready for Review";
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function computeReportMetrics(
  organizationId: number,
  input: ReportMetricsInput,
): ReportMetrics {
  const { activities = [], projects = [] } = input;

  // Canonical status buckets (approved = verified to match dashboard)
  const verified = activities.filter(isVerified);
  const pending = activities.filter((a) => a.verificationStatus === "pending");
  const rejected = activities.filter((a) => a.verificationStatus === "rejected");
  const incomplete = activities.filter(
    (a) => a.verificationStatus === "incomplete",
  );

  // Strict evidence chain check (has verifiedAt, verifiedBy, date)
  const strictlyVerified = verified.filter(isFullyVerified);
  // Partner-reported = approved but missing one or more evidence chain fields
  const partnerReported = verified.filter((a) => !isFullyVerified(a));
  // Derived/mapped = pending (submitted but not yet confirmed)
  const derivedMapped = pending;

  // KPIs
  const verifiedHours = verified.reduce((sum, a) => sum + getHours(a), 0);
  const partnerReportedReach = verified.reduce((sum, a) => sum + getReach(a), 0);

  // Verification rate: verified / total submitted records.
  // Drafts should not be included in this submitted-record input set.
  const totalSubmitted = activities.length;
  const verificationRate =
    totalSubmitted > 0 ? Math.round((verified.length / totalSubmitted) * 100) : 0;

  // Eligible completion rate is retained separately for workflow diagnostics.
  const eligible =
    verified.length + pending.length + incomplete.length + rejected.length;
  const eligibleCompletionRate =
    eligible > 0 ? Math.round((verified.length / eligible) * 100) : 0;

  // Average verification time: avg(verifiedAt – submittedAt/createdAt) for verified records
  const verificationTimes = verified
    .filter((a) => a.verifiedAt && (a.submittedAt || a.createdAt))
    .map((a) => {
      const vMs = new Date(a.verifiedAt).getTime();
      const sMs = a.submittedAt
        ? new Date(a.submittedAt).getTime()
        : new Date(a.createdAt).getTime();
      return (vMs - sMs) / 3_600_000; // hours
    })
    .filter((h) => Number.isFinite(h) && h >= 0);
  const averageVerificationTime =
    verificationTimes.length > 0
      ? `${Math.round(
          verificationTimes.reduce((s, h) => s + h, 0) / verificationTimes.length,
        )}h`
      : "N/A";

  // Project/partner/volunteer counts
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const includedProjectIds = unique(
    activities.map((a) => a.projectId).filter(Boolean),
  ) as number[];
  const includedProjects = includedProjectIds
    .map((id) => projectMap.get(id))
    .filter(Boolean);

  const countries = unique([
    ...(input.countriesOrRegions ?? []),
    ...verified
      .map((a) => a.region || a.location || getLocationText(a.geolocation))
      .filter(Boolean),
    ...includedProjects.map((p: any) => p.location).filter(Boolean),
  ]);
  const communitiesServed =
    countries.length > 0
      ? countries.length
      : partnerReportedReach > 0 || verified.length > 0
        ? Math.max(includedProjectIds.length, 1)
        : 0;

  const partnerNames = unique(input.partnerNames ?? []);

  // SDGs: prefer activity sdgTags, fall back to project sdgGoals
  const sdgsFromRecords: number[] = unique(
    verified.flatMap((a) => {
      if (Array.isArray(a.sdgTags) && a.sdgTags.length > 0) return a.sdgTags as number[];
      const proj = projectMap.get(a.projectId);
      return (proj?.sdgGoals as number[]) ?? [];
    }),
  ).sort((a, b) => a - b) as number[];

  const sdgsIncluded = unique([
    ...(input.sdgsIncluded ?? []),
    ...sdgsFromRecords,
  ]).sort((a, b) => a - b) as number[];

  const frameworksIncluded =
    input.frameworksIncluded && input.frameworksIncluded.length > 0
      ? input.frameworksIncluded
      : [];

  // Completeness checks (used for quality score and scorecard table)
  const completenessChecks: Array<[string, boolean, string]> = [];

  if (verified.length > 0) {
    const check = (
      label: string,
      count: number,
    ): [string, boolean, string] => {
      const pct = Math.round((count / verified.length) * 100);
      return [label, count === verified.length, `${pct}%`];
    };

    completenessChecks.push(
      check(
        "Output Description Completeness",
        verified.filter(
          (a) => a.editedOutcomeText || a.outcomeText || a.description,
        ).length,
      ),
      check(
        "Partner Confirmation Completeness",
        verified.filter((a) => !!a.verifiedBy).length,
      ),
      check(
        "Verification Timestamp Completeness",
        verified.filter((a) => !!a.verifiedAt).length,
      ),
      check(
        "Activity Date Completeness",
        verified.filter((a) => !!a.date).length,
      ),
      check(
        "Source Attachment Availability",
        verified.filter(
          (a) => (a.evidenceLinks ?? a.attachments ?? []).length > 0,
        ).length,
      ),
      check(
        "Location Context Availability",
        verified.filter((a) => a.location || a.geolocation || a.region).length,
      ),
      check(
        "SDG Mapping Availability",
        verified.filter((a) => {
          if (Array.isArray(a.sdgTags) && a.sdgTags.length > 0) return true;
          const proj = projectMap.get(a.projectId);
          return Array.isArray(proj?.sdgGoals) && proj.sdgGoals.length > 0;
        }).length,
      ),
      check(
        "Formal Framework Mapping Availability",
        frameworksIncluded.length > 0 ? verified.length : 0,
      ),
    );
  }

  const qualityScore = computeWeightedQualityScore(
    completenessChecks,
    /* incompleteExcluded= */ true,
    /* metadataRedacted= */ true,
  );

  // Confidence breakdown (based on strict chain, not just status)
  const classifiedTotal =
    strictlyVerified.length + partnerReported.length + derivedMapped.length || 1;
  const verifiedPct = Math.round((strictlyVerified.length / classifiedTotal) * 100);
  const partnerReportedPct = Math.round((partnerReported.length / classifiedTotal) * 100);
  const derivedMappedPct = Math.max(0, 100 - verifiedPct - partnerReportedPct);

  // Dates
  const allTimestamps = verified
    .map((a) => a.verifiedAt ?? a.date)
    .filter(Boolean)
    .map((d) => new Date(d).getTime())
    .filter((n) => !isNaN(n));

  const lastActivityDate =
    allTimestamps.length > 0
      ? new Date(Math.max(...allTimestamps)).toISOString()
      : null;

  const earliestDate =
    allTimestamps.length > 0
      ? new Date(Math.min(...allTimestamps))
      : null;

  // Data cutoff: end of report period, or latest record date, or today
  const cutoffDate =
    input.endDate ??
    (lastActivityDate ? new Date(lastActivityDate) : new Date());
  const dataCutoffDate = cutoffDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Reporting period label
  const reportPeriodType = input.reportPeriodType ?? "all_time";
  let reportingPeriod: string;
  if (reportPeriodType === "all_time" || (!input.startDate && !input.endDate)) {
    if (earliestDate) {
      reportingPeriod = `All Time (${earliestDate.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })} – Present)`;
    } else {
      reportingPeriod = "All Time";
    }
  } else if (input.startDate && input.endDate) {
    reportingPeriod = `${input.startDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} – ${input.endDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  } else {
    reportingPeriod = "All Time";
  }

  const readinessStatus = computeReadinessStatus(
    verified.length,
    qualityScore,
    incomplete.length,
  );

  return {
    organizationId,
    reportingPeriod,
    reportPeriodType,
    startDate: input.startDate?.toISOString() ?? null,
    endDate: input.endDate?.toISOString() ?? null,
    dataCutoffDate,
    filtersApplied: {
      projectsIncluded: includedProjectIds,
      frameworksIncluded,
      sdgsIncluded,
    },
    activeProjects: includedProjects.filter((p) =>
      ["active", "in progress"].includes((p!.status ?? "").toLowerCase()),
    ).length,
    projectsIncluded: includedProjectIds.length,
    partnersIncluded: partnerNames.length,
    volunteersIncluded: unique(verified.map((a) => a.userId)).length,
    verifiedEvidenceRecords: verified.length,
    verifiedOutputs: verified.filter(
      (a) => a.outcomeText || a.editedOutcomeText || a.description,
    ).length,
    verifiedHours,
    pendingVerificationRecords: pending.length,
    incompleteRecords: incomplete.length,
    rejectedRecords: rejected.length,
    submittedRecords: activities.length,
    verificationRate,
    eligibleCompletionRate,
    averageVerificationTime,
    partnerReportedReach,
    communitiesServed,
    programsIncluded: includedProjectIds.length,
    sdgsMapped: sdgsIncluded.length,
    frameworksMapped: frameworksIncluded.length,
    evidenceQualityScore: qualityScore,
    evidenceConfidenceBreakdown: {
      verifiedCount: strictlyVerified.length,
      partnerReportedCount: partnerReported.length,
      derivedMappedCount: derivedMapped.length,
      verifiedPct,
      partnerReportedPct,
      derivedMappedPct,
    },
    evidenceCompletenessMetrics: completenessChecks,
    lastActivityDate,
    reportReadinessStatus: readinessStatus,
    verifiedActivities: verified,
    allActivities: activities,
    projects,
    partnerNames,
    countries,
    sdgsFromRecords: sdgsIncluded,
  };
}

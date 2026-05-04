export const PUBLIC_REPORT_REDACTED_TOPICS = [
  "device identifiers",
  "SMS routing and phone workflows",
  "raw telemetry signals",
  "fraud control logic",
  "proprietary verification mechanics",
] as const;

export const PUBLIC_REPORT_REDACTION_NOTE =
  `Sensitive technical metadata is retained internally and redacted from this management report. Redacted items include ${PUBLIC_REPORT_REDACTED_TOPICS.join(", ")}.`;

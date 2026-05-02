interface VerificationTimelineProps {
  slaComplianceRate?: number;
  period?: string;
}

export default function VerificationTimeline({
  slaComplianceRate = 85,
  period = "Q1 2026",
}: VerificationTimelineProps) {
  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        margin: "16px 0",
        border: "1px solid #E5E7EB",
        borderRadius: "4px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          background: "#0A2463",
          padding: "8px 16px",
          fontSize: "10px",
          fontWeight: 700,
          color: "#F9FAFB",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}
      >
        {period} Verification Timeline — SLA Compliance
      </div>

      <div style={{ padding: "14px 16px", background: "#F9FAFB" }}>
        {/* Track label */}
        <div style={{ fontSize: "9px", color: "#6B7280", marginBottom: "6px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          90-Day Reporting Window
        </div>

        {/* Main track */}
        <div
          style={{
            background: "#E5E7EB",
            height: "20px",
            borderRadius: "3px",
            overflow: "hidden",
            border: "1px solid #D1D5DB",
            marginBottom: "6px",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${slaComplianceRate}%`,
              height: "100%",
              background: "#0A2463",
            }}
          />
        </div>

        {/* Two annotation rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "12px",
                height: "8px",
                background: "#0A2463",
                borderRadius: "1px",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "9.5px", color: "#374151", fontWeight: 600 }}>
              {slaComplianceRate}% verified within 72h SLA
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "12px",
                height: "8px",
                background: "#0891B2",
                borderRadius: "1px",
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: "9.5px", color: "#374151", fontWeight: 600 }}>
              Structured evidence records maintained
            </span>
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "5px 16px",
          borderTop: "1px solid #E5E7EB",
          fontSize: "9px",
          color: "#9CA3AF",
        }}
      >
        Timestamps verified against stated SLA. 72h SLA matches boundary definition for defensibility.
      </div>
    </div>
  );
}

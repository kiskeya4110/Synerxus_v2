interface ReviewDensityStripProps {
  verifiedOutcomes: number;
  reviewRate: number;
  verifiedHours: number;
  avgTurnaround: number;
  verifiedBeneficiaries: number;
}

export default function ReviewDensityStrip({
  verifiedOutcomes,
  reviewRate,
  verifiedHours,
  avgTurnaround,
  verifiedBeneficiaries,
}: ReviewDensityStripProps) {
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
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
        }}
      >
        {/* Pillar 1 */}
        <div
          style={{
            padding: "16px 20px",
            borderRight: "1px solid #E5E7EB",
            background: "#F9FAFB",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#0A2463",
              lineHeight: 1.1,
            }}
          >
            {verifiedOutcomes.toLocaleString()} Confirmed
          </div>
          <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px", fontWeight: 600 }}>
            Outcomes ✓
          </div>
          <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "6px" }}>
            {reviewRate}% Review Rate
          </div>
        </div>

        {/* Pillar 2 */}
        <div
          style={{
            padding: "16px 20px",
            borderRight: "1px solid #E5E7EB",
            background: "#F9FAFB",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#0A2463",
              lineHeight: 1.1,
            }}
          >
            {verifiedHours.toLocaleString()} Confirmed
          </div>
          <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px", fontWeight: 600 }}>
            Hours ⏱
          </div>
          <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "6px" }}>
            {avgTurnaround}h avg turnaround
          </div>
        </div>

        {/* Pillar 3 */}
        <div
          style={{
            padding: "16px 20px",
            background: "#F9FAFB",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              color: "#0A2463",
              lineHeight: 1.1,
            }}
          >
            {verifiedBeneficiaries.toLocaleString()} Confirmed
          </div>
          <div style={{ fontSize: "11px", color: "#374151", marginTop: "4px", fontWeight: 600 }}>
            Beneficiaries
          </div>
          <div style={{ fontSize: "10px", color: "#6B7280", marginTop: "6px" }}>
            partner-tracked
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <div
        style={{
          padding: "6px 20px",
          background: "#0A2463",
          fontSize: "9px",
          color: "#E5E7EB",
          letterSpacing: "0.03em",
        }}
      >
        Management Reporting Confirmed — Supports Global Sustainability Frameworks (ISAE 3000)
      </div>
    </div>
  );
}

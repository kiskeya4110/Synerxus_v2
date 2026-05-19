export default function BoundaryIntegrityMatrix() {
  const included = [
    "Partner-confirmed outputs",
    "Authorized verifier timestamp",
    "Validated beneficiary counts where supplied",
    "Structured evidence records",
  ];

  const excluded = [
    "Unconfirmed self-reported hours",
    "Unreviewed outputs",
    "Projected/estimated numbers without partner methodology",
    "Financial SROI valuation",
  ];

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
      {/* Header */}
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
        Review Boundary — Included vs. Excluded
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {/* Included column */}
        <div style={{ borderRight: "1px solid #E5E7EB" }}>
          <div
            style={{
              padding: "8px 16px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#0891B2",
              background: "#F0FDFF",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            Included (Confirmed)
          </div>
          {included.map((item, i) => (
            <div
              key={i}
              style={{
                padding: "7px 16px",
                fontSize: "10.5px",
                color: "#374151",
                borderBottom: i < included.length - 1 ? "1px solid #F3F4F6" : undefined,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "#0891B2", fontWeight: 700, fontSize: "11px" }}>✓</span>
              {item}
            </div>
          ))}
        </div>

        {/* Excluded column */}
        <div>
          <div
            style={{
              padding: "8px 16px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#374151",
              background: "#F9FAFB",
              borderBottom: "1px solid #E5E7EB",
            }}
          >
            Excluded (Not Confirmed)
          </div>
          {excluded.map((item, i) => (
            <div
              key={i}
              style={{
                padding: "7px 16px",
                fontSize: "10.5px",
                color: "#6B7280",
                borderBottom: i < excluded.length - 1 ? "1px solid #F3F4F6" : undefined,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "#9CA3AF", fontWeight: 700, fontSize: "11px" }}>✗</span>
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

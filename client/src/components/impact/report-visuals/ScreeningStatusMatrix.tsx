const SCREENING_ROWS = [
  { dimension: "Community Harm", status: "Pass", affected: 0, method: "Partner program lead" },
  { dimension: "Environmental Effects", status: "Pass", affected: 0, method: "Community Liaison" },
  { dimension: "Resource Displacement", status: "Pass", affected: 0, method: "Project Coordinator" },
  { dimension: "Beneficiary Concerns", status: "Pass", affected: 0, method: "Structured Survey" },
];

export default function ScreeningStatusMatrix() {
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
        Negative Impact Screening — Status Matrix
      </div>

      {/* Column headers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 80px 100px 1fr",
          background: "#F9FAFB",
          borderBottom: "1px solid #E5E7EB",
        }}
      >
        {["Screening Dimension", "Status", "Outcomes Affected", "Verification Method"].map(
          (h, i) => (
            <div
              key={i}
              style={{
                padding: "6px 12px",
                fontSize: "9px",
                fontWeight: 700,
                color: "#374151",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                borderRight: i < 3 ? "1px solid #E5E7EB" : undefined,
              }}
            >
              {h}
            </div>
          )
        )}
      </div>

      {/* Rows */}
      {SCREENING_ROWS.map((row, i) => (
        <div
          key={i}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 80px 100px 1fr",
            borderBottom: i < SCREENING_ROWS.length - 1 ? "1px solid #F3F4F6" : undefined,
          }}
        >
          <div
            style={{
              padding: "7px 12px",
              fontSize: "10px",
              color: "#374151",
              borderRight: "1px solid #E5E7EB",
            }}
          >
            {row.dimension}
          </div>
          <div
            style={{
              padding: "7px 12px",
              fontSize: "10px",
              color: "#0891B2",
              fontWeight: 700,
              borderRight: "1px solid #E5E7EB",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <span>✓</span> {row.status}
          </div>
          <div
            style={{
              padding: "7px 12px",
              fontSize: "10px",
              fontWeight: 700,
              color: "#374151",
              borderRight: "1px solid #E5E7EB",
              textAlign: "center",
            }}
          >
            {row.affected}
          </div>
          <div
            style={{
              padding: "7px 12px",
              fontSize: "10px",
              color: "#6B7280",
            }}
          >
            {row.method}
          </div>
        </div>
      ))}
    </div>
  );
}

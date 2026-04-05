interface CSRDBoundaryIndicatorProps {
  percentage?: number;
}

export default function CSRDBoundaryIndicator({ percentage = 65 }: CSRDBoundaryIndicatorProps) {
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
        CSRD Assurance Boundary Indicator
      </div>

      <div style={{ padding: "14px 16px", background: "#F9FAFB" }}>
        {/* Progress bar */}
        <div
          style={{
            background: "#E5E7EB",
            height: "18px",
            borderRadius: "3px",
            overflow: "hidden",
            border: "1px solid #D1D5DB",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: "100%",
              background: "#0A2463",
              display: "flex",
              alignItems: "center",
              paddingLeft: "8px",
            }}
          >
            <span style={{ fontSize: "9px", color: "#F9FAFB", fontWeight: 700 }}>
              {percentage}%
            </span>
          </div>
        </div>

        {/* Label */}
        <div style={{ fontSize: "10.5px", color: "#374151", fontWeight: 600, marginBottom: "4px" }}>
          Supports CSRD Assurance{" "}
          <span style={{ color: "#0891B2" }}>(Management Reporting Verified)</span>
        </div>

        {/* Disclaimer */}
        <div
          style={{
            fontSize: "9px",
            color: "#6B7280",
            fontStyle: "italic",
            paddingTop: "6px",
            borderTop: "1px solid #E5E7EB",
            marginTop: "6px",
          }}
        >
          * Independent auditor procedures per ISAE 3000 required for formal assurance. Synerxus
          reduces evidence-gathering burden — it does not replace auditor judgment or opinion.
        </div>
      </div>
    </div>
  );
}

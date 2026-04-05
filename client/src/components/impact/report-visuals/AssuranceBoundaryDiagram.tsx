export default function AssuranceBoundaryDiagram() {
  const layers = [
    {
      label: "Independent Assurance — ISAE 3000 REQUIRED",
      sublabel: "(Auditor Judgment)",
      bg: "#F9FAFB",
      border: "#374151",
      textColor: "#374151",
      sublabelColor: "#9CA3AF",
    },
    {
      label: "Synerxus: Management Reporting Verified ✓",
      sublabel: "(NGO Verification)",
      bg: "#F0FDFF",
      border: "#0891B2",
      textColor: "#0A2463",
      sublabelColor: "#0891B2",
    },
    {
      label: "Self-Reported → Verified → Audit-Ready",
      sublabel: null,
      bg: "#EFF6FF",
      border: "#0A2463",
      textColor: "#0A2463",
      sublabelColor: null,
    },
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
        Assurance Boundary — Limitations & Scope
      </div>

      <div style={{ padding: "16px", background: "#F9FAFB" }}>
        {layers.map((layer, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: `${100 - i * 12}%`,
                padding: "10px 16px",
                border: `1.5px solid ${layer.border}`,
                borderRadius: "4px",
                background: layer.bg,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  color: layer.textColor,
                }}
              >
                {layer.label}
              </div>
              {layer.sublabel && (
                <div
                  style={{
                    fontSize: "9px",
                    color: layer.sublabelColor ?? "#9CA3AF",
                    marginTop: "2px",
                  }}
                >
                  {layer.sublabel}
                </div>
              )}
            </div>

            {/* Arrow between layers */}
            {i < layers.length - 1 && (
              <div
                style={{
                  color: "#9CA3AF",
                  fontSize: "14px",
                  lineHeight: 1,
                  margin: "4px 0",
                }}
              >
                ↓
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "5px 16px",
          borderTop: "1px solid #E5E7EB",
          fontSize: "9px",
          color: "#9CA3AF",
        }}
      >
        Synerxus provides verification infrastructure — not assurance opinion. Independent auditor
        required for ISAE 3000 / CSRD formal assurance.
      </div>
    </div>
  );
}

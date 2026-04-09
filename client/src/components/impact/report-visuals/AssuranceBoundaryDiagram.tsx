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

  const provides = [
    "NGO-verified outcomes with immutable audit trails",
    "Structured evidence objects for GRI 413, SASB SO-ES-110",
    "Double materiality compliance via negative impact screening",
    "Global framework alignment (SDGs, GRI, SASB, TCFD)",
  ];

  const requires = [
    "Formal assurance opinion (independent auditor required)",
    "Causal attribution (requires RCTs)",
    "Financial valuation (SROI not calculated)",
    "Regulatory compliance guarantee (auditor judgment required)",
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
        Assurance Boundary: Global Verification Scope
      </div>

      {/* Intro */}
      <div
        style={{
          padding: "12px 16px",
          background: "#F9FAFB",
          borderBottom: "1px solid #E5E7EB",
          fontSize: "10px",
          color: "#374151",
          lineHeight: 1.6,
        }}
      >
        This report provides verified outcome data supporting multiple global sustainability
        frameworks (UN SDGs, GRI, SASB, TCFD, SEC Climate Rules). It is designed to reduce
        auditor evidence-gathering burden by 60–70% but does not replace independent assurance
        per ISAE 3000.
      </div>

      {/* Layered graph */}
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
              <div style={{ fontSize: "10px", fontWeight: 700, color: layer.textColor }}>
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
            {i < layers.length - 1 && (
              <div style={{ color: "#9CA3AF", fontSize: "14px", lineHeight: 1, margin: "4px 0" }}>
                ↓
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Two-column grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderTop: "1px solid #E5E7EB",
        }}
      >
        <div style={{ padding: "12px 14px", borderRight: "1px solid #E5E7EB", background: "#f0fdf4" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#065f46", marginBottom: "8px" }}>
            ✅ What Synerxus Provides
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {provides.map((item, i) => (
              <li
                key={i}
                style={{
                  fontSize: "9.5px",
                  color: "#374151",
                  marginBottom: i < provides.length - 1 ? "5px" : 0,
                  paddingLeft: "12px",
                  position: "relative",
                }}
              >
                <span style={{ position: "absolute", left: 0, color: "#059669" }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div style={{ padding: "12px 14px", background: "#fef2f2" }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#991b1b", marginBottom: "8px" }}>
            ❌ What Requires External Action
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {requires.map((item, i) => (
              <li
                key={i}
                style={{
                  fontSize: "9.5px",
                  color: "#374151",
                  marginBottom: i < requires.length - 1 ? "5px" : 0,
                  paddingLeft: "12px",
                  position: "relative",
                }}
              >
                <span style={{ position: "absolute", left: 0, color: "#dc2626" }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom note */}
      <div
        style={{
          padding: "8px 16px",
          borderTop: "1px solid #E5E7EB",
          fontSize: "9px",
          color: "#6b7280",
          fontStyle: "italic",
          background: "#fffbeb",
        }}
      >
        For formal regulatory filing (CSRD, SEC, etc.), third-party auditor review per ISAE 3000
        remains required. Synerxus provides the evidence — auditors provide the opinion.
      </div>
    </div>
  );
}

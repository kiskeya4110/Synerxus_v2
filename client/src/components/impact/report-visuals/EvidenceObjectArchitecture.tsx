export default function EvidenceObjectArchitecture() {
  const columns = [
    {
      title: "Outcome Data",
      items: ["Deliverable", "Beneficiaries", "Hours", "Skills Applied"],
    },
    {
      title: "Audit Trail",
      items: ["Timestamp", "Verifier ID", "Geolocation", "Device Hash"],
    },
    {
      title: "Regulatory Metadata",
      items: ["SDG Primary/Secondary", "Framework Mapping (GRI/SASB/TCFD)", "Project ID", "Corporate Program"],
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
        Evidence Object: Structured Verification Unit
      </div>

      {/* Three columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
        {columns.map((col, ci) => (
          <div
            key={ci}
            style={{
              borderRight: ci < columns.length - 1 ? "1px solid #E5E7EB" : undefined,
            }}
          >
            <div
              style={{
                padding: "8px 14px",
                fontSize: "10px",
                fontWeight: 700,
                color: "#0A2463",
                background: "#F9FAFB",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              {col.title}
            </div>
            {col.items.map((item, ii) => (
              <div
                key={ii}
                style={{
                  padding: "5px 14px",
                  fontSize: "10px",
                  color: "#374151",
                  borderBottom: ii < col.items.length - 1 ? "1px solid #F3F4F6" : undefined,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span style={{ color: "#9CA3AF", fontSize: "8px" }}>•</span>
                {item}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Footer arrow + verification badge */}
      <div
        style={{
          padding: "10px 16px",
          background: "#F0FDFF",
          borderTop: "1px solid #E5E7EB",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span style={{ color: "#0891B2", fontSize: "14px" }}>↓</span>
        <span
          style={{
            fontSize: "10px",
            color: "#0891B2",
            fontWeight: 700,
          }}
        >
          NGO Verification ✓ within 72h
        </span>
        <span style={{ fontSize: "10px", color: "#6B7280" }}>→</span>
        <span style={{ fontSize: "10px", color: "#374151", fontWeight: 600 }}>
          Immutable Record Locked
        </span>
      </div>
    </div>
  );
}

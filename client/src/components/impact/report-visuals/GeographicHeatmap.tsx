interface GeoLocation {
  city: string;
  country: string;
  verifications: number;
}

interface GeographicHeatmapProps {
  locations?: GeoLocation[];
  verificationRate?: number;
  avgSLA?: number;
}

const DEFAULT_LOCATIONS: GeoLocation[] = [
  { city: "Sacramento", country: "USA", verifications: 134 },
  { city: "Zambia", country: "", verifications: 47 },
  { city: "Philippines", country: "", verifications: 29 },
  { city: "Zimbabwe", country: "", verifications: 18 },
  { city: "Mexico", country: "", verifications: 12 },
];

export default function GeographicHeatmap({
  locations = DEFAULT_LOCATIONS,
  verificationRate = 85,
  avgSLA = 16,
}: GeographicHeatmapProps) {
  const max = Math.max(...locations.map((l) => l.verifications));

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
        Global Verification Density — Q1 2026
      </div>

      <div style={{ padding: "12px 16px", background: "#F9FAFB" }}>
        {locations.map((loc, i) => {
          const barPct = (loc.verifications / max) * 100;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: i < locations.length - 1 ? "8px" : 0,
              }}
            >
              {/* Location label */}
              <div
                style={{
                  width: "130px",
                  flexShrink: 0,
                  fontSize: "9.5px",
                  color: "#374151",
                  fontWeight: 600,
                }}
              >
                {loc.city}
                {loc.country && (
                  <span style={{ color: "#9CA3AF", fontWeight: 400 }}>, {loc.country}</span>
                )}
              </div>

              {/* Bar */}
              <div
                style={{
                  flex: 1,
                  background: "#E5E7EB",
                  height: "14px",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${barPct}%`,
                    height: "100%",
                    background: i === 0 ? "#0A2463" : "#374151",
                    borderRadius: "2px",
                    opacity: 1 - i * 0.12,
                  }}
                />
              </div>

              {/* Count */}
              <div
                style={{
                  width: "100px",
                  flexShrink: 0,
                  fontSize: "9.5px",
                  color: "#374151",
                  fontWeight: 500,
                }}
              >
                {loc.verifications} verifications
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div
        style={{
          padding: "7px 16px",
          borderTop: "1px solid #E5E7EB",
          background: "#F9FAFB",
          display: "flex",
          gap: "24px",
          fontSize: "9px",
          color: "#374151",
        }}
      >
        <span>
          Verification Rate:{" "}
          <strong style={{ color: "#0A2463" }}>{verificationRate}%</strong>
        </span>
        <span>
          Avg. SLA: <strong style={{ color: "#0A2463" }}>{avgSLA}h</strong>
        </span>
        <span style={{ color: "#6B7280" }}>SMS-Based (No App Required)</span>
      </div>
    </div>
  );
}

interface SDGEntry {
  sdg: string;
  label: string;
  percentage: number;
  outcomes: number;
}

interface SDGHorizontalBarProps {
  entries?: SDGEntry[];
}

const DEFAULT_ENTRIES: SDGEntry[] = [
  { sdg: "SDG 13", label: "Climate Action", percentage: 26, outcomes: 73 },
  { sdg: "SDG 15", label: "Life on Land", percentage: 17, outcomes: 47 },
  { sdg: "SDG 6", label: "Clean Water", percentage: 15, outcomes: 34 },
  { sdg: "SDG 7", label: "Clean Energy", percentage: 9, outcomes: 27 },
  { sdg: "SDG 11", label: "Sustainable Cities", percentage: 9, outcomes: 27 },
  { sdg: "SDG 4", label: "Quality Education", percentage: 7, outcomes: 20 },
];

export default function SDGHorizontalBar({ entries = DEFAULT_ENTRIES }: SDGHorizontalBarProps) {
  const max = Math.max(...entries.map((e) => e.percentage));

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
        SDG Alignment — Verified Outcome Distribution
      </div>

      <div style={{ padding: "12px 16px", background: "#F9FAFB" }}>
        {entries.map((entry, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: i < entries.length - 1 ? "8px" : 0,
            }}
          >
            {/* SDG label */}
            <div
              style={{
                width: "110px",
                flexShrink: 0,
                fontSize: "9.5px",
                color: "#374151",
                fontWeight: 600,
              }}
            >
              <span style={{ color: "#0A2463" }}>{entry.sdg}</span>{" "}
              <span style={{ color: "#6B7280", fontWeight: 400 }}>{entry.label}</span>
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
                  width: `${(entry.percentage / max) * 100}%`,
                  height: "100%",
                  background: "#0A2463",
                  borderRadius: "2px",
                }}
              />
            </div>

            {/* Data label */}
            <div
              style={{
                width: "120px",
                flexShrink: 0,
                fontSize: "9.5px",
                color: "#374151",
                fontWeight: 500,
              }}
            >
              {entry.percentage}%{" "}
              <span style={{ color: "#6B7280", fontWeight: 400 }}>
                ({entry.outcomes} outcomes verified)
              </span>
            </div>
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
        All percentages refer to partner-confirmed records only. SDG alignment is mapped for reporting support.
      </div>
    </div>
  );
}

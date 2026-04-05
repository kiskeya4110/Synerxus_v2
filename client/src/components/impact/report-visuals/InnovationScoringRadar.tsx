interface ScoringDimension {
  label: string;
  shortLabel: string;
  rawScore: number;
  weight: number; // as decimal e.g. 0.40
}

interface InnovationScoringRadarProps {
  innovationTitle?: string;
  tier?: string;
  dimensions?: ScoringDimension[];
}

const DEFAULT_DIMENSIONS: ScoringDimension[] = [
  { label: "Verification Integrity", shortLabel: "Verification\nIntegrity", rawScore: 92, weight: 0.40 },
  { label: "Scale",                  shortLabel: "Scale",                  rawScore: 68, weight: 0.25 },
  { label: "Persistence",            shortLabel: "Persistence",            rawScore: 85, weight: 0.15 },
  { label: "Geographic Reach",       shortLabel: "Geographic\nReach",      rawScore: 33, weight: 0.10 },
  { label: "SDG Alignment",          shortLabel: "SDG\nAlignment",         rawScore: 100, weight: 0.10 },
];

function computeComposite(dims: ScoringDimension[]): number {
  return Math.round(dims.reduce((s, d) => s + d.rawScore * d.weight, 0) * 10) / 10;
}

function tierFromScore(score: number): string {
  if (score >= 80) return "Gold Tier";
  if (score >= 65) return "Silver Tier";
  if (score >= 50) return "Bronze Tier";
  return "Developing";
}

// Pure SVG radar — no chart library dependency, no gradients, flat/monochrome
function RadarSVG({ dimensions }: { dimensions: ScoringDimension[] }) {
  const n = dimensions.length;
  const cx = 140;
  const cy = 130;
  const r = 90; // max radius

  // Axis endpoints (clock starting from top, going clockwise)
  const axisPoints = dimensions.map((_, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  // Gridline polygons at 25%, 50%, 75%, 100%
  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = gridLevels.map((level) => {
    const pts = dimensions.map((_, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const rr = r * level;
      return `${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`;
    });
    return pts.join(" ");
  });

  // Score polygon
  const scorePoints = dimensions.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = r * (d.rawScore / 100);
    return `${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`;
  });

  // Label positions — push outward from axis endpoint
  const labelPositions = dimensions.map((d, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const lx = cx + (r + 28) * Math.cos(angle);
    const ly = cy + (r + 28) * Math.sin(angle);
    return { x: lx, y: ly, angle };
  });

  return (
    <svg viewBox="0 0 280 260" style={{ width: "100%", maxWidth: 280, display: "block", margin: "0 auto" }}>
      {/* Grid polygons */}
      {gridPolygons.map((pts, gi) => (
        <polygon
          key={gi}
          points={pts}
          fill="none"
          stroke={gi === gridPolygons.length - 1 ? "#D1D5DB" : "#E5E7EB"}
          strokeWidth={gi === gridPolygons.length - 1 ? "1" : "0.5"}
        />
      ))}

      {/* Axis lines */}
      {axisPoints.map((pt, i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={pt.x}
          y2={pt.y}
          stroke="#E5E7EB"
          strokeWidth="0.75"
        />
      ))}

      {/* Score polygon — outline only, no fill */}
      <polygon
        points={scorePoints.join(" ")}
        fill="none"
        stroke="#0A2463"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Score dots */}
      {dimensions.map((d, i) => {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const rr = r * (d.rawScore / 100);
        return (
          <circle
            key={i}
            cx={cx + rr * Math.cos(angle)}
            cy={cy + rr * Math.sin(angle)}
            r={3}
            fill="#0A2463"
          />
        );
      })}

      {/* Axis labels with score */}
      {labelPositions.map((lp, i) => {
        const d = dimensions[i];
        // Split shortLabel on \n for multi-line
        const lines = d.shortLabel.split("\n");
        const lineH = 9;
        const totalH = lines.length * lineH;
        // Anchor depends on x position relative to center
        const anchor = lp.x < cx - 5 ? "end" : lp.x > cx + 5 ? "start" : "middle";
        return (
          <g key={i}>
            {lines.map((line, li) => (
              <text
                key={li}
                x={lp.x}
                y={lp.y - totalH / 2 + li * lineH + lineH * 0.4}
                fontSize="7.5"
                fontFamily="Inter, sans-serif"
                fontWeight="600"
                fill="#374151"
                textAnchor={anchor}
              >
                {line}
              </text>
            ))}
            <text
              x={lp.x}
              y={lp.y + totalH / 2 + 2}
              fontSize="8"
              fontFamily="Inter, sans-serif"
              fontWeight="700"
              fill="#0A2463"
              textAnchor={anchor}
            >
              ({d.rawScore})
            </text>
          </g>
        );
      })}

      {/* Center composite label */}
      <text x={cx} y={cy - 6} fontSize="12" fontFamily="Inter, sans-serif" fontWeight="700" fill="#0A2463" textAnchor="middle">
        ★
      </text>
      <text x={cx} y={cy + 7} fontSize="8" fontFamily="Inter, sans-serif" fontWeight="600" fill="#374151" textAnchor="middle">
        Composite
      </text>
    </svg>
  );
}

export default function InnovationScoringRadar({
  innovationTitle = "Solar Microgrids for Rural Clinics",
  tier,
  dimensions = DEFAULT_DIMENSIONS,
}: InnovationScoringRadarProps) {
  const composite = computeComposite(dimensions);
  const resolvedTier = tier || tierFromScore(composite);

  return (
    <div
      style={{
        fontFamily: "Inter, sans-serif",
        margin: "14px 0",
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
        Verified Innovation Scoring Profile
      </div>

      <div style={{ background: "#F9FAFB" }}>
        {/* Innovation title + tier badge */}
        <div
          style={{
            padding: "8px 16px 0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "10px", color: "#374151", fontWeight: 600 }}>
            {innovationTitle}
          </div>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "#0A2463",
              background: "#EFF6FF",
              border: "1px solid #BFDBFE",
              borderRadius: "3px",
              padding: "2px 8px",
            }}
          >
            {resolvedTier}
          </div>
        </div>

        {/* PRIMARY: Weighted Scoring Table — full width */}
        <div style={{ padding: "8px 16px 12px" }}>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "#374151",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "6px",
            }}
          >
            Weighted Scoring Table
            <span
              style={{
                marginLeft: "8px",
                fontSize: "8px",
                fontWeight: 600,
                color: "#059669",
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              (Primary Audit Source)
            </span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5E7EB" }}>
                <th style={{ padding: "3px 4px", textAlign: "left", color: "#6B7280", fontWeight: 600 }}>Dimension</th>
                <th style={{ padding: "3px 4px", textAlign: "center", color: "#6B7280", fontWeight: 600 }}>Raw Score (/100)</th>
                <th style={{ padding: "3px 4px", textAlign: "center", color: "#6B7280", fontWeight: 600 }}>Weight</th>
                <th style={{ padding: "3px 4px", textAlign: "center", color: "#6B7280", fontWeight: 600 }}>Weighted Score</th>
              </tr>
            </thead>
            <tbody>
              {dimensions.map((d, i) => (
                <tr
                  key={i}
                  style={{
                    borderBottom: i < dimensions.length - 1 ? "1px solid #F3F4F6" : "1px solid #E5E7EB",
                    background: i % 2 === 1 ? "#FFFFFF" : undefined,
                  }}
                >
                  <td style={{ padding: "4px", color: "#374151" }}>{d.label}</td>
                  <td style={{ padding: "4px", textAlign: "center", color: "#0A2463", fontWeight: 700 }}>{d.rawScore}</td>
                  <td style={{ padding: "4px", textAlign: "center", color: "#6B7280" }}>{Math.round(d.weight * 100)}%</td>
                  <td style={{ padding: "4px", textAlign: "center", color: "#374151", fontWeight: 600 }}>
                    {Math.round(d.rawScore * d.weight * 10) / 10}
                  </td>
                </tr>
              ))}
              <tr style={{ background: "#0A2463" }}>
                <td style={{ padding: "4px 4px", color: "#F9FAFB", fontWeight: 700 }} colSpan={3}>
                  Composite Score
                </td>
                <td style={{ padding: "4px 4px", textAlign: "center", color: "#F9FAFB", fontWeight: 700 }}>
                  {composite}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px dashed #D1D5DB", margin: "0 16px" }} />

        {/* SUPPLEMENTAL: Radar chart — below the table */}
        <div style={{ padding: "8px 16px 4px" }}>
          <div
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "#6B7280",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "4px",
              textAlign: "center",
            }}
          >
            Supplemental — Visual Scoring Profile
          </div>
          <RadarSVG dimensions={dimensions} />
          <div
            style={{
              fontSize: "8px",
              color: "#9CA3AF",
              fontStyle: "italic",
              textAlign: "center",
              marginTop: "4px",
              lineHeight: 1.4,
            }}
          >
            Supplemental visual only — not for audit use. Axis order is fixed; scores match the table above.
          </div>
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "5px 16px",
          borderTop: "1px solid #E5E7EB",
          fontSize: "9px",
          color: "#9CA3AF",
          background: "#F9FAFB",
        }}
      >
        Weighted scoring table is the primary and authoritative audit source for this index. The radar chart is a supplemental visual representation only and does not constitute verified evidence. Axis order is fixed — not manipulated.
      </div>
    </div>
  );
}

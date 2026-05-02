interface ContributionChainProps {
  avgTurnaround?: number;
}

export default function ContributionChain({ avgTurnaround = 16 }: ContributionChainProps) {
  const nodes = [
    { label: "Volunteer Activity", verified: false },
    { label: "Partner Confirmation ✓", verified: true, sla: `${avgTurnaround}h avg` },
    { label: "Verified Evidence", verified: false },
    { label: "Beneficiaries", verified: false },
    { label: "SDG Advanced", verified: false },
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
        Contribution Chain — Verification Node
      </div>

      <div
        style={{
          padding: "16px",
          background: "#F9FAFB",
          display: "flex",
          alignItems: "center",
          gap: "0",
          flexWrap: "wrap",
        }}
      >
        {nodes.map((node, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {/* Node box */}
            <div
              style={{
                padding: "8px 12px",
                border: node.verified ? "1.5px solid #0891B2" : "1px solid #E5E7EB",
                borderRadius: "3px",
                background: node.verified ? "#F0FDFF" : "#FFFFFF",
                textAlign: "center",
                minWidth: "90px",
              }}
            >
              <div
                style={{
                  fontSize: "9.5px",
                  fontWeight: node.verified ? 700 : 500,
                  color: node.verified ? "#0891B2" : "#374151",
                  lineHeight: 1.3,
                }}
              >
                {node.label}
              </div>
              {node.sla && (
                <div
                  style={{
                    fontSize: "8.5px",
                    color: "#0A2463",
                    fontWeight: 600,
                    marginTop: "3px",
                  }}
                >
                  {node.sla}
                </div>
              )}
            </div>

            {/* Arrow between nodes */}
            {i < nodes.length - 1 && (
              <div
                style={{
                  padding: "0 6px",
                  color: "#9CA3AF",
                  fontSize: "14px",
                  fontWeight: 300,
                }}
              >
                →
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
        Authorized partner confirmation is the trust mechanism — not self-reported activity alone.
      </div>
    </div>
  );
}

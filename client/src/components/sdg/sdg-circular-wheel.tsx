import { useState } from "react";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { SDGDetailDialog } from "@/components/sdg/sdg-detail-dialog";
import { SDG_GOALS } from "@shared/sdg-goals";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";


interface SDGCircularWheelProps {
  scale?: number; // 1.0 = default, 1.5 = 150% larger, etc.
}

export function SDGCircularWheel({ scale = 1.0 }: SDGCircularWheelProps = {}) {
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [hoveredSDG, setHoveredSDG] = useState<number | null>(null);

  const sdgArray = Object.values(SDG_GOALS);
  const sortedSDGData = [...sdgArray].sort((a, b) => a.id - b.id);

  // SVG parameters for the wheel - scaled
  const baseSize = 600;
  const size = baseSize * scale;
  const center = size / 2;
  const outerRadius = 280 * scale;
  const innerRadius = 90 * scale;
  const totalSegments = 17;
  const anglePerSegment = (2 * Math.PI) / totalSegments;

  // Create a wedge path for each SDG
  const createWedgePath = (index: number): string => {
    const startAngle = index * anglePerSegment - Math.PI / 2; // Start from top
    const endAngle = startAngle + anglePerSegment;

    const x1 = center + innerRadius * Math.cos(startAngle);
    const y1 = center + innerRadius * Math.sin(startAngle);
    const x2 = center + outerRadius * Math.cos(startAngle);
    const y2 = center + outerRadius * Math.sin(startAngle);
    const x3 = center + outerRadius * Math.cos(endAngle);
    const y3 = center + outerRadius * Math.sin(endAngle);
    const x4 = center + innerRadius * Math.cos(endAngle);
    const y4 = center + innerRadius * Math.sin(endAngle);

    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z`;
  };

  // Get the center position of a wedge for placing the icon/number
  const getWedgeCenter = (index: number, radiusRatio: number = 0.65) => {
    const angle = index * anglePerSegment + anglePerSegment / 2 - Math.PI / 2;
    const radius = innerRadius + (outerRadius - innerRadius) * radiusRatio;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  return (
    <>
      <div className="w-full flex justify-center">
        {/* Desktop: Custom SVG SDG Wheel */}
        <div className="hidden md:block relative w-full max-w-4xl">
          <div className="relative mx-auto" style={{ maxWidth: "600px" }}>
            <svg
              viewBox={`0 0 ${size} ${size}`}
              className="w-full h-auto drop-shadow-2xl"
              style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.2))" }}
            >
              {/* Background circle for depth */}
              <circle
                cx={center}
                cy={center}
                r={outerRadius + 5}
                fill="white"
                stroke="#e5e7eb"
                strokeWidth="2"
              />

              {/* SDG Wedges */}
              {sortedSDGData.map((sdg, index) => {
                const isHovered = hoveredSDG === sdg.id;
                const wedgeCenter = getWedgeCenter(index, 0.5);
                const numberPos = getWedgeCenter(index, 0.35);
                const iconPos = getWedgeCenter(index, 0.7);

                return (
                  <g key={sdg.id}>
                    {/* Wedge */}
                    <path
                      d={createWedgePath(index)}
                      fill={getSDGColor(sdg.id)}
                      stroke="white"
                      strokeWidth="2"
                      className="cursor-pointer transition-all duration-200"
                      style={{
                        filter: isHovered ? "brightness(1.1)" : "none",
                        transform: isHovered ? `scale(1.02)` : "scale(1)",
                        transformOrigin: `${center}px ${center}px`,
                      }}
                      onClick={() => setSelectedSDG(sdg.id)}
                      onMouseEnter={() => setHoveredSDG(sdg.id)}
                      onMouseLeave={() => setHoveredSDG(null)}
                      data-testid={`sdg-wedge-${sdg.id}`}
                    />

                    {/* SDG Number */}
                    <text
                      x={numberPos.x}
                      y={numberPos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={24 * scale}
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                      }}
                    >
                      {sdg.id}
                    </text>

                    {/* SDG Icon - using UN approved icon image */}
                    <image
                      href={UN_SDG_ICONS[sdg.id]}
                      x={iconPos.x - (22 * scale)}
                      y={iconPos.y - (22 * scale)}
                      width={44 * scale}
                      height={44 * scale}
                      className="pointer-events-none select-none"
                      style={{
                        opacity: 1,
                        filter: isHovered ? "drop-shadow(0 0 8px rgba(255,255,255,0.8))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.3))"
                      }}
                    />
                  </g>
                );
              })}

              {/* Center circle for logo */}
              <circle
                cx={center}
                cy={center}
                r={innerRadius - 5}
                fill="white"
                stroke="#f97316"
                strokeWidth="3"
                className="drop-shadow-lg"
              />

              {/* Inner decorative ring */}
              <circle
                cx={center}
                cy={center}
                r={innerRadius - 15}
                fill="none"
                stroke="#f9731633"
                strokeWidth="2"
              />
            </svg>

            {/* Pulsating Synerxus Logo in Center */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none"
              style={{ width: "25%", height: "25%" }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                {/* Pulsating glow effect */}
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    animation: "synerxusPulse 2s ease-in-out infinite",
                    background: "radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)",
                  }}
                />
                {/* Logo */}
                <img
                  src="/favicon-512.png"
                  alt="Synerxus"
                  className="relative z-10 w-4/5 h-4/5 object-contain"
                  style={{
                    animation: "synerxusLogoScale 2s ease-in-out infinite",
                  }}
                />
              </div>
            </div>

            {/* Hover tooltip */}
            {hoveredSDG && (
              <div
                className="absolute bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-xl z-20 pointer-events-none whitespace-nowrap"
                style={{ top: "10px", left: "50%", transform: "translateX(-50%)" }}
              >
                <span className="font-bold">SDG {hoveredSDG}:</span> {SDG_GOALS[hoveredSDG]?.name}
              </div>
            )}
          </div>

          {/* Click instruction */}
          <p className="text-center text-gray-500 text-sm mt-4">
            Click on any SDG segment to learn more about the goal
          </p>
        </div>

        {/* Mobile: Grid layout - no height constraints to show all 17 SDGs */}
        <div className="md:hidden w-full">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 px-2 auto-rows-fr">
            {sortedSDGData.map((sdg) => {
              const sdgIcon = UN_SDG_ICONS[sdg.id];
              return (
                <button
                  key={sdg.id}
                  onClick={() => setSelectedSDG(sdg.id)}
                  className="group relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 w-full"
                  style={{ aspectRatio: "1/1" }}
                  data-testid={`sdg-button-mobile-${sdg.id}`}
                  title={`SDG ${sdg.id}: ${sdg.name}`}
                >
                  {sdgIcon ? (
                    <img
                      src={sdgIcon}
                      alt={`SDG ${sdg.id}: ${sdg.name}`}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white"
                      style={{ backgroundColor: getSDGColor(sdg.id) }}
                    >
                      <div className="text-2xl mb-1">{getSDGEmoji(sdg.id)}</div>
                      <div className="text-lg font-bold">{sdg.id}</div>
                      <div className="text-[10px] font-semibold text-center leading-tight">
                        {getSDGName(sdg.id).toUpperCase()}
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                    <div className="text-white text-xs font-semibold text-center">
                      <div className="font-bold">{sdg.name}</div>
                      <div className="text-[10px] mt-1">{sdg.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <SDGDetailDialog
        sdgId={selectedSDG}
        open={!!selectedSDG}
        onOpenChange={() => setSelectedSDG(null)}
      />
    </>
  );
}

// Helper function to get SDG-related emoji
function getSDGEmoji(sdgId: number): string {
  const emojis: Record<number, string> = {
    1: "🏠",  // No Poverty
    2: "🍽️",  // Zero Hunger
    3: "❤️",  // Good Health
    4: "📚",  // Quality Education
    5: "⚖️",  // Gender Equality
    6: "💧",  // Clean Water
    7: "☀️",  // Affordable Energy
    8: "💼",  // Decent Work
    9: "🏭",  // Industry Innovation
    10: "🤝", // Reduced Inequalities
    11: "🏙️", // Sustainable Cities
    12: "♻️",  // Responsible Consumption
    13: "🌍", // Climate Action
    14: "🐟", // Life Below Water
    15: "🌲", // Life on Land
    16: "🕊️", // Peace Justice
    17: "🤲", // Partnerships
  };
  return emojis[sdgId] || "🎯";
}

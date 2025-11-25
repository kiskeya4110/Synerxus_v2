import { useState } from "react";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { SDGDetailDialog } from "@/components/sdg/sdg-detail-dialog";
import { SDG_GOALS } from "@shared/sdg-goals";

export function SDGCircularWheel() {
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [hoveredSDG, setHoveredSDG] = useState<number | null>(null);

  const sdgArray = Object.values(SDG_GOALS);
  const sortedSDGData = [...sdgArray].sort((a, b) => a.id - b.id);
  const totalSDGs = sortedSDGData.length;
  const angleSlice = 360 / totalSDGs;

  // SVG rendering for concentric wheel
  const viewBoxSize = 800;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  const innerRadius = 100; // Empty center
  const outerRadius = 380; // Full radius
  const segmentWidth = (outerRadius - innerRadius) / 2; // Divide into 2 rings

  const createWedgePath = (
    startAngle: number,
    endAngle: number,
    innerR: number,
    outerR: number
  ) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const startRad = toRad(startAngle);
    const endRad = toRad(endAngle);

    const x1 = centerX + innerR * Math.cos(startRad);
    const y1 = centerY + innerR * Math.sin(startRad);
    const x2 = centerX + outerR * Math.cos(startRad);
    const y2 = centerY + outerR * Math.sin(startRad);
    const x3 = centerX + outerR * Math.cos(endRad);
    const y3 = centerY + outerR * Math.sin(endRad);
    const x4 = centerX + innerR * Math.cos(endRad);
    const y4 = centerY + innerR * Math.sin(endRad);

    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    return `M ${x1} ${y1} L ${x2} ${y2} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x3} ${y3} L ${x4} ${y4} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1} ${y1}`;
  };

  const getTextPosition = (index: number, ring: number) => {
    const angle = index * angleSlice + angleSlice / 2 - 90;
    const rad = (angle * Math.PI) / 180;
    const radius = innerRadius + ring * segmentWidth + segmentWidth / 2;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
      angle: angle + 90,
    };
  };

  return (
    <>
      <div className="w-full flex justify-center">
        {/* Desktop: Concentric SVG Wheel */}
        <div className="hidden md:block relative w-full max-w-4xl">
          <svg
            viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
            className="w-full h-auto drop-shadow-2xl"
            style={{ maxWidth: "700px" }}
          >
            {/* Render wedges */}
            {sortedSDGData.map((sdg, index) => {
              const startAngle = index * angleSlice - 90;
              const endAngle = startAngle + angleSlice;

              return (
                <g key={`sdg-${sdg.id}`}>
                  {/* Outer ring */}
                  <path
                    d={createWedgePath(
                      startAngle,
                      endAngle,
                      innerRadius + segmentWidth,
                      outerRadius
                    )}
                    fill={sdg.color}
                    stroke="white"
                    strokeWidth="3"
                    className="transition-opacity duration-300 cursor-pointer hover:opacity-90"
                    onClick={() => setSelectedSDG(sdg.id)}
                    onMouseEnter={() => setHoveredSDG(sdg.id)}
                    onMouseLeave={() => setHoveredSDG(null)}
                    data-testid={`sdg-wedge-${sdg.id}`}
                  />

                  {/* Inner ring - lighter shade */}
                  <path
                    d={createWedgePath(
                      startAngle,
                      endAngle,
                      innerRadius,
                      innerRadius + segmentWidth
                    )}
                    fill={sdg.color}
                    fillOpacity="0.7"
                    stroke="white"
                    strokeWidth="3"
                    className="transition-opacity duration-300 cursor-pointer hover:opacity-90"
                    onClick={() => setSelectedSDG(sdg.id)}
                    onMouseEnter={() => setHoveredSDG(sdg.id)}
                    onMouseLeave={() => setHoveredSDG(null)}
                  />

                  {/* Outer ring labels - SDG number and name */}
                  <g>
                    {/* SDG Number */}
                    <text
                      x={getTextPosition(index, 1).x}
                      y={getTextPosition(index, 1).y - 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="18"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                      }}
                    >
                      SDG {sdg.id}
                    </text>

                    {/* SDG Name */}
                    <text
                      x={getTextPosition(index, 1).x}
                      y={getTextPosition(index, 1).y + 10}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="13"
                      fontWeight="600"
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
                      }}
                    >
                      {sdg.shortName}
                    </text>
                  </g>

                  {/* Inner ring labels - SDG Goal Description (abbreviated) */}
                  <g>
                    <text
                      x={getTextPosition(index, 0).x}
                      y={getTextPosition(index, 0).y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="white"
                      fontSize="16"
                      fontWeight="bold"
                      className="pointer-events-none select-none"
                      style={{
                        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
                      }}
                    >
                      {sdg.id}
                    </text>
                  </g>
                </g>
              );
            })}

          </svg>

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
                  style={{ aspectRatio: '1/1' }}
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
                      style={{ backgroundColor: sdg.color }}
                    >
                      <div className="text-lg font-bold">{sdg.id}</div>
                      <div className="text-xs font-semibold">{sdg.shortName}</div>
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

import { useState } from "react";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { SDGDetailDialog } from "@/components/sdg/sdg-detail-dialog";
import { SDG_GOALS } from "@shared/sdg-goals";
import synerxusLogo from "@assets/Synerxus Modern Logo  NBG_1763712802367.png";

export function SDGCircularWheel() {
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);

  const sdgArray = Object.values(SDG_GOALS);
  const sortedSDGData = [...sdgArray].sort((a, b) => a.id - b.id);
  const totalSDGs = sortedSDGData.length;
  const angleSlice = 360 / totalSDGs;

  // SVG parameters for wedge design
  const viewBoxSize = 900;
  const centerX = viewBoxSize / 2;
  const centerY = viewBoxSize / 2;
  const innerRadius = 120; // Inner hole for logo
  const outerRadius = 380; // Outer edge of wedges

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

  const getIconPosition = (index: number) => {
    const angle = index * angleSlice + angleSlice / 2 - 90;
    const rad = (angle * Math.PI) / 180;
    const radius = (innerRadius + outerRadius) / 2;
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad),
    };
  };

  return (
    <>
      <div className="w-full flex justify-center">
        {/* Desktop: Wedge wheel layout */}
        <div className="hidden md:block relative w-full max-w-3xl" style={{ aspectRatio: '1/1' }}>
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
                  {/* Wedge path */}
                  <path
                    d={createWedgePath(startAngle, endAngle, innerRadius, outerRadius)}
                    fill={sdg.color}
                    stroke="white"
                    strokeWidth="2"
                    className="transition-opacity duration-300 cursor-pointer hover:opacity-90"
                    onClick={() => setSelectedSDG(sdg.id)}
                    data-testid={`sdg-wedge-${sdg.id}`}
                  />
                </g>
              );
            })}

            {/* Center circle background */}
            <circle
              cx={centerX}
              cy={centerY}
              r={innerRadius - 2}
              fill="white"
              stroke="white"
              strokeWidth="2"
              className="drop-shadow-lg"
            />
          </svg>

          {/* Overlay SDG icons on wedges */}
          <div className="absolute inset-0 flex items-center justify-center">
            {sortedSDGData.map((sdg, index) => {
              const { x, y } = getIconPosition(index);
              const sdgIcon = UN_SDG_ICONS[sdg.id];

              return (
                <button
                  key={`icon-${sdg.id}`}
                  onClick={() => setSelectedSDG(sdg.id)}
                  className="group absolute w-20 h-20 rounded-full overflow-hidden shadow-md transition-all duration-300 hover:scale-110 hover:shadow-xl hover:z-50 focus:outline-none"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  data-testid={`sdg-icon-${sdg.id}`}
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
                      className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: sdg.color }}
                    >
                      {sdg.id}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Center logo */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <div className="bg-white rounded-full p-4 shadow-2xl border-4 border-slate-100">
              <img
                src={synerxusLogo}
                alt="Synerxus Logo"
                className="w-32 h-32 object-contain"
              />
            </div>
          </div>
        </div>

        {/* Mobile: Grid layout */}
        <div className="md:hidden max-w-2xl mx-auto w-full">
          <div className="flex justify-center mb-8">
            <div className="bg-white rounded-full p-3 shadow-2xl border-4 border-slate-50">
              <img
                src={synerxusLogo}
                alt="Synerxus Logo"
                className="w-20 h-20 object-contain"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 px-2">
            {sortedSDGData.map((sdg) => {
              const sdgIcon = UN_SDG_ICONS[sdg.id];
              return (
                <button
                  key={sdg.id}
                  onClick={() => setSelectedSDG(sdg.id)}
                  className="group relative rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
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
                      className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg"
                      style={{ backgroundColor: sdg.color }}
                    >
                      {sdg.id}
                    </div>
                  )}
                  
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                    <div className="text-white text-xs font-semibold text-center">
                      <div className="font-bold">{sdg.name}</div>
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

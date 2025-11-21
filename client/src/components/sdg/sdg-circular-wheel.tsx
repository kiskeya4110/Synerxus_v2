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

  // Single ring parameters
  const radiusDesktop = 240; // Distance from center for SDG icons
  const radiusMobile = 140;

  const getPosition = (index: number, isMobile: boolean) => {
    const angle = (index * angleSlice) - 90;
    const radius = isMobile ? radiusMobile : radiusDesktop;
    const radians = (angle * Math.PI) / 180;
    const x = Math.cos(radians) * radius;
    const y = Math.sin(radians) * radius;
    return { x, y };
  };

  return (
    <>
      <div className="w-full flex justify-center">
        {/* Desktop: Single ring circular layout */}
        <div className="hidden md:block relative w-full max-w-3xl" style={{ aspectRatio: '1/1' }}>
          <div className="relative w-full h-full flex items-center justify-center">
            {/* SDG Icons positioned in circle */}
            {sortedSDGData.map((sdg, index) => {
              const { x, y } = getPosition(index, false);
              const sdgIcon = UN_SDG_ICONS[sdg.id];

              return (
                <button
                  key={sdg.id}
                  onClick={() => setSelectedSDG(sdg.id)}
                  className="group absolute w-28 h-28 rounded-lg overflow-hidden shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-2xl hover:z-50 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    left: '50%',
                    top: '50%',
                  }}
                  data-testid={`sdg-button-circular-${sdg.id}`}
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
                      <div className="text-2xl font-bold">{sdg.id}</div>
                    </div>
                  )}
                  
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                    <div className="text-white text-xs font-semibold text-center">
                      <div className="font-bold">{sdg.name}</div>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Center logo */}
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white rounded-full p-4 shadow-2xl border-4 border-slate-100">
                <img
                  src={synerxusLogo}
                  alt="Synerxus Logo"
                  className="w-28 h-28 object-contain"
                />
              </div>
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
                className="w-16 h-16 object-contain"
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
                      className="absolute inset-0 flex flex-col items-center justify-center p-2 text-white"
                      style={{ backgroundColor: sdg.color }}
                    >
                      <div className="text-lg font-bold">{sdg.id}</div>
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

import { useState } from "react";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { SDGDetailDialog } from "@/components/sdg/sdg-detail-dialog";
import { SDG_GOALS } from "@shared/sdg-goals";


export function SDGWheel() {
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);

  const renderSDGGrid = () => {
    const sdgArray = Object.values(SDG_GOALS);
    const sortedSDGData = [...sdgArray].sort((a, b) => a.id - b.id);
    
    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4 max-w-6xl mx-auto">
        {sortedSDGData.map((sdg) => {
          const sdgIcon = UN_SDG_ICONS[sdg.id];
          return (
            <button
              key={sdg.id}
              onClick={() => setSelectedSDG(sdg.id)}
              className="group relative rounded-md sm:rounded-lg overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:z-10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              style={{ 
                aspectRatio: '1/1',
                minHeight: '80px'
              }}
              data-testid={`sdg-button-${sdg.id}`}
            >
              {/* UN SDG Official Graphic or Fallback */}
              {sdgIcon ? (
                <img 
                  src={sdgIcon} 
                  alt={`SDG ${sdg.id}: ${sdg.name}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div 
                  className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 text-white"
                  style={{ backgroundColor: sdg.color }}
                >
                  <div className="text-3xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{sdg.id}</div>
                  <div className="text-[11px] sm:text-xs md:text-sm font-semibold text-center leading-tight line-clamp-2">
                    {sdg.name}
                  </div>
                </div>
              )}
              
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2 sm:p-3">
                <div className="text-white text-xs sm:text-sm md:text-base font-semibold text-center">
                  Click to learn more
                </div>
              </div>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="w-full">
        {renderSDGGrid()}
      </div>

      <SDGDetailDialog 
        sdgId={selectedSDG}
        open={!!selectedSDG}
        onOpenChange={() => setSelectedSDG(null)}
      />
    </>
  );
}

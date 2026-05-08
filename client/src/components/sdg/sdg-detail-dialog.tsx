import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { SDG_GOALS } from "@shared/sdg-goals";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";

interface SDGDetailDialogProps {
  sdgId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SDGDetailDialog({ sdgId, open, onOpenChange }: SDGDetailDialogProps) {
  const sdgData = sdgId ? SDG_GOALS[sdgId] : null;
  const sdgIcon = sdgId ? UN_SDG_ICONS[sdgId] : null;

  if (!sdgData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            {sdgIcon ? (
              <img 
                src={sdgIcon} 
                alt={`SDG ${sdgData.id}`}
                className="w-16 h-16 rounded-lg flex-shrink-0"
              />
            ) : (
              <div 
                className="w-16 h-16 rounded-lg flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
                style={{ backgroundColor: sdgData.color }}
              >
                {sdgData.id}
              </div>
            )}
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">
                SDG {sdgData.id}: {sdgData.name}
              </DialogTitle>
              <DialogDescription className="text-base">
                {sdgData.description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* About Section */}
          <div>
            <h3 className="font-semibold text-lg mb-2">About This Goal</h3>
            <p className="text-muted-foreground leading-relaxed">
              {sdgData.details}
            </p>
          </div>

          {/* Key Targets */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Key Targets</h3>
            <div className="grid gap-2">
              {sdgData.targets.map((target, index) => (
                <div 
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <Badge 
                    className="mt-0.5 flex-shrink-0"
                    style={{ backgroundColor: sdgData.color }}
                  >
                    {index + 1}
                  </Badge>
                  <span className="text-sm">{target}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Learn More */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => window.open(`https://sdgs.un.org/goals/goal${sdgData.id}`, '_blank')}
              data-testid="button-learn-more-sdg"
            >
              <ExternalLink className="h-4 w-4" />
              Learn More on UN Website
            </Button>
          </div>
          <p className="pt-4 text-[11px] text-muted-foreground">
            Sustainable Development Goals (SDGs) are a registered trademark of the United Nations.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

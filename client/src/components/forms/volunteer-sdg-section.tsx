import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const SDG_OPTIONS = [
  { value: 1, label: "1. No Poverty" },
  { value: 2, label: "2. Zero Hunger" },
  { value: 3, label: "3. Good Health and Well-being" },
  { value: 4, label: "4. Quality Education" },
  { value: 5, label: "5. Gender Equality" },
  { value: 6, label: "6. Clean Water and Sanitation" },
  { value: 7, label: "7. Affordable and Clean Energy" },
  { value: 8, label: "8. Decent Work and Economic Growth" },
  { value: 9, label: "9. Industry, Innovation and Infrastructure" },
  { value: 10, label: "10. Reduced Inequalities" },
  { value: 11, label: "11. Sustainable Cities and Communities" },
  { value: 12, label: "12. Responsible Consumption and Production" },
  { value: 13, label: "13. Climate Action" },
  { value: 14, label: "14. Life Below Water" },
  { value: 15, label: "15. Life on Land" },
  { value: 16, label: "16. Peace, Justice and Strong Institutions" },
  { value: 17, label: "17. Partnerships for the Goals" },
];

interface VolunteerSDGSectionProps {
  selectedSDGs: number[];
  onToggleSDG: (sdgValue: number) => void;
  formErrors?: any;
}

export function VolunteerSDGSection({
  selectedSDGs,
  onToggleSDG,
  formErrors,
}: VolunteerSDGSectionProps) {
  return (
    <div className="space-y-2">
      <Label>Sustainable Development Goals (SDGs)</Label>
      <p className="text-sm text-muted-foreground mb-2">
        Select the UN SDGs you're passionate about
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {SDG_OPTIONS.map((sdg) => (
          <Button
            key={sdg.value}
            type="button"
            variant={selectedSDGs.includes(sdg.value) ? "default" : "outline"}
            className="justify-start text-left h-auto py-2"
            onClick={() => onToggleSDG(sdg.value)}
            data-testid={`button-sdg-${sdg.value}`}
          >
            {sdg.label}
          </Button>
        ))}
      </div>
      {formErrors?.sdgGoals && (
        <p className="text-sm text-destructive">{formErrors.sdgGoals.message}</p>
      )}
    </div>
  );
}

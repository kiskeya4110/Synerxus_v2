import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Plus, X } from "lucide-react";

interface SkillProficiency {
  name: string;
  proficiency: number;
}

interface VolunteerSkillSectionProps {
  skills: SkillProficiency[];
  skillInput: string;
  setSkillInput: (value: string) => void;
  skillProficiency: number;
  setSkillProficiency: (value: number) => void;
  onAddSkill: () => void;
  onRemoveSkill: (skillName: string) => void;
  onUpdateSkillProficiency: (skillName: string, proficiency: number) => void;
  formErrors?: any;
}

export function VolunteerSkillSection({
  skills,
  skillInput,
  setSkillInput,
  skillProficiency,
  setSkillProficiency,
  onAddSkill,
  onRemoveSkill,
  onUpdateSkillProficiency,
  formErrors,
}: VolunteerSkillSectionProps) {
  return (
    <div className="space-y-4">
      <Label className="flex items-center gap-2">
        <Target className="h-4 w-4" />
        Skills & Proficiency
      </Label>
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Add a skill (e.g., Python, Teaching, Marketing)"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddSkill();
              }
            }}
            data-testid="input-add-skill"
          />
          <input
            type="range"
            min="0"
            max="100"
            value={skillProficiency}
            onChange={(e) => setSkillProficiency(parseInt(e.target.value))}
            className="w-24"
            data-testid="slider-skill-proficiency"
          />
          <span className="text-sm font-semibold min-w-[40px]">{skillProficiency}%</span>
          <Button
            type="button"
            onClick={onAddSkill}
            variant="secondary"
            data-testid="button-add-skill"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {skills.map((skill) => (
          <div
            key={skill.name}
            className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
            data-testid={`skill-item-${skill.name}`}
          >
            <div className="flex-1">
              <p className="font-medium text-sm">{skill.name}</p>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={skill.proficiency}
                  onChange={(e) =>
                    onUpdateSkillProficiency(skill.name, parseInt(e.target.value))
                  }
                  className="flex-1"
                  data-testid={`slider-proficiency-${skill.name}`}
                />
                <span className="text-sm font-semibold min-w-[40px]">
                  {skill.proficiency}%
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemoveSkill(skill.name)}
              className="text-destructive hover:text-destructive"
              data-testid={`button-remove-skill-${skill.name}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {skills.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed rounded-lg">
          <Target className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No skills added yet. Add your skills and rate your proficiency level.
          </p>
        </div>
      )}

      {formErrors?.skills && (
        <p className="text-sm text-destructive">{formErrors.skills.message}</p>
      )}
    </div>
  );
}

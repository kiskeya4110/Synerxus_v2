import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronUp, Briefcase, TrendingUp, Award } from "lucide-react";

interface SkillData {
  name: string;
  hours: number;
  projects?: number;
  isNew?: boolean; // Gained this period
}

interface SkillsPortfolioProps {
  skills: SkillData[];
  maxSkills?: number;
  title?: string;
  showValue?: boolean; // Show professional development value
  hourlyRate?: number; // For value calculation
}

// Skill category colors
const SKILL_COLORS: Record<string, string> = {
  // Technical
  "Python": "#3776ab",
  "JavaScript": "#f7df1e",
  "Data Analysis": "#3b82f6",
  "Web Development": "#61dafb",
  "Database Management": "#336791",
  "Machine Learning": "#ff6f00",
  "Cloud Computing": "#4285f4",
  // Professional
  "Project Management": "#8b5cf6",
  "Leadership": "#ec4899",
  "Communication": "#14b8a6",
  "Teaching": "#f59e0b",
  "Mentoring": "#10b981",
  "Writing": "#6366f1",
  "Research": "#0ea5e9",
  // Default
  "default": "#6b7280",
};

const getSkillColor = (skillName: string): string => {
  // Check for exact match
  if (SKILL_COLORS[skillName]) return SKILL_COLORS[skillName];

  // Check for partial match
  const lowerName = skillName.toLowerCase();
  for (const [key, color] of Object.entries(SKILL_COLORS)) {
    if (lowerName.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerName)) {
      return color;
    }
  }

  // Generate consistent color from string
  let hash = 0;
  for (let i = 0; i < skillName.length; i++) {
    hash = skillName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 65%, 50%)`;
};

export function SkillsPortfolio({
  skills,
  maxSkills = 8,
  title = "Skills Applied",
  showValue = true,
  hourlyRate = 150, // Professional development equivalent rate
}: SkillsPortfolioProps) {
  const [expanded, setExpanded] = useState(false);

  // Sort skills by hours
  const sortedSkills = useMemo(() => {
    return [...skills].sort((a, b) => b.hours - a.hours);
  }, [skills]);

  // Calculate max hours for progress bars
  const maxHours = sortedSkills[0]?.hours || 1;

  // Skills to display
  const displaySkills = expanded ? sortedSkills : sortedSkills.slice(0, maxSkills);
  const hasMore = sortedSkills.length > maxSkills;

  // Calculate totals
  const totals = useMemo(() => {
    const totalHours = skills.reduce((sum, s) => sum + s.hours, 0);
    const totalProjects = skills.reduce((sum, s) => sum + (s.projects || 0), 0);
    const newSkillsCount = skills.filter(s => s.isNew).length;
    const developmentValue = totalHours * hourlyRate;

    return { totalHours, totalProjects, newSkillsCount, developmentValue };
  }, [skills, hourlyRate]);

  // New skills (gained this period)
  const newSkills = skills.filter(s => s.isNew);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {skills.length} skills • {totals.totalHours.toFixed(0)} hours
              </p>
            </div>
          </div>

          {showValue && (
            <div className="text-right">
              <p className="text-xs text-gray-500 dark:text-gray-400">Dev Value</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                ${totals.developmentValue.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {/* New skills badge row */}
        {newSkills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
          >
            <div className="flex items-center gap-2 mb-2">
              <Award className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                Skills Gained This Period
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {newSkills.map((skill, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300"
                >
                  {skill.name} 🆕
                </Badge>
              ))}
            </div>
          </motion.div>
        )}

        {/* Skills list */}
        <div className="space-y-3">
          {displaySkills.map((skill, index) => (
            <motion.div
              key={skill.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="group"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getSkillColor(skill.name) }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {skill.name}
                  </span>
                  {skill.isNew && (
                    <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 text-green-600 border-green-300">
                      NEW
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium">{skill.hours.toFixed(0)} hrs</span>
                  {skill.projects && (
                    <span>{skill.projects} projects</span>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: getSkillColor(skill.name) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(skill.hours / maxHours) * 100}%` }}
                  transition={{ duration: 0.5, delay: index * 0.05 + 0.2 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Expand/Collapse button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Show {sortedSkills.length - maxSkills} More Skills
              </>
            )}
          </Button>
        )}

        {/* Professional development value breakdown */}
        {showValue && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-1 mb-2">
              <TrendingUp className="h-3 w-3 text-gray-400" />
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Professional Development Equivalent
              </span>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Based on ${hourlyRate}/hr for comparable training and skill development programs.
              Your {totals.totalHours.toFixed(0)} hours of applied skills practice is equivalent
              to ${totals.developmentValue.toLocaleString()} in professional development value.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SkillsPortfolio;

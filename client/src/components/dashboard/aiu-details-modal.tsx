import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp, Info, Target, Award, Users, Clock, Lightbulb,
  Zap, BarChart3, Globe, CheckCircle2, Shield
} from "lucide-react";
import { formatDecimal } from "@/lib/format-utils";

interface AIUProject {
  projectId: number;
  projectName: string;
  aiu: number;
  hours: number;
  role: string;
  sdgIndicator?: string;
  organizationName?: string;
}

interface AIUDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAIU: number;
  projects?: AIUProject[];
  totalHours?: number;
  volunteerName?: string;
  sdgsContributed?: number[];
}

export default function AIUDetailsModal({
  isOpen,
  onClose,
  totalAIU,
  projects = [],
  totalHours = 0,
  volunteerName,
  sdgsContributed = []
}: AIUDetailsModalProps) {
  // Calculate metrics
  const aiuPerHour = formatDecimal(totalHours > 0 ? totalAIU / totalHours : 0);
  const projectCount = projects.length;
  const topProject = projects.length > 0
    ? projects.reduce((max, p) => p.aiu > max.aiu ? p : max, projects[0])
    : null;

  // AIU Level calculation
  const getAIULevel = (aiu: number) => {
    if (aiu >= 100) return { level: "Impact Champion", color: "text-purple-600", bg: "bg-purple-100", progress: 100, next: null };
    if (aiu >= 50) return { level: "Impact Leader", color: "text-blue-600", bg: "bg-blue-100", progress: 80, next: 100 };
    if (aiu >= 25) return { level: "Active Contributor", color: "text-emerald-600", bg: "bg-emerald-100", progress: 60, next: 50 };
    if (aiu >= 10) return { level: "Rising Star", color: "text-amber-600", bg: "bg-amber-100", progress: 40, next: 25 };
    return { level: "Getting Started", color: "text-slate-600", bg: "bg-slate-100", progress: 20, next: 10 };
  };

  const aiuLevel = getAIULevel(totalAIU);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-white rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              <TrendingUp className="h-6 w-6" />
              Attributable Impact Units (AIU)
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-sm">Your Total AIU</p>
              <p className="text-4xl font-bold">{formatDecimal(totalAIU)}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full ${aiuLevel.bg}`}>
              <p className={`text-sm font-semibold ${aiuLevel.color}`}>{aiuLevel.level}</p>
            </div>
          </div>
          <Progress value={aiuLevel.progress} className="mt-3 h-2 bg-white/20" />
          {aiuLevel.next && (
            <p className="text-xs text-cyan-100 mt-2 text-center">
              {formatDecimal(aiuLevel.next - totalAIU)} more AIU to reach next level
            </p>
          )}
        </div>

        {/* Single View Content */}
        <div className="p-4 space-y-4">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-2.5 text-center border border-blue-100">
              <Zap className="h-4 w-4 text-blue-600 mx-auto mb-1" />
              <p className="text-xs text-blue-600 font-medium">AIU/Hour</p>
              <p className="text-lg font-bold text-blue-700">{aiuPerHour}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-2.5 text-center border border-emerald-100">
              <Target className="h-4 w-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-xs text-emerald-600 font-medium">Projects</p>
              <p className="text-lg font-bold text-emerald-700">{projectCount}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-2.5 text-center border border-purple-100">
              <Clock className="h-4 w-4 text-purple-600 mx-auto mb-1" />
              <p className="text-xs text-purple-600 font-medium">Hours</p>
              <p className="text-lg font-bold text-purple-700">{formatDecimal(totalHours)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-2.5 text-center border border-amber-100">
              <Globe className="h-4 w-4 text-amber-600 mx-auto mb-1" />
              <p className="text-xs text-amber-600 font-medium">SDGs</p>
              <p className="text-lg font-bold text-amber-700">{sdgsContributed.length}</p>
            </div>
          </div>

          {/* What is AIU - Compact */}
          <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                  <Info className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">What is AIU?</p>
                  <p className="text-xs text-slate-600 mt-1">
                    AIU is Synerxus's proprietary metric that measures your verified contribution to social and environmental impact.
                    It provides an auditable record for CSR/ESG reporting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Factors Considered - Proprietary (no formula shown) */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <p className="font-semibold text-blue-800 text-sm">Impact Factors Considered</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  "Time investment & consistency",
                  "Role and responsibilities",
                  "Verified project outcomes",
                  "SDG alignment score",
                  "Skill-based contribution",
                  "Measurable results"
                ].map((factor, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                    <CheckCircle2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Project */}
          {topProject && (
            <Card className="border-cyan-200 bg-cyan-50/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-cyan-600" />
                  <p className="text-sm font-semibold text-cyan-700">Top Contributing Project</p>
                </div>
                <p className="font-bold text-slate-800 text-sm">{topProject.projectName}</p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-cyan-500" />
                    {formatDecimal(topProject.aiu)} AIU
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {formatDecimal(topProject.hours)} hrs
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-500">
                    {topProject.role || "Volunteer"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Breakdown */}
          {projects.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                AIU by Project
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {projects.sort((a, b) => b.aiu - a.aiu).slice(0, 5).map((project, index) => {
                  const percentage = totalAIU > 0 ? (project.aiu / totalAIU) * 100 : 0;
                  return (
                    <div key={project.projectId || index} className="bg-white rounded-lg p-2 border border-slate-100">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-slate-800 truncate flex-1">{project.projectName}</p>
                        <p className="text-xs font-bold text-cyan-600 ml-2">{formatDecimal(project.aiu)} AIU</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="h-1 flex-1" />
                        <span className="text-[10px] text-slate-400 w-10 text-right">{formatDecimal(percentage)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              {projects.length > 5 && (
                <p className="text-xs text-slate-400 text-center mt-2">+{projects.length - 5} more projects</p>
              )}
            </div>
          )}

          {projects.length === 0 && (
            <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 text-slate-300" />
              <p className="font-medium text-sm">No project data yet</p>
              <p className="text-xs mt-1">Start contributing to projects to earn AIU</p>
            </div>
          )}

          {/* Role Recognition - Compact */}
          <Card className="border-slate-200">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-slate-600" />
                <p className="font-semibold text-slate-800 text-sm">Role Recognition</p>
              </div>
              <p className="text-xs text-slate-600 mb-2">
                Different roles contribute differently to impact. Your AIU reflects your unique contribution:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { role: "Leadership", color: "bg-purple-100 text-purple-700" },
                  { role: "Specialist", color: "bg-blue-100 text-blue-700" },
                  { role: "Volunteer", color: "bg-green-100 text-green-700" },
                  { role: "Learner", color: "bg-amber-100 text-amber-700" },
                ].map(item => (
                  <span key={item.role} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.color}`}>
                    {item.role}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tips to Improve - Compact */}
          <Card className="border-emerald-200 bg-emerald-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-emerald-600" />
                <p className="font-semibold text-emerald-800 text-sm">Increase Your AIU</p>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {[
                  "Take on leadership roles in projects",
                  "Log volunteer hours consistently",
                  "Contribute specialized skills (pro bono)"
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                    <p className="text-xs text-slate-700">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Why AIU Matters - Compact Footer */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-100">
            <p className="text-xs font-semibold text-cyan-800 mb-1.5">Why AIU Matters</p>
            <div className="flex flex-wrap gap-2 text-[10px]">
              <span className="bg-white px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">
                ✓ Auditable for CSR/ESG
              </span>
              <span className="bg-white px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">
                ✓ Fair attribution
              </span>
              <span className="bg-white px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">
                ✓ SDG-mapped
              </span>
              <span className="bg-white px-2 py-0.5 rounded-full text-slate-600 border border-slate-200">
                ✓ Standardized
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
  verificationRate?: number;
  verifiedHours?: number;
  pendingHours?: number;
  onNavigateToVerification?: () => void;
}

export default function AIUDetailsModal({
  isOpen,
  onClose,
  totalAIU,
  projects = [],
  totalHours = 0,
  volunteerName,
  sdgsContributed = [],
  verificationRate = 0,
  verifiedHours = 0,
  pendingHours = 0,
  onNavigateToVerification
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
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0 bg-slate-900 border-slate-700">
        {/* Header with gradient */}
        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-6 text-white rounded-t-lg">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              <TrendingUp className="h-6 w-6" />
              Impact Score Details
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-cyan-100 text-sm">Your Total Score</p>
              <p className="text-4xl font-bold">{formatDecimal(totalAIU)}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full ${aiuLevel.bg}`}>
              <p className={`text-sm font-semibold ${aiuLevel.color}`}>{aiuLevel.level}</p>
            </div>
          </div>
          <Progress value={aiuLevel.progress} className="mt-3 h-2 bg-white/20" />
          {aiuLevel.next && (
            <p className="text-xs text-cyan-100 mt-2 text-center">
              {formatDecimal(aiuLevel.next - totalAIU)} more points to reach next level
            </p>
          )}
        </div>

        {/* Single View Content */}
        <div className="p-4 space-y-4 bg-slate-900">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg p-2.5 text-center shadow-md">
              <Zap className="h-4 w-4 text-white mx-auto mb-1" />
              <p className="text-xs text-white/90 font-medium">Score/Hour</p>
              <p className="text-lg font-bold text-white">{aiuPerHour}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg p-2.5 text-center shadow-md">
              <Target className="h-4 w-4 text-white mx-auto mb-1" />
              <p className="text-xs text-white/90 font-medium">Projects</p>
              <p className="text-lg font-bold text-white">{projectCount}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-violet-500 rounded-lg p-2.5 text-center shadow-md">
              <Clock className="h-4 w-4 text-white mx-auto mb-1" />
              <p className="text-xs text-white/90 font-medium">Hours</p>
              <p className="text-lg font-bold text-white">{formatDecimal(totalHours)}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg p-2.5 text-center shadow-md">
              <Globe className="h-4 w-4 text-white mx-auto mb-1" />
              <p className="text-xs text-white/90 font-medium">SDGs</p>
              <p className="text-lg font-bold text-white">{sdgsContributed.length}</p>
            </div>
          </div>

          {/* Verified Outcomes - Interactive */}
          <button
            onClick={onNavigateToVerification}
            className="w-full text-left"
            disabled={!onNavigateToVerification}
          >
            <Card className={`border-slate-700 bg-slate-800/90 ${onNavigateToVerification ? 'hover:shadow-lg hover:border-emerald-500/50 cursor-pointer transition-all active:scale-[0.99]' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg shadow-md">
                      <CheckCircle2 className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">Verified Outcomes</p>
                      <p className="text-xs text-slate-400">
                        {verificationRate}% of your activities are verified by organizations
                      </p>
                    </div>
                  </div>
                  {onNavigateToVerification && (
                    <div className="text-emerald-400 text-xs font-medium flex items-center gap-1">
                      View Details
                      <TrendingUp className="h-3 w-3" />
                    </div>
                  )}
                </div>
                {(verifiedHours > 0 || pendingHours > 0) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="bg-emerald-500/20 rounded-lg p-2 text-center border border-emerald-500/30">
                      <p className="text-lg font-bold text-emerald-400">{formatDecimal(verifiedHours)}</p>
                      <p className="text-[10px] text-emerald-400">Verified Outcomes</p>
                    </div>
                    <div className="bg-amber-500/20 rounded-lg p-2 text-center border border-amber-500/30">
                      <p className="text-lg font-bold text-amber-400">{formatDecimal(pendingHours)}</p>
                      <p className="text-[10px] text-amber-400">Pending Verification</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </button>

          {/* What is AIU - Compact */}
          <Card className="border-slate-700 bg-slate-800/90">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex-shrink-0 shadow-md">
                  <Info className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">What is Impact Score?</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Impact Score is Synerxus's proprietary metric that measures your verified contribution to social and environmental impact.
                    It provides an auditable record for CSR/ESG reporting.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Factors Considered - Proprietary (no formula shown) */}
          <Card className="border-slate-700 bg-slate-800/90">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-400" />
                <p className="font-semibold text-white text-sm">Impact Factors Considered</p>
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
                  <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
                    <CheckCircle2 className="h-3 w-3 text-blue-400 flex-shrink-0" />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Project */}
          {topProject && (
            <Card className="border-slate-700 bg-slate-800/90">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-cyan-400" />
                  <p className="text-sm font-semibold text-cyan-400">Top Contributing Project</p>
                </div>
                <p className="font-bold text-white text-sm">{topProject.projectName}</p>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-cyan-400" />
                    {formatDecimal(topProject.aiu)} pts
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {formatDecimal(topProject.hours)} hrs
                  </span>
                  <span className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-300">
                    {topProject.role || "Volunteer"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Breakdown */}
          {projects.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-slate-400" />
                Impact by Project
              </p>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {projects.sort((a, b) => b.aiu - a.aiu).slice(0, 5).map((project, index) => {
                  const percentage = totalAIU > 0 ? (project.aiu / totalAIU) * 100 : 0;
                  return (
                    <div key={project.projectId || index} className="bg-slate-800/60 rounded-lg p-2 border border-slate-700">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-medium text-white truncate flex-1">{project.projectName}</p>
                        <p className="text-xs font-bold text-cyan-400 ml-2">{formatDecimal(project.aiu)} pts</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="h-1 flex-1 bg-slate-700" />
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
            <div className="text-center py-6 text-slate-400 bg-slate-800/60 rounded-lg border border-slate-700">
              <BarChart3 className="h-10 w-10 mx-auto mb-2 text-slate-500" />
              <p className="font-medium text-sm text-white">No project data yet</p>
              <p className="text-xs mt-1">Start contributing to projects to earn points</p>
            </div>
          )}

          {/* Role Recognition - Compact */}
          <Card className="border-slate-700 bg-slate-800/90">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-slate-400" />
                <p className="font-semibold text-white text-sm">Role Recognition</p>
              </div>
              <p className="text-xs text-slate-400 mb-2">
                Different roles contribute differently to impact. Your score reflects your unique contribution:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { role: "Leadership", color: "bg-purple-500/20 text-purple-400 border border-purple-500/30" },
                  { role: "Specialist", color: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
                  { role: "Volunteer", color: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
                  { role: "Learner", color: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
                ].map(item => (
                  <span key={item.role} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.color}`}>
                    {item.role}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Insights - Interactive */}
          <Card className="border-slate-700 bg-slate-800/90">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-violet-400" />
                <p className="font-semibold text-white text-sm">Performance Insights</p>
              </div>
              <div className="space-y-2">
                {/* Efficiency */}
                <div className="w-full flex items-center justify-between p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs text-slate-300">Efficiency</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-violet-400">{aiuPerHour}</span>
                    <span className="text-[10px] text-slate-500">pts/hr</span>
                  </div>
                </div>
                {/* Project Diversity */}
                <div className="w-full flex items-center justify-between p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs text-slate-300">Project Diversity</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-violet-400">{projectCount}</span>
                    <span className="text-[10px] text-slate-500">projects</span>
                  </div>
                </div>
                {/* SDG Coverage */}
                <div className="w-full flex items-center justify-between p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                  <div className="flex items-center gap-2">
                    <Globe className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs text-slate-300">SDG Coverage</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-violet-400">{Math.round((sdgsContributed.length / 17) * 100)}%</span>
                    <span className="text-[10px] text-slate-500">of 17 SDGs</span>
                  </div>
                </div>
                {/* Verification Rate */}
                <div className="w-full flex items-center justify-between p-2 bg-violet-500/10 rounded-lg border border-violet-500/20">
                  <div className="flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5 text-violet-400" />
                    <span className="text-xs text-slate-300">Verification Rate</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold text-violet-400">{verificationRate}%</span>
                    <span className="text-[10px] text-slate-500">verified</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips to Improve - Compact */}
          <Card className="border-slate-700 bg-slate-800/90">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-emerald-400" />
                <p className="font-semibold text-white text-sm">Increase Your Score</p>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {[
                  "Take on leadership roles in projects",
                  "Log volunteer hours consistently",
                  "Contribute specialized skills (pro bono)"
                ].map((tip, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400 flex-shrink-0" />
                    <p className="text-xs text-slate-400">{tip}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Why Impact Score Matters - Compact Footer */}
          <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-3 border border-cyan-100">
            <p className="text-xs font-semibold text-cyan-800 mb-1.5">Why Impact Score Matters</p>
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

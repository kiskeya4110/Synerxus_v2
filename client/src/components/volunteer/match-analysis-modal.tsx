import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Sparkles, Target, MapPin, Clock, Award, Heart, TrendingUp, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { SDG_GOALS } from "@shared/sdg-goals";

interface MatchAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: number;
  opportunityId?: number;
  projectName: string;
}

const SDG_COLORS: { [key: number]: string } = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A"
};

const SDG_NAMES: { [key: number]: string } = {
  1: "No Poverty", 2: "Zero Hunger", 3: "Good Health", 4: "Quality Education",
  5: "Gender Equality", 6: "Clean Water", 7: "Clean Energy", 8: "Decent Work",
  9: "Industry Innovation", 10: "Reduced Inequalities", 11: "Sustainable Cities",
  12: "Responsible Consumption", 13: "Climate Action", 14: "Life Below Water",
  15: "Life on Land", 16: "Peace and Justice", 17: "Partnerships"
};

function CompactScoreBar({ score, label, color }: { score: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-600 w-16 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-[10px] font-semibold w-8 text-right" style={{ color }}>{score}%</span>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2.5 py-2 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-slate-600" />
          <span className="font-medium text-xs text-slate-800">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
      </button>
      {isOpen && <div className="px-2.5 py-2 bg-white">{children}</div>}
    </div>
  );
}

export default function MatchAnalysisModal({ isOpen, onClose, projectId, opportunityId, projectName }: MatchAnalysisModalProps) {
  const userId = localStorage.getItem('currentUserId');
  const itemId = projectId || opportunityId;
  const itemType = projectId ? 'projects' : 'opportunities';

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: [`/api/${itemType}`, itemId, 'match-analysis', userId],
    queryFn: async () => {
      const response = await fetch(`/api/${itemType}/${itemId}/match-analysis?userId=${userId}`);
      if (!response.ok) throw new Error('Failed to fetch match analysis');
      return response.json();
    },
    enabled: isOpen && !!itemId && !!userId,
  });

  if (!isOpen) return null;

  const getMatchCategoryInfo = (category: string) => {
    switch (category) {
      case 'nexus':
        return { label: 'Nexus Match', color: '#10b981', description: 'Perfect fit - you are an ideal candidate!' };
      case 'strong':
        return { label: 'Strong Match', color: '#3b82f6', description: 'Excellent alignment with your profile' };
      case 'gap':
        return { label: 'Promising Match', color: '#f59e0b', description: 'Good potential with some gaps to bridge' };
      default:
        return { label: 'Exploring', color: '#6b7280', description: 'Consider other opportunities too' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#3b82f6';
    if (score >= 40) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center pb-20 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[80vh] sm:max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300 mb-[env(safe-area-inset-bottom)]">
        {/* Header - Compact */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2.5">
          <button
            onClick={onClose}
            className="absolute right-2 top-2 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">AI Match Analysis</h2>
              <p className="text-[10px] text-white/80 truncate max-w-[220px]">{projectName}</p>
            </div>
          </div>
        </div>

        {/* Content - Compact */}
        <div className="overflow-y-auto max-h-[calc(80vh-60px)] sm:max-h-[calc(90vh-60px)] p-3 pb-4 space-y-2.5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-3" />
              <p className="text-slate-600 text-sm">Analyzing your match...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
              <p className="text-slate-600 text-sm">Failed to load analysis</p>
            </div>
          ) : analysis ? (
            <>
              {/* Overall Score - Compact Horizontal Layout */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl p-3 flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <svg className="w-16 h-16 transform -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="#e2e8f0" strokeWidth="5" />
                    <circle
                      cx="32" cy="32" r="26" fill="none"
                      stroke={getScoreColor(analysis.score)}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={`${(analysis.score / 100) * 163.4} 163.4`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold" style={{ color: getScoreColor(analysis.score) }}>{analysis.score}%</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-white text-[10px] font-medium mb-1"
                    style={{ backgroundColor: getMatchCategoryInfo(analysis.matchCategory).color }}
                  >
                    <CheckCircle className="w-3 h-3" />
                    {getMatchCategoryInfo(analysis.matchCategory).label}
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">{getMatchCategoryInfo(analysis.matchCategory).description}</p>
                </div>
              </div>

              {/* Score Breakdown - Compact Grid */}
              <div className="bg-slate-50 rounded-xl p-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="font-semibold text-xs text-slate-800">Score Breakdown</span>
                </div>
                <CompactScoreBar score={analysis.breakdown.skillMatch} label="Skills" color="#8b5cf6" />
                <CompactScoreBar score={analysis.breakdown.sdgMatch} label="SDG Align" color="#10b981" />
                <CompactScoreBar score={analysis.breakdown.availabilityMatch} label="Availability" color="#3b82f6" />
                <CompactScoreBar score={analysis.breakdown.interestMatch} label="Interest" color="#f59e0b" />
                <CompactScoreBar score={analysis.breakdown.locationMatch} label="Location" color="#ec4899" />
                <CompactScoreBar score={analysis.breakdown.experienceMatch} label="Experience" color="#6366f1" />
                {analysis.breakdown.engagementBoost > 0 && (
                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200">
                    <span className="text-emerald-600 font-medium">Engagement Bonus</span>
                    <span className="text-emerald-600 font-semibold">+{analysis.breakdown.engagementBoost} pts</span>
                  </div>
                )}
              </div>

              {/* Detailed Insights - Compact */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span className="font-semibold text-xs text-slate-800">Detailed Insights</span>
                </div>

                {/* Skills Analysis */}
                <CollapsibleSection title="Skills Analysis" icon={Award} defaultOpen={false}>
                  <div className="space-y-2">
                    {analysis.details.skills.matchingRequired.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-emerald-600 mb-1">Matching Required</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.details.skills.matchingRequired.slice(0, 4).map((skill: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">{skill}</span>
                          ))}
                          {analysis.details.skills.matchingRequired.length > 4 && (
                            <span className="text-[10px] text-slate-500">+{analysis.details.skills.matchingRequired.length - 4} more</span>
                          )}
                        </div>
                      </div>
                    )}
                    {analysis.details.skills.missingRequired.length > 0 && (
                      <div>
                        <p className="text-[10px] font-medium text-amber-600 mb-1">Skills to Develop</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.details.skills.missingRequired.slice(0, 3).map((skill: string, i: number) => (
                            <span key={i} className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.details.skills.matchingRequired.length === 0 && analysis.details.skills.matchingOptional.length === 0 && (
                      <p className="text-[10px] text-slate-500">No specific skill requirements</p>
                    )}
                  </div>
                </CollapsibleSection>

                {/* SDG Alignment */}
                <CollapsibleSection title="SDG Alignment" icon={Target}>
                  <div className="space-y-1.5">
                    {analysis.details.sdg.matchingSdgs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {analysis.details.sdg.matchingSdgs.slice(0, 4).map((sdg: number) => (
                          <div
                            key={sdg}
                            className="px-1.5 py-0.5 rounded text-white text-[10px] font-medium"
                            style={{ backgroundColor: SDG_COLORS[sdg] }}
                          >
                            {sdg}. {SDG_NAMES[sdg]}
                          </div>
                        ))}
                      </div>
                    )}
                    {analysis.details.sdg.primarySdgMatch && (
                      <div className="flex items-center gap-1 text-[10px] text-emerald-700">
                        <CheckCircle className="w-3 h-3" />
                        Primary SDG match! (1.2x bonus)
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {/* Availability & Location - Combined */}
                <CollapsibleSection title="Availability & Location" icon={Clock}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <p className="text-[9px] text-slate-500">You</p>
                      <p className="font-semibold text-slate-800 text-xs">{analysis.details.availability.volunteerHoursPerWeek || 0}h/wk</p>
                    </div>
                    <div className="p-1.5 bg-slate-50 rounded-lg">
                      <p className="text-[9px] text-slate-500">Needed</p>
                      <p className="font-semibold text-slate-800 text-xs">{analysis.details.availability.projectHoursPerWeek || 0}h/wk</p>
                    </div>
                    <div className="col-span-2 flex items-center gap-1 text-[10px]">
                      {analysis.details.location.matchType === 'remote' && (
                        <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-emerald-700">Remote work available</span></>
                      )}
                      {analysis.details.location.matchType === 'exact' && (
                        <><CheckCircle className="w-3 h-3 text-emerald-500" /><span className="text-emerald-700">Location match</span></>
                      )}
                      {analysis.details.location.matchType === 'same_region' && (
                        <><CheckCircle className="w-3 h-3 text-blue-500" /><span className="text-blue-700">Same region</span></>
                      )}
                      {analysis.details.location.matchType === 'different' && (
                        <span className="text-slate-600">Different location</span>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>
              </div>

              {/* AI Reasons Summary - Compact */}
              {analysis.reasons && analysis.reasons.length > 0 && (
                <div className="p-2 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-100">
                  <div className="flex items-center gap-1 mb-1.5">
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span className="font-semibold text-purple-800 text-[10px]">AI Summary</span>
                  </div>
                  <ul className="space-y-0.5">
                    {analysis.reasons.slice(0, 4).map((reason: string, i: number) => (
                      <li key={i} className="text-[10px] text-purple-700 flex items-start gap-1">
                        <span className="text-purple-400">•</span>
                        <span className="leading-tight">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Quality Warnings - Compact */}
              {analysis.dataQualityWarnings && analysis.dataQualityWarnings.length > 0 && (
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-[10px] font-medium text-amber-700 mb-1">Tips to improve match:</p>
                  <ul className="space-y-0.5">
                    {analysis.dataQualityWarnings.slice(0, 2).map((warning: string, i: number) => (
                      <li key={i} className="text-[10px] text-amber-600 leading-tight">• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

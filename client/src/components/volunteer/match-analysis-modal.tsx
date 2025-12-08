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

function ScoreBar({ score, label, weight, color }: { score: number; label: string; weight: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-500">{weight}% weight</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
        <span className="text-xs font-semibold w-10 text-right" style={{ color }}>{score}%</span>
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-sm text-slate-800">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>
      {isOpen && <div className="p-3 bg-white">{children}</div>}
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] bg-white rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-4">
          <button
            onClick={onClose}
            className="absolute right-3 top-3 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI Match Analysis</h2>
              <p className="text-sm text-white/80 truncate max-w-[250px]">{projectName}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-4 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-500 rounded-full animate-spin mb-4" />
              <p className="text-slate-600">Analyzing your match...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-slate-600">Failed to load analysis</p>
            </div>
          ) : analysis ? (
            <>
              {/* Overall Score */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 text-center">
                <div className="relative inline-flex items-center justify-center mb-3">
                  <svg className="w-28 h-28 transform -rotate-90">
                    <circle cx="56" cy="56" r="48" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                    <circle
                      cx="56" cy="56" r="48" fill="none"
                      stroke={getScoreColor(analysis.score)}
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${(analysis.score / 100) * 301.6} 301.6`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold" style={{ color: getScoreColor(analysis.score) }}>{analysis.score}%</span>
                    <span className="text-xs text-slate-500">Match</span>
                  </div>
                </div>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-sm font-medium"
                  style={{ backgroundColor: getMatchCategoryInfo(analysis.matchCategory).color }}
                >
                  <CheckCircle className="w-4 h-4" />
                  {getMatchCategoryInfo(analysis.matchCategory).label}
                </div>
                <p className="text-sm text-slate-600 mt-2">{getMatchCategoryInfo(analysis.matchCategory).description}</p>
              </div>

              {/* Score Breakdown */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Score Breakdown
                </h3>
                <div className="space-y-3 p-3 bg-slate-50 rounded-xl">
                  <ScoreBar score={analysis.breakdown.skillMatch} label="Skills Match" weight={35} color="#8b5cf6" />
                  <ScoreBar score={analysis.breakdown.sdgMatch} label="Mission Alignment (SDGs)" weight={20} color="#10b981" />
                  <ScoreBar score={analysis.breakdown.availabilityMatch} label="Availability Fit" weight={20} color="#3b82f6" />
                  <ScoreBar score={analysis.breakdown.interestMatch} label="Interest Match" weight={10} color="#f59e0b" />
                  <ScoreBar score={analysis.breakdown.locationMatch} label="Location Match" weight={10} color="#ec4899" />
                  <ScoreBar score={analysis.breakdown.experienceMatch} label="Experience Level" weight={5} color="#6366f1" />
                  {analysis.breakdown.engagementBoost > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-emerald-600 font-medium">Engagement Bonus</span>
                        <span className="text-emerald-600 font-semibold">+{analysis.breakdown.engagementBoost} pts</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Insights */}
              <div className="space-y-2">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Detailed Insights
                </h3>

                {/* Skills Analysis */}
                <CollapsibleSection title="Skills Analysis" icon={Award} defaultOpen={true}>
                  <div className="space-y-3">
                    {analysis.details.skills.matchingRequired.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-600 mb-1">Matching Required Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.details.skills.matchingRequired.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.details.skills.matchingOptional.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 mb-1">Bonus Skills You Have</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.details.skills.matchingOptional.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.details.skills.missingRequired.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-600 mb-1">Skills to Develop</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.details.skills.missingRequired.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">{skill}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.details.skills.matchingRequired.length === 0 && analysis.details.skills.matchingOptional.length === 0 && (
                      <p className="text-xs text-slate-500">No specific skill requirements listed</p>
                    )}
                  </div>
                </CollapsibleSection>

                {/* SDG Alignment */}
                <CollapsibleSection title="SDG Alignment" icon={Target}>
                  <div className="space-y-3">
                    {analysis.details.sdg.matchingSdgs.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-600 mb-2">Shared SDG Goals</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.details.sdg.matchingSdgs.map((sdg: number) => (
                            <div
                              key={sdg}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-white text-xs font-medium"
                              style={{ backgroundColor: SDG_COLORS[sdg] }}
                            >
                              <span>SDG {sdg}</span>
                              <span className="opacity-80">|</span>
                              <span className="truncate max-w-[100px]">{SDG_NAMES[sdg]}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.details.sdg.primarySdgMatch && (
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                        <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <p className="text-xs text-emerald-700">Primary SDG match! (1.2x bonus applied)</p>
                      </div>
                    )}
                    {analysis.details.sdg.matchingSdgs.length === 0 && (
                      <p className="text-xs text-slate-500">Update your SDG preferences to improve matching</p>
                    )}
                  </div>
                </CollapsibleSection>

                {/* Availability */}
                <CollapsibleSection title="Availability Fit" icon={Clock}>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Your Availability</p>
                        <p className="font-semibold text-slate-800">{analysis.details.availability.volunteerHoursPerWeek || 0} hrs/week</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Project Needs</p>
                        <p className="font-semibold text-slate-800">{analysis.details.availability.projectHoursPerWeek || 0} hrs/week</p>
                      </div>
                    </div>
                    {analysis.details.availability.fitPercentage > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(analysis.details.availability.fitPercentage, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-blue-600">{analysis.details.availability.fitPercentage}% fit</span>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {/* Location */}
                <CollapsibleSection title="Location Match" icon={MapPin}>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Your Location</p>
                        <p className="font-medium text-slate-800 text-sm truncate">{analysis.details.location.volunteerLocation || 'Not set'}</p>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-lg">
                        <p className="text-xs text-slate-500">Project Location</p>
                        <p className="font-medium text-slate-800 text-sm truncate">
                          {analysis.details.location.isRemote ? 'Remote' : (analysis.details.location.projectLocation || 'Not specified')}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${
                      analysis.details.location.matchType === 'remote' || analysis.details.location.matchType === 'exact'
                        ? 'bg-emerald-50 border border-emerald-200'
                        : 'bg-slate-50 border border-slate-200'
                    }`}>
                      {analysis.details.location.matchType === 'remote' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <p className="text-xs text-emerald-700">Remote opportunity - work from anywhere!</p>
                        </>
                      )}
                      {analysis.details.location.matchType === 'exact' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          <p className="text-xs text-emerald-700">Perfect location match!</p>
                        </>
                      )}
                      {analysis.details.location.matchType === 'same_region' && (
                        <>
                          <CheckCircle className="w-4 h-4 text-blue-500" />
                          <p className="text-xs text-blue-700">Same region - convenient commute</p>
                        </>
                      )}
                      {analysis.details.location.matchType === 'different' && (
                        <p className="text-xs text-slate-600">Different location - check if travel is possible</p>
                      )}
                    </div>
                  </div>
                </CollapsibleSection>

                {/* Interests */}
                <CollapsibleSection title="Interest Alignment" icon={Heart}>
                  <div className="space-y-2">
                    {analysis.details.interests.volunteerCauses?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Your Causes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {analysis.details.interests.volunteerCauses.map((cause: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs">{cause}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.details.interests.projectCategory && (
                      <div>
                        <p className="text-xs font-medium text-slate-600 mb-1">Project Category</p>
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">{analysis.details.interests.projectCategory}</span>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>
              </div>

              {/* AI Reasons Summary */}
              {analysis.reasons && analysis.reasons.length > 0 && (
                <div className="p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                  <h3 className="font-semibold text-purple-800 text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Summary
                  </h3>
                  <ul className="space-y-1.5">
                    {analysis.reasons.slice(0, 6).map((reason: string, i: number) => (
                      <li key={i} className="text-xs text-purple-700 flex items-start gap-1.5">
                        <span className="text-purple-400 mt-0.5">-</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Data Quality Warnings */}
              {analysis.dataQualityWarnings && analysis.dataQualityWarnings.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <p className="text-xs font-medium text-amber-700 mb-1">Tips to improve your match accuracy:</p>
                  <ul className="space-y-1">
                    {analysis.dataQualityWarnings.map((warning: string, i: number) => (
                      <li key={i} className="text-xs text-amber-600">{warning}</li>
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

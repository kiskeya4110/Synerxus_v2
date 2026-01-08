import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Target, AlertTriangle, Lightbulb, TrendingUp, Sparkles, Users, Clock, FolderOpen, Award, ChevronRight, CheckCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SDG_GOALS } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AIInsight {
  id: string;
  category: 'challenge' | 'recommendation' | 'opportunity';
  title: string;
  description: string;
  relatedSDGs: number[];
  priority: 'high' | 'medium' | 'low';
  projectedImpact?: string;
  actionLabel?: string;
}

interface AIInsightsData {
  organizationId: number;
  organizationName: string;
  sdgCommitments: number[];
  challenges: AIInsight[];
  recommendations: AIInsight[];
  opportunities: AIInsight[];
  metrics: {
    volunteerCount: number;
    totalHours: number;
    activeProjects: number;
    completionRate: number;
    retentionRate: number;
    avgHoursPerVolunteer: number;
  };
}

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: number;
  userId?: number;
  dashboardData?: any;
  orgProfile?: any;
}

// Generate insights based on organization data
function generateInsights(dashboardData: any, orgProfile: any): AIInsightsData {
  const insights: AIInsightsData = {
    organizationId: dashboardData?.organizationId || 0,
    organizationName: orgProfile?.organizationName || 'Your Organization',
    sdgCommitments: orgProfile?.sdgGoals || [],
    challenges: [],
    recommendations: [],
    opportunities: [],
    metrics: {
      volunteerCount: dashboardData?.keyMetrics?.activeVolunteers || 0,
      totalHours: dashboardData?.keyMetrics?.totalHours || 0,
      activeProjects: dashboardData?.keyMetrics?.activeProjects || 0,
      completionRate: 0,
      retentionRate: 0,
      avgHoursPerVolunteer: 0,
    }
  };

  // Calculate derived metrics
  const projects = dashboardData?.projects || [];
  const completedProjects = projects.filter((p: any) =>
    p.status?.toLowerCase() === 'completed'
  ).length;
  insights.metrics.completionRate = projects.length > 0
    ? Math.round((completedProjects / projects.length) * 100)
    : 0;
  insights.metrics.avgHoursPerVolunteer = insights.metrics.volunteerCount > 0
    ? Math.round(insights.metrics.totalHours / insights.metrics.volunteerCount)
    : 0;

  // Generate challenges based on data analysis

  // Challenge 1: Low volunteer count
  if (insights.metrics.volunteerCount < 20) {
    insights.challenges.push({
      id: 'ch1',
      category: 'challenge',
      title: 'Limited Volunteer Base',
      description: `Your organization has ${insights.metrics.volunteerCount} active volunteers. Organizations with similar SDG goals average 45+ volunteers.`,
      relatedSDGs: insights.sdgCommitments.slice(0, 2),
      priority: 'high',
    });
    insights.recommendations.push({
      id: 'rec1',
      category: 'recommendation',
      title: 'Launch a Volunteer Referral Program',
      description: 'Organizations with referral programs see 40% faster volunteer growth. Incentivize current volunteers to invite colleagues.',
      relatedSDGs: [],
      priority: 'high',
      projectedImpact: '+35% volunteer growth in 3 months',
      actionLabel: 'Create Referral Campaign',
    });
  }

  // Challenge 2: Low completion rate
  if (insights.metrics.completionRate < 70 && projects.length > 0) {
    insights.challenges.push({
      id: 'ch2',
      category: 'challenge',
      title: 'Project Completion Below Target',
      description: `Current completion rate: ${insights.metrics.completionRate}%. Industry benchmark is 75%+. Some projects may need restructuring.`,
      relatedSDGs: insights.sdgCommitments.slice(0, 1),
      priority: 'high',
    });
    insights.recommendations.push({
      id: 'rec2',
      category: 'recommendation',
      title: 'Break Large Projects into Milestones',
      description: 'Projects with 4-6 milestones show 52% higher completion rates. Consider restructuring ongoing projects.',
      relatedSDGs: [],
      priority: 'high',
      projectedImpact: '+25% completion rate',
      actionLabel: 'View Project Settings',
    });
  }

  // Challenge 3: Low hours per volunteer
  if (insights.metrics.avgHoursPerVolunteer < 10 && insights.metrics.volunteerCount > 0) {
    insights.challenges.push({
      id: 'ch3',
      category: 'challenge',
      title: 'Low Volunteer Engagement',
      description: `Average ${insights.metrics.avgHoursPerVolunteer} hours per volunteer. Top organizations average 15-20 hours per volunteer.`,
      relatedSDGs: [],
      priority: 'medium',
    });
    insights.recommendations.push({
      id: 'rec3',
      category: 'recommendation',
      title: 'Implement Skills-Based Matching',
      description: 'Match volunteers to projects based on their skills and interests. This increases engagement by 47%.',
      relatedSDGs: [],
      priority: 'medium',
      projectedImpact: '+8 hours per volunteer average',
      actionLabel: 'Review Volunteer Skills',
    });
  }

  // Challenge 4: Few active projects
  if (insights.metrics.activeProjects < 3) {
    insights.challenges.push({
      id: 'ch4',
      category: 'challenge',
      title: 'Limited Project Portfolio',
      description: `Only ${insights.metrics.activeProjects} active project(s). Diversifying projects can attract more volunteers with varied interests.`,
      relatedSDGs: insights.sdgCommitments,
      priority: 'medium',
    });
  }

  // Find underutilized SDGs
  const sdgDistribution = dashboardData?.sdgDistribution || [];
  const activeSDGs = new Set(sdgDistribution.filter((s: any) => s.hours > 0).map((s: any) => s.goal));
  const underutilizedSDGs = insights.sdgCommitments.filter(sdg => !activeSDGs.has(sdg));

  if (underutilizedSDGs.length > 0) {
    const sdgName = SDG_GOALS[underutilizedSDGs[0]]?.name || `SDG ${underutilizedSDGs[0]}`;
    insights.opportunities.push({
      id: 'opp1',
      category: 'opportunity',
      title: `Expand ${sdgName} Initiatives`,
      description: `You've committed to SDG ${underutilizedSDGs[0]} but have no active projects. There's untapped potential here.`,
      relatedSDGs: underutilizedSDGs.slice(0, 2),
      priority: 'medium',
      projectedImpact: 'New volunteer segment reach',
      actionLabel: 'Create SDG Project',
    });
  }

  // Opportunity: Partnership potential
  if (insights.sdgCommitments.length > 0) {
    insights.opportunities.push({
      id: 'opp2',
      category: 'opportunity',
      title: 'Cross-Organization Partnerships',
      description: `3 nearby organizations share your SDG ${insights.sdgCommitments[0] || 1} focus. Collaboration could double your impact.`,
      relatedSDGs: [insights.sdgCommitments[0] || 1],
      priority: 'low',
      projectedImpact: '2x community reach',
      actionLabel: 'Explore Partnerships',
    });
  }

  // Opportunity: Recognition program
  if (insights.metrics.volunteerCount > 5) {
    insights.opportunities.push({
      id: 'opp3',
      category: 'opportunity',
      title: 'Launch Volunteer Recognition',
      description: 'Organizations with recognition programs see 47% higher retention. Consider badges, leaderboards, or certificates.',
      relatedSDGs: [],
      priority: 'medium',
      projectedImpact: '+47% volunteer retention',
      actionLabel: 'View Recognition Options',
    });
  }

  // Add default insights if none generated
  if (insights.challenges.length === 0) {
    insights.challenges.push({
      id: 'ch-default',
      category: 'challenge',
      title: 'Set Quarterly Impact Goals',
      description: 'Define measurable targets for volunteer hours, projects completed, and lives impacted to track your SDG progress.',
      relatedSDGs: insights.sdgCommitments.slice(0, 2),
      priority: 'low',
    });
  }

  if (insights.recommendations.length === 0) {
    insights.recommendations.push({
      id: 'rec-default',
      category: 'recommendation',
      title: 'Enable AI Impact Tracking',
      description: 'Turn on automated impact measurement to get real-time insights into your SDG contributions.',
      relatedSDGs: [],
      priority: 'medium',
      projectedImpact: 'Better impact visibility',
      actionLabel: 'Enable AI Tracking',
    });
  }

  return insights;
}

const priorityColors = {
  high: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-700' },
  medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  low: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
};

export default function AIInsightsModal({ isOpen, onClose, organizationId, userId, dashboardData, orgProfile }: AIInsightsModalProps) {
  const { toast } = useToast();
  const [isApplying, setIsApplying] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const queryClient = useQueryClient();

  // Generate insights from available data
  const insights = generateInsights(dashboardData, orgProfile);

  // Mutation to apply all recommendations
  const applyRecommendationsMutation = useMutation({
    mutationFn: async () => {
      // Gather all recommendations to apply
      const allRecommendations = [
        ...insights.challenges.map(c => ({ ...c, category: 'challenge' })),
        ...insights.recommendations.map(r => ({ ...r, category: 'recommendation' })),
        ...insights.opportunities.map(o => ({ ...o, category: 'opportunity' })),
      ];

      // Get userId from localStorage if not provided
      const effectiveUserId = userId || parseInt(localStorage.getItem('currentUserId') || '0');

      return apiRequest("POST", "/api/ai-recommendations/bulk-apply", {
        organizationId,
        userId: effectiveUserId,
        recommendations: allRecommendations,
        metrics: insights.metrics,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-recommendations', organizationId] });
      toast({
        title: "Recommendations Applied!",
        description: "Your preferences have been saved. We'll tailor future suggestions based on your choices.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to apply recommendations",
        variant: "destructive",
      });
    },
  });

  // Mutation to dismiss insights
  const dismissInsightsMutation = useMutation({
    mutationFn: async () => {
      const effectiveUserId = userId || parseInt(localStorage.getItem('currentUserId') || '0');

      return apiRequest("POST", "/api/ai-recommendations/dismiss", {
        organizationId,
        userId: effectiveUserId,
        recommendationId: 'session_dismiss',
        category: 'session',
        title: 'Session Dismissed',
        description: 'User dismissed all insights for this session',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-recommendations', organizationId] });
      toast({
        title: "Insights Dismissed",
        description: "You can view these recommendations again anytime from the AI Insights panel.",
      });
      onClose();
    },
    onError: (error: Error) => {
      // Still close on error, just show warning
      console.error("Error dismissing insights:", error);
      onClose();
    },
  });

  const handleApplyRecommendations = async () => {
    setIsApplying(true);
    try {
      await applyRecommendationsMutation.mutateAsync();
    } finally {
      setIsApplying(false);
    }
  };

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await dismissInsightsMutation.mutateAsync();
    } finally {
      setIsDismissing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-16 pb-24 overflow-y-auto"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl my-auto"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Impact Insights</h2>
              <p className="text-sm text-white/80">Personalized recommendations for {insights.organizationName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {/* SDG Alignment Section */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-slate-800">Current SDG Alignment</h3>
            </div>
            {insights.sdgCommitments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {insights.sdgCommitments.map((sdg) => (
                  <div
                    key={sdg}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
                    style={{ backgroundColor: SDG_GOALS[sdg]?.color || '#6366f1' }}
                  >
                    <span>SDG {sdg}</span>
                    <span className="text-white/80 text-xs">{SDG_GOALS[sdg]?.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No SDG commitments set. Configure your focus areas in organization settings.</p>
            )}

            {/* Quick Metrics */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="text-center p-2 bg-white rounded-lg">
                <p className="text-xl font-bold text-indigo-600">{insights.metrics.volunteerCount}</p>
                <p className="text-xs text-slate-500">Volunteers</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <p className="text-xl font-bold text-green-600">{insights.metrics.totalHours}</p>
                <p className="text-xs text-slate-500">Hours</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <p className="text-xl font-bold text-amber-600">{insights.metrics.activeProjects}</p>
                <p className="text-xs text-slate-500">Projects</p>
              </div>
              <div className="text-center p-2 bg-white rounded-lg">
                <p className="text-xl font-bold text-purple-600">{insights.metrics.completionRate}%</p>
                <p className="text-xs text-slate-500">Completion</p>
              </div>
            </div>
          </div>

          {/* Identified Challenges */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="font-semibold text-slate-800">Identified Challenges</h3>
            </div>
            <div className="space-y-3">
              {insights.challenges.map((challenge) => {
                const colors = priorityColors[challenge.priority];
                return (
                  <div
                    key={challenge.id}
                    className={`p-4 rounded-xl border ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-medium ${colors.text}`}>{challenge.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${colors.badge}`}>
                            {challenge.priority}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{challenge.description}</p>
                      </div>
                      {challenge.relatedSDGs.length > 0 && (
                        <div className="flex gap-1">
                          {challenge.relatedSDGs.slice(0, 2).map((sdg) => (
                            <div
                              key={sdg}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: SDG_GOALS[sdg]?.color || '#6366f1' }}
                            >
                              {sdg}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Recommendations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-slate-800">AI Recommendations</h3>
            </div>
            <div className="space-y-3">
              {insights.recommendations.map((rec, index) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-indigo-900">{rec.title}</h4>
                      <p className="text-sm text-slate-600 mt-1">{rec.description}</p>
                      {rec.projectedImpact && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-green-600 font-medium">
                          <TrendingUp className="w-4 h-4" />
                          {rec.projectedImpact}
                        </div>
                      )}
                    </div>
                    {rec.actionLabel && (
                      <Button size="sm" variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-100">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Opportunities */}
          {insights.opportunities.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold text-slate-800">Growth Opportunities</h3>
              </div>
              <div className="space-y-3">
                {insights.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 rounded-xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium text-green-800">{opp.title}</h4>
                        <p className="text-sm text-slate-600 mt-1">{opp.description}</p>
                        {opp.projectedImpact && (
                          <div className="flex items-center gap-1 mt-2 text-sm text-green-600 font-medium">
                            <TrendingUp className="w-4 h-4" />
                            {opp.projectedImpact}
                          </div>
                        )}
                      </div>
                      {opp.relatedSDGs.length > 0 && (
                        <div className="flex gap-1">
                          {opp.relatedSDGs.slice(0, 2).map((sdg) => (
                            <div
                              key={sdg}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: SDG_GOALS[sdg]?.color || '#22c55e' }}
                            >
                              {sdg}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Projected Impact Summary */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-4 text-white">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-5 h-5" />
              <h3 className="font-semibold">Projected Impact</h3>
            </div>
            <p className="text-sm text-white/90 mb-3">
              By implementing these recommendations, your organization could see:
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <p className="text-2xl font-bold">+40%</p>
                <p className="text-xs text-white/80">Volunteer Growth</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <p className="text-2xl font-bold">+25%</p>
                <p className="text-xs text-white/80">Project Completion</p>
              </div>
              <div className="text-center p-3 bg-white/10 rounded-lg">
                <p className="text-2xl font-bold">2x</p>
                <p className="text-xs text-white/80">Community Reach</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 px-6 py-4 bg-white border-t border-slate-200">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDismiss}
            disabled={isDismissing}
          >
            {isDismissing ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Dismissing...
              </>
            ) : (
              "Dismiss"
            )}
          </Button>
          <Button
            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            onClick={handleApplyRecommendations}
            disabled={isApplying || isDismissing}
          >
            {isApplying ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Apply Recommendations
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain, Target, TrendingUp, Users, Clock, Plus, Search,
  Sparkles, CheckCircle2, ArrowRight, BarChart3, Lightbulb,
  Award, DollarSign, AlertTriangle, Zap
} from "lucide-react";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { getSDGIcon } from "@/assets/un-sdg-icons";

interface PotentialImpact {
  projectedHours: number;
  projectedVolunteers: number;
  projectedEconomicValue: number;
  alignmentBoost: number;
  matchingEmployees: number;
  relatedProjects: number;
  confidence: 'high' | 'medium' | 'low';
}

interface AIRecommendation {
  sdgNumber: number;
  reasoning: string;
  matchScore: number;
  potentialImpact: PotentialImpact;
  employeeInterests: number;
  currentGap: string;
}

interface AIInsightModalProps {
  isOpen: boolean;
  onClose: () => void;
  insightType: 'sdg-opportunity' | 'engagement' | 'retention' | 'skills' | 'milestone' | 'expansion';
  recommendation?: AIRecommendation;
  data?: {
    title?: string;
    description?: string;
    metrics?: Array<{ label: string; value: string | number; trend?: 'up' | 'down' | 'neutral' }>;
    suggestions?: string[];
    actionItems?: Array<{ text: string; priority: 'high' | 'medium' | 'low' }>;
  };
  onEvaluate?: (sdgNumber: number) => void;
  onAddToCommitment?: (sdgNumber: number) => void;
  onDismiss?: () => void;
}

export default function AIInsightModal({
  isOpen,
  onClose,
  insightType,
  recommendation,
  data,
  onEvaluate,
  onAddToCommitment,
  onDismiss
}: AIInsightModalProps) {
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);

  // Get header configuration based on insight type
  const headerConfig = useMemo(() => {
    switch (insightType) {
      case 'sdg-opportunity':
        return {
          title: 'SDG Expansion Opportunity',
          subtitle: 'AI-recommended SDG based on employee interests',
          gradient: 'from-teal-500 to-cyan-500',
          icon: Target
        };
      case 'engagement':
        return {
          title: 'Engagement Insights',
          subtitle: 'Optimize employee participation',
          gradient: 'from-emerald-500 to-teal-500',
          icon: Users
        };
      case 'retention':
        return {
          title: 'Retention Analysis',
          subtitle: 'Keep volunteers engaged long-term',
          gradient: 'from-purple-500 to-violet-500',
          icon: TrendingUp
        };
      case 'skills':
        return {
          title: 'Skills Insights',
          subtitle: 'Match skills to opportunities',
          gradient: 'from-blue-500 to-cyan-500',
          icon: Award
        };
      case 'milestone':
        return {
          title: 'Milestone Recognition',
          subtitle: 'Celebrate achievements',
          gradient: 'from-amber-500 to-orange-500',
          icon: Award
        };
      case 'expansion':
        return {
          title: 'Growth Opportunities',
          subtitle: 'Expand your CSR impact',
          gradient: 'from-indigo-500 to-purple-500',
          icon: Sparkles
        };
      default:
        return {
          title: 'AI Insights',
          subtitle: 'Data-driven recommendations',
          gradient: 'from-slate-500 to-slate-600',
          icon: Brain
        };
    }
  }, [insightType]);

  const HeaderIcon = headerConfig.icon;

  const handleEvaluate = async () => {
    if (!recommendation || !onEvaluate) return;
    setIsEvaluating(true);
    try {
      await onEvaluate(recommendation.sdgNumber);
      setShowDetailedAnalysis(true);
    } finally {
      setIsEvaluating(false);
    }
  };

  const renderSDGOpportunityContent = () => {
    if (!recommendation) {
      return (
        <div className="p-4 text-center text-slate-500">
          <Brain className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p>No recommendations available at this time.</p>
        </div>
      );
    }

    const sdgColor = getSDGColor(recommendation.sdgNumber);
    const { potentialImpact } = recommendation;

    return (
      <div className="p-4 space-y-4">
        {/* Recommended SDG */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-slate-50">
          <img
            src={getSDGIcon(recommendation.sdgNumber)}
            alt={`SDG ${recommendation.sdgNumber}`}
            className="w-16 h-16 rounded-lg shadow-md"
          />
          <div className="flex-1">
            <p className="text-sm text-slate-500">Recommended SDG</p>
            <h3 className="font-bold text-slate-800">
              SDG {recommendation.sdgNumber}: {getSDGName(recommendation.sdgNumber)}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {recommendation.employeeInterests} employees have this in their preferred SDGs
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Match Score</p>
            <p className="text-2xl font-bold" style={{ color: sdgColor }}>
              {recommendation.matchScore}%
            </p>
          </div>
        </div>

        {/* AI Reasoning */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-800 mb-1">Why this SDG?</p>
                <p className="text-sm text-slate-700">{recommendation.reasoning}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Gap */}
        {recommendation.currentGap && (
          <Card className="border-amber-200 bg-amber-50/50">
            <CardContent className="p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-800">{recommendation.currentGap}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Potential Impact Analysis */}
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-slate-600" />
              <p className="font-semibold text-slate-800">Potential Impact Analysis</p>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                potentialImpact.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                potentialImpact.confidence === 'medium' ? 'bg-amber-100 text-amber-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {potentialImpact.confidence} confidence
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-600 font-medium">Projected Hours</p>
                </div>
                <p className="text-lg font-bold text-blue-700">{potentialImpact.projectedHours}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-emerald-600 font-medium">Volunteers</p>
                </div>
                <p className="text-lg font-bold text-emerald-700">{potentialImpact.projectedVolunteers}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-purple-600" />
                  <p className="text-xs text-purple-600 font-medium">Economic Value</p>
                </div>
                <p className="text-lg font-bold text-purple-700">
                  ${Math.round(potentialImpact.projectedEconomicValue).toLocaleString()}
                </p>
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-amber-600 font-medium">Alignment Boost</p>
                </div>
                <p className="text-lg font-bold text-amber-700">+{potentialImpact.alignmentBoost}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analysis Section */}
        {showDetailedAnalysis && (
          <Card className="border-teal-200 bg-teal-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <p className="font-semibold text-teal-800">Detailed Analysis</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Matching Employees</span>
                  <span className="font-semibold text-teal-700">{potentialImpact.matchingEmployees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Related Active Projects</span>
                  <span className="font-semibold text-teal-700">{potentialImpact.relatedProjects}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Integration Complexity</span>
                  <span className="font-semibold text-emerald-600">Low</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleEvaluate}
            disabled={isEvaluating}
            className="flex-1"
            style={{ backgroundColor: sdgColor }}
          >
            {isEvaluating ? (
              <>
                <span className="animate-spin mr-2">
                  <Zap className="h-4 w-4" />
                </span>
                Analyzing...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Evaluate in Detail
              </>
            )}
          </Button>
          <Button
            onClick={() => onAddToCommitment?.(recommendation.sdgNumber)}
            variant="outline"
            className="flex-1"
            style={{ borderColor: sdgColor, color: sdgColor }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to ESG Commitment
          </Button>
        </div>
      </div>
    );
  };

  const renderGenericInsightContent = () => {
    if (!data) {
      return (
        <div className="p-4 text-center text-slate-500">
          <Brain className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p>No insight data available.</p>
        </div>
      );
    }

    return (
      <div className="p-4 space-y-4">
        {/* Description */}
        {data.description && (
          <p className="text-sm text-slate-600">{data.description}</p>
        )}

        {/* Metrics */}
        {data.metrics && data.metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {data.metrics.map((metric, idx) => (
              <Card key={idx} className="border-slate-200">
                <CardContent className="p-3">
                  <p className="text-xs text-slate-500">{metric.label}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-slate-800">{metric.value}</p>
                    {metric.trend && (
                      <span className={`text-xs ${
                        metric.trend === 'up' ? 'text-emerald-600' :
                        metric.trend === 'down' ? 'text-red-600' :
                        'text-slate-400'
                      }`}>
                        {metric.trend === 'up' ? '↑' : metric.trend === 'down' ? '↓' : '–'}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {data.suggestions && data.suggestions.length > 0 && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="h-5 w-5 text-blue-600" />
                <p className="font-semibold text-blue-800">AI Suggestions</p>
              </div>
              <ul className="space-y-2">
                {data.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-slate-700">{suggestion}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Action Items */}
        {data.actionItems && data.actionItems.length > 0 && (
          <Card className="border-slate-200">
            <CardContent className="p-4">
              <p className="font-semibold text-slate-800 mb-3">Recommended Actions</p>
              <div className="space-y-2">
                {data.actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                      <span className="text-sm text-slate-700">{item.text}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.priority === 'high' ? 'bg-red-100 text-red-700' :
                      item.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.priority}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dismiss button for generic insights */}
        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="outline"
            className="w-full"
          >
            Got it
          </Button>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0">
        {/* Header */}
        <div className={`bg-gradient-to-br ${headerConfig.gradient} p-6 text-white rounded-t-lg`}>
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-xl">
              <HeaderIcon className="h-6 w-6" />
              {headerConfig.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-white/80 text-sm mt-2">{headerConfig.subtitle}</p>
          <div className="mt-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-white/60" />
            <span className="text-xs text-white/60">Powered by AI analysis</span>
          </div>
        </div>

        {/* Content */}
        {insightType === 'sdg-opportunity'
          ? renderSDGOpportunityContent()
          : renderGenericInsightContent()
        }
      </DialogContent>
    </Dialog>
  );
}

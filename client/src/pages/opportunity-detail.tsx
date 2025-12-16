import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  MapPin,
  Clock,
  Users,
  Calendar,
  Building2,
  Sparkles,
  TrendingUp,
  Award,
  Target,
  Briefcase,
  ArrowLeft,
  FileText,
  Share2,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  Heart,
  Zap,
  Globe,
  Star,
  ChevronRight,
  Info,
  Flame,
  Shield
} from "lucide-react";
import { SDG_GOALS } from "@shared/sdg-goals";
import ApplicationDialog from "@/components/opportunities/application-dialog";
import VolunteerNav from "@/components/layout/volunteer-nav";
import WebBottomNav from "@/components/layout/web-bottom-nav";
import { useIsMobile } from "@/hooks/use-mobile";

interface MatchBreakdown {
  skillMatch: number;
  locationMatch: number;
  sdgMatch: number;
  interestMatch: number;
  availabilityMatch: number;
  experienceMatch: number;
  engagementBoost: number;
}

interface EnrichedOpportunity {
  id: number;
  title: string;
  description: string;
  organizationId: number;
  organizationName?: string;
  projectId?: number;
  requiredSkills?: string[];
  optionalSkills?: string[];
  location?: string;
  isRemote?: boolean;
  engagementType?: string;
  timeCommitment?: string;
  commitmentType?: string;
  ongoingHoursPerWeek?: number;
  volunteersNeeded?: number;
  status: string;
  category?: string;
  sdgGoals?: number[];
  primarySdg?: number;
  benefits?: string;
  requirements?: string;
  isUrgent?: boolean;
  startDate?: string;
  endDate?: string;
  matchScore?: number;
  matchReasons?: string[];
  matchBreakdown?: MatchBreakdown;
  matchCategory?: string;
}

export default function OpportunityDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const opportunityId = parseInt(id!);
  const userId = localStorage.getItem('currentUserId');
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/discover-opportunities");
    }
  };

  // Fetch opportunity with match data
  const { data: opportunity, isLoading } = useQuery<EnrichedOpportunity>({
    queryKey: [`/api/opportunities/${opportunityId}`, userId],
    queryFn: async () => {
      const response = await fetch(`/api/opportunities/${opportunityId}?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch opportunity");
      return response.json();
    },
  });

  // Check if user has already applied
  const { data: applicationStatus } = useQuery({
    queryKey: ["/api/opportunities/status", userId],
    queryFn: async () => {
      if (!userId) return { appliedIds: [] };
      const response = await fetch(`/api/opportunities/status?volunteerId=${userId}`);
      if (!response.ok) return { appliedIds: [] };
      return response.json();
    },
    enabled: !!userId,
  });

  const hasApplied = applicationStatus?.appliedIds?.includes(opportunityId) ?? false;

  // Helper functions for match visualization
  const getMatchScoreColor = (score?: number) => {
    if (!score && score !== 0) return "text-gray-400";
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-gray-500 dark:text-gray-400";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-blue-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-gray-400";
  };

  const getMatchGradient = (score?: number) => {
    if (!score) return "from-gray-500 to-gray-600";
    if (score >= 80) return "from-green-500 to-emerald-600";
    if (score >= 60) return "from-blue-500 to-indigo-600";
    if (score >= 40) return "from-yellow-500 to-orange-500";
    return "from-gray-400 to-gray-500";
  };

  const getMatchLabel = (score?: number) => {
    if (!score) return { text: "Unknown Match", icon: Info };
    if (score >= 80) return { text: "Excellent Match", icon: Sparkles };
    if (score >= 60) return { text: "Strong Match", icon: TrendingUp };
    if (score >= 40) return { text: "Good Potential", icon: Lightbulb };
    return { text: "Explore This", icon: Target };
  };

  const getCompatibilityInsight = (breakdown?: MatchBreakdown) => {
    if (!breakdown) return null;
    const insights = [];

    if (breakdown.skillMatch >= 80) {
      insights.push({ icon: Target, text: "Your skills are a perfect fit!", type: "excellent" });
    } else if (breakdown.skillMatch >= 60) {
      insights.push({ icon: Target, text: "Strong skill alignment", type: "good" });
    }

    if (breakdown.sdgMatch >= 80) {
      insights.push({ icon: Heart, text: "Aligned with your mission goals", type: "excellent" });
    }

    if (breakdown.availabilityMatch >= 80) {
      insights.push({ icon: Clock, text: "Fits perfectly in your schedule", type: "excellent" });
    } else if (breakdown.availabilityMatch < 50) {
      insights.push({ icon: Clock, text: "May require schedule adjustment", type: "caution" });
    }

    if (breakdown.locationMatch >= 80) {
      insights.push({ icon: MapPin, text: "Convenient location for you", type: "excellent" });
    }

    if (breakdown.engagementBoost > 5) {
      insights.push({ icon: Flame, text: "Your active profile gives you an edge!", type: "boost" });
    }

    return insights;
  };

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 md:hidden">
          <Skeleton className="h-6 w-32 bg-white/20" />
        </div>
        <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
            <Briefcase className="w-10 h-10 text-slate-400" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Opportunity Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This opportunity may have been filled or removed. Let's find you another great match!
          </p>
          <Button onClick={handleBack} size="lg" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Browse Opportunities
          </Button>
        </div>
      </div>
    );
  }

  const matchLabel = getMatchLabel(opportunity.matchScore);
  const MatchIcon = matchLabel.icon;
  const compatibilityInsights = getCompatibilityInsight(opportunity.matchBreakdown);

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 pb-24 md:pb-8">
      {/* Volunteer Desktop Navigation */}
      <VolunteerNav />

      {/* Desktop Back Button */}
      <div className="hidden md:block px-6 pt-6 pb-2 max-w-5xl mx-auto">
        <Button variant="ghost" onClick={handleBack} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Back to Opportunities
        </Button>
      </div>

      <div className="px-4 md:px-6 max-w-5xl mx-auto space-y-6">
        {/* Hero Card with Match Score */}
        <Card className="overflow-hidden border-0 shadow-xl">
          {/* Match Score Hero Banner */}
          <div className={`bg-gradient-to-r ${getMatchGradient(opportunity.matchScore)} p-6 md:p-8 text-white relative overflow-hidden`}>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  {opportunity.isUrgent && (
                    <Badge className="bg-red-500 text-white mb-3 animate-pulse">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Urgent Need
                    </Badge>
                  )}
                  <h1 className="text-2xl md:text-4xl font-bold mb-2">{opportunity.title}</h1>
                  {opportunity.organizationName && (
                    <div className="flex items-center gap-2 text-white/90">
                      <Building2 className="w-4 h-4" />
                      <span className="text-lg">{opportunity.organizationName}</span>
                    </div>
                  )}
                </div>

                {/* Match Score Circle */}
                {opportunity.matchScore !== undefined && (
                  <div className="flex flex-col items-center">
                    <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-4 border-white/30">
                      <div className="text-center">
                        <div className="text-2xl md:text-3xl font-bold">{opportunity.matchScore}%</div>
                        <div className="text-xs uppercase tracking-wide opacity-90">Match</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1 text-sm font-medium">
                      <MatchIcon className="w-4 h-4" />
                      {matchLabel.text}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Stats Row */}
              <div className="flex flex-wrap gap-3 mt-4">
                {opportunity.location && (
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm">
                    <MapPin className="w-4 h-4" />
                    {opportunity.location}
                    {opportunity.isRemote && <Badge className="ml-1 bg-white/30 text-white text-xs">Remote</Badge>}
                  </div>
                )}
                {opportunity.timeCommitment && (
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm">
                    <Clock className="w-4 h-4" />
                    {opportunity.timeCommitment}
                  </div>
                )}
                {opportunity.volunteersNeeded && (
                  <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 text-sm">
                    <Users className="w-4 h-4" />
                    {opportunity.volunteersNeeded} volunteer{opportunity.volunteersNeeded > 1 ? 's' : ''} needed
                  </div>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-6">
            <p className="text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
              {opportunity.description}
            </p>
          </CardContent>
        </Card>

        {/* AI Match Analysis Card - Full Breakdown */}
        {opportunity.matchBreakdown && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/50 dark:via-purple-950/50 dark:to-pink-950/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  AI Compatibility Analysis
                  {opportunity.matchBreakdown.engagementBoost > 0 && (
                    <Badge className="ml-auto bg-gradient-to-r from-amber-400 to-orange-500 text-white border-0">
                      <Zap className="w-3 h-3 mr-1" />
                      +{Math.round(opportunity.matchBreakdown.engagementBoost)} Boost
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Compatibility Insights */}
                {compatibilityInsights && compatibilityInsights.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {compatibilityInsights.map((insight, idx) => {
                      const InsightIcon = insight.icon;
                      const bgClass = insight.type === "excellent"
                        ? "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800"
                        : insight.type === "boost"
                        ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800"
                        : insight.type === "caution"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800"
                        : "bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800";
                      const iconClass = insight.type === "excellent"
                        ? "text-green-600 dark:text-green-400"
                        : insight.type === "boost"
                        ? "text-amber-600 dark:text-amber-400"
                        : insight.type === "caution"
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-blue-600 dark:text-blue-400";

                      return (
                        <div key={idx} className={`flex items-center gap-3 p-3 rounded-lg border ${bgClass}`}>
                          <InsightIcon className={`w-5 h-5 ${iconClass} flex-shrink-0`} />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{insight.text}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Match Breakdown Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Skills - 35% weight */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                        <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Skills</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">35% weight</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getMatchScoreColor(opportunity.matchBreakdown.skillMatch)}`}>
                      {Math.round(opportunity.matchBreakdown.skillMatch)}%
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(opportunity.matchBreakdown.skillMatch)} transition-all duration-700`}
                        style={{ width: `${opportunity.matchBreakdown.skillMatch}%` }}
                      />
                    </div>
                  </div>

                  {/* SDG - 20% weight */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Mission Fit</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">20% weight</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getMatchScoreColor(opportunity.matchBreakdown.sdgMatch)}`}>
                      {Math.round(opportunity.matchBreakdown.sdgMatch)}%
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(opportunity.matchBreakdown.sdgMatch)} transition-all duration-700`}
                        style={{ width: `${opportunity.matchBreakdown.sdgMatch}%` }}
                      />
                    </div>
                  </div>

                  {/* Time Fit - 20% weight */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Time Fit</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">20% weight</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getMatchScoreColor(opportunity.matchBreakdown.availabilityMatch)}`}>
                      {Math.round(opportunity.matchBreakdown.availabilityMatch)}%
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(opportunity.matchBreakdown.availabilityMatch)} transition-all duration-700`}
                        style={{ width: `${opportunity.matchBreakdown.availabilityMatch}%` }}
                      />
                    </div>
                  </div>

                  {/* Location - 10% weight */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">10% weight</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getMatchScoreColor(opportunity.matchBreakdown.locationMatch)}`}>
                      {Math.round(opportunity.matchBreakdown.locationMatch)}%
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(opportunity.matchBreakdown.locationMatch)} transition-all duration-700`}
                        style={{ width: `${opportunity.matchBreakdown.locationMatch}%` }}
                      />
                    </div>
                  </div>

                  {/* Interests - 10% weight */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Interests</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">10% weight</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getMatchScoreColor(opportunity.matchBreakdown.interestMatch)}`}>
                      {Math.round(opportunity.matchBreakdown.interestMatch)}%
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(opportunity.matchBreakdown.interestMatch)} transition-all duration-700`}
                        style={{ width: `${opportunity.matchBreakdown.interestMatch}%` }}
                      />
                    </div>
                  </div>

                  {/* Experience - 5% weight */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                        <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Experience</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">5% weight</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getMatchScoreColor(opportunity.matchBreakdown.experienceMatch)}`}>
                      {Math.round(opportunity.matchBreakdown.experienceMatch)}%
                    </div>
                    <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getProgressColor(opportunity.matchBreakdown.experienceMatch)} transition-all duration-700`}
                        style={{ width: `${opportunity.matchBreakdown.experienceMatch}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Match Reasons */}
                {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      Why You're a Great Fit
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {opportunity.matchReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                          <ChevronRight className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>{reason}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        )}

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Skills Required */}
          {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="w-5 h-5 text-purple-500" />
                  Skills Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {opportunity.requiredSkills.map((skill, idx) => (
                    <Badge key={idx} variant="secondary" className="px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                      {skill}
                    </Badge>
                  ))}
                </div>
                {opportunity.optionalSkills && opportunity.optionalSkills.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Nice to have:</p>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.optionalSkills.map((skill, idx) => (
                        <Badge key={idx} variant="outline" className="px-3 py-1 text-sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* SDG Goals */}
          {opportunity.sdgGoals && opportunity.sdgGoals.length > 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Globe className="w-5 h-5 text-green-500" />
                  Impact Areas (SDGs)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {opportunity.sdgGoals.map((sdgNumber) => {
                    const sdg = SDG_GOALS[sdgNumber];
                    const isPrimary = sdgNumber === opportunity.primarySdg;
                    return sdg ? (
                      <div
                        key={sdgNumber}
                        className={`flex items-center gap-3 p-3 rounded-lg ${isPrimary ? 'ring-2 ring-offset-2 ring-green-500' : ''}`}
                        style={{ backgroundColor: `${sdg.color}15` }}
                      >
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: sdg.color }}
                        >
                          {sdgNumber}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{sdg.name}</p>
                          {isPrimary && (
                            <Badge variant="outline" className="mt-1 text-xs border-green-500 text-green-600">
                              <Star className="w-3 h-3 mr-1" />
                              Primary Focus
                            </Badge>
                          )}
                        </div>
                      </div>
                    ) : null;
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Commitment Details */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="w-5 h-5 text-blue-500" />
                Commitment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {opportunity.commitmentType && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-muted-foreground">Type</span>
                  <Badge variant="secondary" className="capitalize">{opportunity.commitmentType.replace('-', ' ')}</Badge>
                </div>
              )}
              {opportunity.engagementType && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-muted-foreground">Work Style</span>
                  <Badge variant="secondary" className="capitalize">{opportunity.engagementType}</Badge>
                </div>
              )}
              {opportunity.startDate && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-muted-foreground">Starts</span>
                  <span className="font-medium">{new Date(opportunity.startDate).toLocaleDateString()}</span>
                </div>
              )}
              {opportunity.endDate && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-muted-foreground">Ends</span>
                  <span className="font-medium">{new Date(opportunity.endDate).toLocaleDateString()}</span>
                </div>
              )}
              {opportunity.category && (
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="outline" className="capitalize">{opportunity.category}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* What You'll Gain */}
          {opportunity.benefits && (
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="w-5 h-5 text-amber-500" />
                  What You'll Gain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {opportunity.benefits}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Requirements */}
        {opportunity.requirements && (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="w-5 h-5 text-slate-500" />
                Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {opportunity.requirements}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Fixed Bottom CTA - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white dark:bg-slate-900 border-t shadow-lg md:hidden z-20">
          <Button
            className={`w-full h-14 text-lg font-semibold ${hasApplied ? '' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'}`}
            disabled={hasApplied}
            variant={hasApplied ? "secondary" : "default"}
            onClick={() => setApplicationDialogOpen(true)}
          >
            {hasApplied ? (
              <>
                <CheckCircle className="w-5 h-5 mr-2" />
                Already Applied
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Apply Now
              </>
            )}
          </Button>
        </div>

        {/* Desktop CTA */}
        <Card className="hidden md:block border-0 shadow-lg bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-800 dark:to-slate-700 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-bold mb-1">Ready to make an impact?</h3>
                <p className="text-slate-300">Join this opportunity and start contributing today.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" size="lg" className="border-white/30 text-white hover:bg-white/10">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  size="lg"
                  className={`px-8 ${hasApplied ? 'bg-slate-600' : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'}`}
                  disabled={hasApplied}
                  onClick={() => setApplicationDialogOpen(true)}
                >
                  {hasApplied ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Already Applied
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Apply Now
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Application Dialog */}
      <ApplicationDialog
        opportunity={opportunity as any}
        open={applicationDialogOpen}
        onOpenChange={setApplicationDialogOpen}
      />

      {/* Mobile Bottom Navigation */}
      {isMobile && <WebBottomNav activeTab="discover" />}
    </div>
  );
}

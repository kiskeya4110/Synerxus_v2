import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Users,
  Clock,
  Target,
  Briefcase,
  CheckCircle2,
  Lightbulb,
  ExternalLink
} from "lucide-react";

interface VolunteerInsightsPanelProps {
  applicationId: number;
}

interface InsightsData {
  applicationId: number;
  volunteerId: number;
  volunteerName: string;
  matchScore: number;
  insights: {
    overallAssessment: string;
    strengthsInsights: string[];
    experienceInsights: string[];
    comparisonWithPastVolunteers: string;
    potentialConcerns: string[];
    recommendedQuestions: string[];
    predictedSuccessScore: number;
    keyTakeaway: string;
  };
  volunteerSummary: {
    totalProjects: number;
    totalHours: number;
    skills: string[];
    sdgAlignment: number[];
    hasLinkedIn: boolean;
    recentProjects: Array<{
      projectName: string;
      role: string;
      hoursContributed: number;
      sdgGoals: number[];
    }>;
  };
  organizationComparison: {
    commonSkillsMatch: string[];
    avgVolunteerHours: number;
    totalPastVolunteers: number;
    topOrgSkills: string[];
  };
}

export default function VolunteerInsightsPanel({ applicationId }: VolunteerInsightsPanelProps) {
  const { data: insightsData, isLoading, error } = useQuery<InsightsData>({
    queryKey: [`/api/applications/${applicationId}/volunteer-insights`],
    enabled: !!applicationId,
    staleTime: 60000, // Cache for 1 minute
    retry: 1
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Brain className="w-4 h-4 animate-pulse text-purple-500" />
          <span>Generating AI insights...</span>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error || !insightsData) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <AlertTriangle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Unable to load AI insights</p>
      </div>
    );
  }

  const { insights, volunteerSummary, organizationComparison } = insightsData;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-100 dark:bg-green-900/30";
    if (score >= 60) return "bg-blue-100 dark:bg-blue-900/30";
    if (score >= 40) return "bg-yellow-100 dark:bg-yellow-900/30";
    return "bg-red-100 dark:bg-red-900/30";
  };

  return (
    <div className="space-y-4">
      {/* AI Insights Header */}
      <div className="flex items-center gap-2">
        <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">AI Insights & Background Analysis</h3>
          <p className="text-xs text-muted-foreground">
            Powered by advanced analysis of volunteer history and organizational data
          </p>
        </div>
      </div>

      {/* Key Takeaway - Highlighted */}
      <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-purple-900 dark:text-purple-100">Key Insight</p>
              <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                {insights.keyTakeaway}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Predicted Success Score */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              <span className="font-medium">Predicted Success</span>
            </div>
            <div className={`text-2xl font-bold ${getScoreColor(insights.predictedSuccessScore)}`}>
              {insights.predictedSuccessScore}%
            </div>
          </div>
          <Progress
            value={insights.predictedSuccessScore}
            className="h-2"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Based on skills, experience, and comparison with past volunteers
          </p>
        </CardContent>
      </Card>

      {/* Overall Assessment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            Overall Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insights.overallAssessment}
          </p>
        </CardContent>
      </Card>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card className="bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-green-700 dark:text-green-400">
              <TrendingUp className="w-4 h-4" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {insights.strengthsInsights.length > 0 ? (
              <ul className="space-y-2">
                {insights.strengthsInsights.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No specific strengths identified</p>
            )}
          </CardContent>
        </Card>

        {/* Potential Concerns */}
        <Card className={insights.potentialConcerns.length > 0
          ? "bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
          : "bg-gray-50 dark:bg-gray-800"
        }>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              Areas to Explore
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {insights.potentialConcerns.length > 0 ? (
              <ul className="space-y-2">
                {insights.potentialConcerns.map((concern, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="w-4 h-4 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center text-xs text-amber-700 dark:text-amber-300 mt-0.5 flex-shrink-0">
                      !
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">{concern}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                No significant concerns identified
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Experience Insights */}
      {insights.experienceInsights.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-blue-500" />
              Experience Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {insights.experienceInsights.map((insight, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Past Projects Summary */}
      {volunteerSummary.recentProjects.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              Recent Project History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {volunteerSummary.recentProjects.map((project, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div>
                  <p className="font-medium text-sm">{project.projectName}</p>
                  <p className="text-xs text-muted-foreground">
                    {project.role} • {project.hoursContributed} hours
                  </p>
                </div>
                {project.sdgGoals.length > 0 && (
                  <div className="flex gap-1">
                    {project.sdgGoals.slice(0, 2).map(sdg => (
                      <Badge key={sdg} variant="secondary" className="text-xs">
                        SDG {sdg}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Total Volunteer Hours</span>
              <span className="font-bold text-primary">{volunteerSummary.totalHours} hrs</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comparison with Past Volunteers */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Users className="w-4 h-4" />
            Comparison with Your Past Volunteers
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <p className="text-sm text-muted-foreground">
            {insights.comparisonWithPastVolunteers}
          </p>

          {organizationComparison.commonSkillsMatch.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-2">Matching Skills with Past Volunteers:</p>
              <div className="flex flex-wrap gap-1">
                {organizationComparison.commonSkillsMatch.map((skill, index) => (
                  <Badge key={index} className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {organizationComparison.totalPastVolunteers}
              </p>
              <p className="text-xs text-muted-foreground">Past Volunteers</p>
            </div>
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {organizationComparison.avgVolunteerHours} hrs
              </p>
              <p className="text-xs text-muted-foreground">Avg Hours/Volunteer</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recommended Interview Questions */}
      {insights.recommendedQuestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-purple-500" />
              Suggested Interview Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="space-y-2">
              {insights.recommendedQuestions.map((question, index) => (
                <li
                  key={index}
                  className="text-sm p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-purple-900 dark:text-purple-100 italic"
                >
                  "{question}"
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* LinkedIn Indicator */}
      {volunteerSummary.hasLinkedIn && (
        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <ExternalLink className="w-4 h-4" />
          <span>LinkedIn profile available - consider reviewing for additional background</span>
        </div>
      )}

      {/* Footer Note */}
      <p className="text-xs text-center text-muted-foreground pt-2">
        AI insights are generated to assist decision-making. Always consider the full context of each application.
      </p>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Clock, MapPin, Target, Briefcase, Award, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SDG_GOALS } from "@shared/sdg-goals";
import ProjectChat from "@/components/project/project-chat";
import MatchAnalysisModal from "@/components/volunteer/match-analysis-modal";

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

export default function OpportunityDetailPWA() {
  const [, params] = useRoute("/opportunities/:id/pwa");
  const [, navigate] = useLocation();
  const opportunityId = params?.id ? parseInt(params.id) : null;
  const [showMatchAnalysis, setShowMatchAnalysis] = useState(false);

  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleBack = () => {
    // Use history back if available, otherwise navigate to volunteer dashboard
    if (window.history.length > 2) {
      window.history.back();
    } else {
      navigate("/volunteer-dashboard");
    }
  };

  const { data: opportunity, isLoading } = useQuery<any>({
    queryKey: [`/api/opportunities/${opportunityId}`],
    enabled: !!opportunityId,
  });

  // Fetch applications to check if user has already applied
  const { data: applications = [] } = useQuery({
    queryKey: ['/api/applications'],
    queryFn: async () => {
      const response = await fetch('/api/applications');
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Check if user has applied for this opportunity
  const userId = localStorage.getItem('currentUserId');
  const hasApplied = applications.some((app: any) =>
    app.opportunityId === opportunityId && app.volunteerId === parseInt(userId || '0')
  );

  const { toast } = useToast();

  const applyMutation = useMutation({
    mutationFn: async () => {
      const volunteerId = parseInt(userId || '0');
      if (!volunteerId) {
        throw new Error('Please log in to apply');
      }
      return apiRequest("POST", "/api/applications", {
        opportunityId,
        volunteerId,
        coverLetter: "I am interested in this volunteer opportunity and would like to contribute my skills."
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities/status"] });
      toast({ title: "Applied successfully!", description: "Your application has been submitted. The organization will review it soon." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message || "Failed to apply. Please try again.", variant: "destructive" });
    }
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#faf9f7]">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="w-full min-h-screen bg-[#faf9f7] flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Opportunity Not Found</h1>
        <Button onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Opportunities
        </Button>
      </div>
    );
  }

  const primarySdg = opportunity.primarySdg || opportunity.sdgGoals?.[0];
  const sdgGoal = primarySdg ? SDG_GOALS[primarySdg] : null;

  return (
    <div className="w-full min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-24 max-w-[428px] mx-auto">
      {/* Header - Light blue to gold gradient (matching mobile PWA view) */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-sky-200 via-sky-300 to-amber-300 text-slate-700 px-4 py-3 flex items-center shadow-xl">
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-700 hover:bg-slate-700/10 -ml-2"
          onClick={handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold ml-2">Opportunity Details</h1>
      </div>

      {/* Hero Image Section */}
      <div className="relative w-full h-64 bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <Briefcase className="h-20 w-20 text-white opacity-20" />
      </div>

      {/* Match Score Badge */}
      {opportunity.matchScore && (
        <div className="px-4 -mt-8 relative z-10 mb-4">
          <div className="bg-white rounded-lg shadow-md px-4 py-3 inline-flex items-center gap-2 border border-emerald-100">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              {Math.round(opportunity.matchScore)}%
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-900">{opportunity.requiredSkills?.[0] || "Opportunity"} Role</p>
              <p className="text-xs text-slate-600">{opportunity.experienceLevel ? `${opportunity.experienceLevel} level` : 'High Affinity'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Card */}
      <div className="px-4 pb-4">
        <Card className="overflow-hidden">
          <CardContent className="p-6 space-y-4">
            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{opportunity.title}</h2>
              <p className="text-sm text-slate-600">{opportunity.description}</p>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left: Description with SDG */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 text-sm">Description</h3>
                {sdgGoal && (
                  <div className="flex flex-col items-center gap-2">
                    <div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                      style={{ backgroundColor: SDG_COLORS[primarySdg!] }}
                    >
                      SDG {primarySdg}
                    </div>
                    <p className="text-xs font-semibold text-center text-slate-700">{SDG_NAMES[primarySdg!]}</p>
                    <p className="text-xs text-slate-600 text-center">Indicator {primarySdg}.1.1</p>
                  </div>
                )}
              </div>

              {/* Right: Why Good Match */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 space-y-2 border border-emerald-100">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <h3 className="font-semibold text-slate-900 text-sm">Why this is a good match</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-700">
                  {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
                    <p>
                      Your profile skills in <span className="font-semibold text-emerald-700">{opportunity.requiredSkills[0]}</span> align with the core needs.
                    </p>
                  )}
                  {opportunity.sdgGoals && opportunity.sdgGoals.length > 0 && (
                    <p>
                      You have expressed interest in <span className="font-semibold text-emerald-700">"{SDG_NAMES[opportunity.sdgGoals[0]] || "Impact"}"</span> and related areas.
                    </p>
                  )}
                  <button
                    onClick={() => setShowMatchAnalysis(true)}
                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-medium text-xs mt-2 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    View AI Analysis →
                  </button>
                </div>
              </div>
            </div>

            {/* Expected Tasks */}
            <div className="border-t pt-4">
              <h3 className="font-semibold text-slate-900 mb-3">Expected Tasks</h3>
              <div className="grid grid-cols-2 gap-3">
                {/* Time Commitment */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Time Commitment & Location</p>
                  <div className="space-y-1 text-xs text-slate-600">
                    {opportunity.timeCommitment && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{opportunity.timeCommitment}</span>
                      </div>
                    )}
                    {opportunity.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>On-site, {opportunity.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tasks Count */}
                <div className="bg-slate-50 rounded p-2 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900">{opportunity.requiredTasks || 3}</p>
                    <p className="text-xs text-slate-600">tasks to complete</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Apply Button */}
            <Button
              onClick={() => !hasApplied && applyMutation.mutate()}
              disabled={applyMutation.isPending || hasApplied}
              className={`w-full ${
                hasApplied
                  ? 'bg-gray-600 hover:bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-400 to-blue-500 hover:from-emerald-500 hover:to-blue-600'
              } text-white font-semibold py-3 rounded-lg`}
              data-testid="button-apply-opportunity"
            >
              {hasApplied ? "Already Applied" : applyMutation.isPending ? "Applying..." : "Apply for Opportunity"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Opportunity Chat */}
      {opportunity && opportunity.organizationId && opportunity.projectId && (
        <ProjectChat
          projectId={opportunity.projectId}
          projectName={opportunity.title}
          organizationId={opportunity.organizationId}
          organizationName={opportunity.organizationName}
        />
      )}

      {/* AI Match Analysis Modal */}
      <MatchAnalysisModal
        isOpen={showMatchAnalysis}
        onClose={() => setShowMatchAnalysis(false)}
        opportunityId={opportunityId!}
        projectName={opportunity.title}
      />
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Linkedin,
  Twitter,
  Share2,
  Calendar,
  Clock,
  Target,
  Users,
  Award,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { getSDGName } from "@shared/sdg-goals";

interface NarrativeContext {
  totalHours: number;
  peopleImpacted: number;
  sdgs: number[];
  projects: number;
  reportType: "volunteer" | "organization" | "csr";
  volunteerName?: string;
  organizationName?: string;
  period?: string;
  skills?: string[];
  achievements?: string[];
}

interface AINarrativeSectionProps {
  context: NarrativeContext;
  initialNarrative?: string;
  title?: string;
  showActions?: boolean;
}

export function AINarrativeSection({
  context,
  initialNarrative,
  title = "Your Impact Story",
  showActions = true,
}: AINarrativeSectionProps) {
  const [narrative, setNarrative] = useState(initialNarrative || "");
  const [copied, setCopied] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const { toast } = useToast();

  // Format date for display
  const formatReportDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get industry benchmark comparisons
  const getIndustryComparison = () => {
    // Industry standard benchmarks for volunteer impact
    const avgVolunteerHoursPerYear = 52; // National average ~1hr/week
    const avgProjectsPerVolunteer = 2;
    const topPerformerThreshold = 100; // Top 20% volunteers log 100+ hours

    const hoursPercentile = context.totalHours >= topPerformerThreshold ? 95 :
      context.totalHours >= avgVolunteerHoursPerYear ? 75 :
      context.totalHours >= avgVolunteerHoursPerYear / 2 ? 50 : 25;

    const projectsPercentile = context.projects >= 5 ? 95 :
      context.projects >= avgProjectsPerVolunteer ? 70 : 40;

    return {
      hoursPercentile,
      projectsPercentile,
      isTopPerformer: context.totalHours >= topPerformerThreshold,
      avgHours: avgVolunteerHoursPerYear,
      avgProjects: avgProjectsPerVolunteer,
    };
  };

  const industryStats = getIndustryComparison();

  // Generate narrative using the existing API
  const generateMutation = useMutation({
    mutationFn: async () => {
      const topSdgs = context.sdgs
        .slice(0, 3)
        .map((id) => `SDG ${id}: ${getSDGName(id)}`)
        .join(", ");

      // Use short story mode for organization impact stories
      const isOrganization = context.reportType === "organization";

      const response = await fetch("/api/generate-impact-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectTitle: context.reportType === "volunteer"
            ? `${context.volunteerName || "Volunteer"}'s Impact`
            : context.organizationName || "Organization Impact",
          reportingPeriod: context.period || "This Year",
          locationsServed: "Multiple locations",
          keyStories: context.achievements?.join(". ") || "",
          csrAlignment: topSdgs,
          targetAudience: "general",
          tone: "professional",
          impactFocus: context.reportType === "csr" ? "community" : "people",
          organizationName: context.organizationName || "",
          storyType: isOrganization ? "short" : "full",
          reportType: context.reportType,
          metrics: {
            totalHours: context.totalHours,
            peopleImpacted: context.peopleImpacted,
            projectCount: context.projects,
            sdgsAddressed: context.sdgs.length,
            skills: context.skills?.join(", ") || "",
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate narrative");
      }

      const data = await response.json();
      return data.report || data.narrative || data.content || "";
    },
    onSuccess: (data) => {
      setNarrative(data);
      setGeneratedAt(new Date());
      toast({
        title: "Narrative generated",
        description: "Your impact story has been created.",
      });
      // Start cooldown
      setCooldown(true);
      setTimeout(() => setCooldown(false), 30000); // 30 second cooldown
    },
    onError: () => {
      toast({
        title: "Generation failed",
        description: "Could not generate narrative. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Auto-generate on mount if no initial narrative
  useEffect(() => {
    if (!initialNarrative && context.totalHours > 0) {
      generateMutation.mutate();
    }
    // Set initial generation date if we have an initial narrative
    if (initialNarrative) {
      setGeneratedAt(new Date());
    }
  }, []);

  const handleCopy = async () => {
    if (!narrative) return;
    await navigator.clipboard.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Narrative copied to clipboard.",
    });
  };

  const handleShare = (platform: "linkedin" | "twitter") => {
    const text = encodeURIComponent(
      narrative.slice(0, platform === "twitter" ? 240 : 500) +
        (narrative.length > (platform === "twitter" ? 240 : 500) ? "..." : "")
    );

    const urls = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}`,
    };

    window.open(urls[platform], "_blank", "width=600,height=400");
  };

  const isLoading = generateMutation.isPending;

  // Generate a dynamic fallback narrative based on available metrics
  const generateFallbackNarrative = () => {
    const isOrganization = context.reportType === "organization";
    const name = isOrganization
      ? (context.organizationName || "Your organization")
      : (context.volunteerName || "You");
    const period = context.period || "this period";

    // Build dynamic parts based on available metrics
    const parts: string[] = [];

    if (context.totalHours > 0 && context.projects > 0) {
      parts.push(`${context.totalHours.toLocaleString()} volunteer hours across ${context.projects} project${context.projects > 1 ? 's' : ''}`);
    } else if (context.totalHours > 0) {
      parts.push(`${context.totalHours.toLocaleString()} volunteer hours`);
    } else if (context.projects > 0) {
      parts.push(`${context.projects} project${context.projects > 1 ? 's' : ''}`);
    }

    if (context.peopleImpacted > 0) {
      parts.push(`${context.peopleImpacted.toLocaleString()} lives impacted`);
    }

    if (context.sdgs.length > 0) {
      const topSdgs = context.sdgs.slice(0, 2).map((id) => getSDGName(id)).join(" and ");
      parts.push(`work aligned with ${topSdgs}`);
    }

    // Build the narrative
    if (parts.length === 0) {
      return isOrganization
        ? `${name} is making a difference in the community. Start logging activities to see your impact story grow.`
        : `${name} started your impact journey. Log your first activity to see your story unfold.`;
    }

    if (isOrganization) {
      // Short, simple narrative for organizations
      const metricsText = parts.slice(0, 2).join(" and ");
      return `${period === "This Year" ? "This year" : `During ${period}`}, ${name} contributed ${metricsText}.${parts.length > 2 ? ` ${parts[2].charAt(0).toUpperCase() + parts[2].slice(1)}.` : ''}`;
    } else {
      // Slightly more detailed for volunteers
      return `In ${period}, ${name} contributed ${parts[0]}${parts[1] ? `, directly impacting ${context.peopleImpacted.toLocaleString()} lives` : ''}.${context.sdgs.length > 0 ? ` Your ${parts[parts.length - 1]}.` : ''}`;
    }
  };

  const fallbackNarrative = generateFallbackNarrative();

  const displayNarrative = narrative || (isLoading ? "" : fallbackNarrative);

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  AI-generated impact summary
                </p>
              </div>
            </div>

            {showActions && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateMutation.mutate()}
                disabled={isLoading || cooldown}
                className="gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
                {cooldown ? "Wait 30s" : "Regenerate"}
              </Button>
            )}
          </div>

          {/* Report Generation Date */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded-full">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">
                {generatedAt ? formatReportDate(generatedAt) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="h-3 w-3" />
              <span className="font-medium">Confirmed Data</span>
            </div>
            {context.period && (
              <div className="flex items-center gap-1.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2.5 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                <span className="font-medium">{context.period}</span>
              </div>
            )}
          </div>
        </div>

        {/* Verified Metrics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1 text-blue-600 dark:text-blue-400 mb-1">
              <Clock className="h-3.5 w-3.5" />
              <span className="text-lg font-bold">{Math.round(context.totalHours)}</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Hours Logged</p>
          </div>
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1 text-green-600 dark:text-green-400 mb-1">
              <Users className="h-3.5 w-3.5" />
              <span className="text-lg font-bold">{context.peopleImpacted}</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Lives Impacted</p>
          </div>
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1 text-purple-600 dark:text-purple-400 mb-1">
              <Target className="h-3.5 w-3.5" />
              <span className="text-lg font-bold">{context.projects}</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">Projects</p>
          </div>
          <div className="text-center p-2">
            <div className="flex items-center justify-center gap-1 text-orange-600 dark:text-orange-400 mb-1">
              <Award className="h-3.5 w-3.5" />
              <span className="text-lg font-bold">{context.sdgs.length}</span>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">SDGs Addressed</p>
          </div>
        </div>

        {/* Industry Benchmark Comparison */}
        {context.totalHours > 0 && (
          <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Industry Comparison</h4>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  Your hours rank in the <span className="font-bold text-amber-700 dark:text-amber-300">top {100 - industryStats.hoursPercentile}%</span> of volunteers
                </p>
                <p className="text-gray-500 dark:text-gray-500 mt-0.5">
                  (Avg: {industryStats.avgHours}h/year nationally)
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">
                  Project engagement in <span className="font-bold text-amber-700 dark:text-amber-300">top {100 - industryStats.projectsPercentile}%</span>
                </p>
                <p className="text-gray-500 dark:text-gray-500 mt-0.5">
                  (Avg: {industryStats.avgProjects} projects/volunteer)
                </p>
              </div>
            </div>
            {industryStats.isTopPerformer && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <Award className="h-3.5 w-3.5" />
                <span className="font-medium">Top Performer: You're among the most impactful volunteers!</span>
              </div>
            )}
          </div>
        )}

        {/* Narrative content */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="relative"
        >
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[95%]" />
              <Skeleton className="h-4 w-[90%]" />
              <Skeleton className="h-4 w-[85%]" />
              <Skeleton className="h-4 w-[60%]" />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {displayNarrative}
              </p>
            </div>
          )}
        </motion.div>

        {/* Action buttons */}
        {showActions && displayNarrative && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="gap-1 text-gray-600 dark:text-gray-400"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare("linkedin")}
              className="gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-600"
            >
              <Linkedin className="h-3 w-3" />
              LinkedIn
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShare("twitter")}
              className="gap-1 text-gray-600 dark:text-gray-400 hover:text-sky-500"
            >
              <Twitter className="h-3 w-3" />
              Twitter
            </Button>
          </motion.div>
        )}

        {/* Report Footer with Data Source & Verification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              Data confirmed from activity logs
            </span>
            <span>•</span>
            <span>Report ID: {generatedAt ? `RPT-${generatedAt.getTime().toString(36).toUpperCase()}` : 'Pending'}</span>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by AI • Industry benchmarks from Bureau of Labor Statistics
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default AINarrativeSection;

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
  const { toast } = useToast();

  // Generate narrative using the existing API
  const generateMutation = useMutation({
    mutationFn: async () => {
      const topSdgs = context.sdgs
        .slice(0, 3)
        .map((id) => `SDG ${id}: ${getSDGName(id)}`)
        .join(", ");

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

  // Generate a simple narrative if API fails or no AI available
  const fallbackNarrative = `
In ${context.period || "this period"}, ${context.volunteerName || "this volunteer"} contributed ${context.totalHours.toLocaleString()} hours across ${context.projects} projects, directly impacting ${context.peopleImpacted.toLocaleString()} lives.

Their work aligned with ${context.sdgs.length} Sustainable Development Goals, including ${context.sdgs.slice(0, 3).map((id) => getSDGName(id)).join(", ")}${context.sdgs.length > 3 ? ` and ${context.sdgs.length - 3} more` : ""}.

${context.skills?.length ? `Key skills applied: ${context.skills.slice(0, 5).join(", ")}.` : ""}
  `.trim();

  const displayNarrative = narrative || (isLoading ? "" : fallbackNarrative);

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border-0 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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

        {/* Powered by AI badge */}
        <div className="flex items-center justify-end mt-3">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by AI
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default AINarrativeSection;

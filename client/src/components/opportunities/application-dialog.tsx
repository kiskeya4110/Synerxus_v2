import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Opportunity } from "@shared/schema";
import { MapPin, Clock, Sparkles } from "lucide-react";

interface ApplicationDialogProps {
  opportunity: Opportunity & { matchScore?: number; matchReasons?: string[] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApplicationDialog({ opportunity, open, onOpenChange }: ApplicationDialogProps) {
  const [coverLetter, setCoverLetter] = useState("");
  const { toast } = useToast();

  const applyMutation = useMutation({
    mutationFn: async (data: { opportunityId: number; coverLetter: string }) => {
      // TODO: Get volunteerId from authenticated session instead of hardcoded value
      return await apiRequest("POST", "/api/applications", {
        ...data,
        volunteerId: 1 // Temporary hardcoded value - replace with auth
      });
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "Your application has been submitted successfully. The organization will review it soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      onOpenChange(false);
      setCoverLetter("");
    },
    onError: (error: Error) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim()) {
      toast({
        title: "Cover Letter Required",
        description: "Please write a brief cover letter explaining why you're interested.",
        variant: "destructive",
      });
      return;
    }
    applyMutation.mutate({
      opportunityId: opportunity.id,
      coverLetter,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{opportunity.title}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {opportunity.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Opportunity Details */}
          <div className="grid grid-cols-2 gap-4 py-4 border-y">
            {opportunity.location && (
              <div className="flex items-center text-sm">
                <MapPin className="w-4 h-4 mr-2 text-gray-500" />
                <span>{opportunity.location}</span>
                {opportunity.isRemote && (
                  <Badge variant="outline" className="ml-2">Remote</Badge>
                )}
              </div>
            )}
            {opportunity.timeCommitment && (
              <div className="flex items-center text-sm">
                <Clock className="w-4 h-4 mr-2 text-gray-500" />
                <span>{opportunity.timeCommitment}</span>
              </div>
            )}
          </div>

          {/* Match Score */}
          {opportunity.matchScore && opportunity.matchScore >= 40 && (
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
                  Your Match Score: {opportunity.matchScore}%
                </h4>
                <Badge 
                  className={
                    opportunity.matchScore >= 80 
                      ? "bg-green-500" 
                      : opportunity.matchScore >= 60 
                      ? "bg-blue-500" 
                      : "bg-gray-500"
                  }
                >
                  {opportunity.matchScore >= 80 ? "Excellent" : opportunity.matchScore >= 60 ? "Good" : "Fair"} Match
                </Badge>
              </div>
              {opportunity.matchReasons && opportunity.matchReasons.length > 0 && (
                <ul className="text-sm text-blue-900 dark:text-blue-100 space-y-1">
                  {opportunity.matchReasons.map((reason, idx) => (
                    <li key={idx}>• {reason}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Required Skills */}
          {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Required Skills</h4>
              <div className="flex flex-wrap gap-2">
                {opportunity.requiredSkills.map((skill, idx) => (
                  <Badge key={idx} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {opportunity.benefits && (
            <div>
              <h4 className="font-semibold mb-2">What You'll Gain</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{opportunity.benefits}</p>
            </div>
          )}

          {/* Requirements */}
          {opportunity.requirements && (
            <div>
              <h4 className="font-semibold mb-2">Requirements</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{opportunity.requirements}</p>
            </div>
          )}

          {/* Application Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="cover-letter">
                Cover Letter <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="cover-letter"
                placeholder="Tell the organization why you're interested in this opportunity and what makes you a great fit..."
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={6}
                className="mt-2"
                data-testid="textarea-cover-letter"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 50 characters recommended
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={applyMutation.isPending}
                data-testid="button-cancel-application"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={applyMutation.isPending || !coverLetter.trim()}
                data-testid="button-submit-application"
              >
                {applyMutation.isPending ? "Submitting..." : "Submit Application"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

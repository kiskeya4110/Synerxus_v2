import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Opportunity } from "@shared/schema";
import { MapPin, Clock, Sparkles, FileText } from "lucide-react";

interface ApplicationDialogProps {
  opportunity: Opportunity & { matchScore?: number; matchReasons?: string[] };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ApplicationDialog({ opportunity, open, onOpenChange }: ApplicationDialogProps) {
  const [coverLetter, setCoverLetter] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const { toast } = useToast();

  const applyMutation = useMutation({
    mutationFn: async (data: { opportunityId: number; coverLetter: string; resumeUrl?: string; volunteerId: number }) => {
      return await apiRequest("POST", "/api/applications", data);
    },
    onSuccess: () => {
      toast({
        title: "Application Submitted!",
        description: "Your application has been submitted successfully. The organization will review it soon.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities/status"] });
      onOpenChange(false);
      setCoverLetter("");
      setResumeUrl("");
    },
    onError: (error: Error) => {
      toast({
        title: "Application Failed",
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or Word document (.pdf, .doc, .docx)",
          variant: "destructive",
        });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      setResumeFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coverLetter.trim()) {
      toast({
        title: "Cover Letter Required",
        description: "Please write a brief cover letter explaining why you're interested.",
        variant: "destructive",
      });
      return;
    }

    const userId = localStorage.getItem('currentUserId');
    if (!userId) {
      toast({
        title: "Authentication Error",
        description: "Please log in to apply for opportunities.",
        variant: "destructive",
      });
      return;
    }

    let finalResumeUrl = resumeUrl.trim() || undefined;

    // If user uploaded a file, create a note about it
    // For MVP, we'll just note the filename - proper file upload would require backend support
    if (resumeFile) {
      finalResumeUrl = `File: ${resumeFile.name} (${(resumeFile.size / 1024).toFixed(1)}KB)`;
    }

    applyMutation.mutate({
      opportunityId: opportunity.id,
      coverLetter,
      resumeUrl: finalResumeUrl,
      volunteerId: Number(userId),
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

            <div className="space-y-3">
              <div>
                <Label htmlFor="resume-file" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Upload Resume/CV (Optional)
                </Label>
                <Input
                  id="resume-file"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="mt-2"
                  data-testid="input-resume-file"
                />
                {resumeFile && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Selected: {resumeFile.name} ({(resumeFile.size / 1024).toFixed(1)}KB)
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Upload a PDF or Word document (max 5MB)
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div>
                <Label htmlFor="resume-url">
                  Resume/CV Link
                </Label>
                <Input
                  id="resume-url"
                  type="url"
                  placeholder="https://drive.google.com/... or https://your-website.com/resume.pdf"
                  value={resumeUrl}
                  onChange={(e) => setResumeUrl(e.target.value)}
                  disabled={!!resumeFile}
                  className="mt-2"
                  data-testid="input-resume-url"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Or share a link to your resume from Google Drive, Dropbox, or your personal website
                </p>
              </div>
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

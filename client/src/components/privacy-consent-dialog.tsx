import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Shield, CheckCircle, XCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PrivacyConsentDialogProps {
  open: boolean;
  onConsentGiven: () => void;
  onDeclined: () => void;
  userId?: number;
}

export function PrivacyConsentDialog({
  open,
  onConsentGiven,
  onDeclined,
  userId,
}: PrivacyConsentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const consentMutation = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User ID required");
      return apiRequest("POST", "/api/user/consent", {
        userId,
        dataConsent: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      toast({
        title: "Consent recorded",
        description: "Thank you for agreeing to our data usage policy.",
      });
      onConsentGiven();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record consent",
        variant: "destructive",
      });
      setIsSubmitting(false);
    },
  });

  const handleAgree = async () => {
    setIsSubmitting(true);
    consentMutation.mutate();
  };

  const handleDecline = () => {
    onDeclined();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-lg"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Before you continue
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            User Consent for Platform Access
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            To use Synerxus, we ask for your consent to allow the platform to process
            and use your data to help improve system performance, optimize features,
            and enhance your overall experience.
          </p>

          <p className="text-sm text-muted-foreground leading-relaxed">
            Your information will always be handled responsibly and in alignment with
            our commitment to transparency and impact.
          </p>

          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">
              By selecting "I Agree", you confirm that:
            </p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>You understand your data may be used to help optimize the platform</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>You consent to this use as part of accessing and using Synerxus</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>You acknowledge that this consent is required to continue</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={handleAgree}
            disabled={isSubmitting}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                I Agree — Continue to Synerxus
              </span>
            )}
          </Button>
          <Button
            onClick={handleDecline}
            variant="outline"
            className="w-full text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950"
            size="lg"
          >
            <XCircle className="h-4 w-4 mr-2" />
            I Do Not Agree — Exit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, RefreshCw, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface DataDiscrepancy {
  type: "name_mismatch" | "id_mismatch" | "data_conflict" | "missing_profile";
  field: string;
  userValue?: string;
  profileValue?: string;
  severity: "warning" | "error";
  message: string;
}

interface ValidationResult {
  userId: number;
  isValid: boolean;
  discrepancies: DataDiscrepancy[];
  checkedAt: string;
}

interface DataDiscrepancyAlertProps {
  userId: number;
  onResolved?: () => void;
  showIfNoIssues?: boolean;
}

export function DataDiscrepancyAlert({ userId, onResolved, showIfNoIssues = false }: DataDiscrepancyAlertProps) {
  const { toast } = useToast();
  const [dismissed, setDismissed] = useState(false);

  const { data: validation, isLoading, refetch } = useQuery<ValidationResult>({
    queryKey: ["/api/user-validation", userId],
    queryFn: async () => {
      const response = await fetch(`/api/user-validation/${userId}?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to validate user data");
      return response.json();
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  const syncNameMutation = useMutation({
    mutationFn: async (displayName: string) => {
      return apiRequest("POST", `/api/user-validation/${userId}/sync-name?userId=${userId}`, { displayName });
    },
    onSuccess: () => {
      toast({
        title: "Name synchronized",
        description: "Your display name has been updated across all profiles.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user-validation", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile/volunteer"] });
      onResolved?.();
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync your name. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (dismissed || isLoading) return null;

  if (!validation) return null;

  const { discrepancies } = validation;

  if (discrepancies.length === 0) {
    if (showIfNoIssues) {
      return (
        <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertTitle className="text-green-800 dark:text-green-200">Data Confirmed</AlertTitle>
          <AlertDescription className="text-green-700 dark:text-green-300">
            Your profile data is consistent across all records.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  const nameMismatch = discrepancies.find(d => d.type === "name_mismatch");
  const hasErrors = discrepancies.some(d => d.severity === "error");

  return (
    <Alert 
      className={`mb-4 ${
        hasErrors 
          ? "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800" 
          : "border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800"
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className={`h-4 w-4 mt-0.5 ${hasErrors ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"}`} />
          <div>
            <AlertTitle className={hasErrors ? "text-red-800 dark:text-red-200" : "text-amber-800 dark:text-amber-200"}>
              Profile Data Discrepancy Detected
            </AlertTitle>
            <AlertDescription className={`mt-1 ${hasErrors ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300"}`}>
              <div className="space-y-2">
                {discrepancies.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        d.severity === "error" 
                          ? "border-red-300 text-red-700 dark:border-red-700 dark:text-red-300" 
                          : "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {d.type.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-sm">{d.message}</span>
                  </div>
                ))}
              </div>

              {nameMismatch && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncNameMutation.mutate(nameMismatch.userValue || "")}
                    disabled={syncNameMutation.isPending}
                    className="bg-white dark:bg-gray-800"
                    data-testid="button-use-user-name"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncNameMutation.isPending ? "animate-spin" : ""}`} />
                    Use "{nameMismatch.userValue}"
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => syncNameMutation.mutate(nameMismatch.profileValue || "")}
                    disabled={syncNameMutation.isPending}
                    className="bg-white dark:bg-gray-800"
                    data-testid="button-use-profile-name"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${syncNameMutation.isPending ? "animate-spin" : ""}`} />
                    Use "{nameMismatch.profileValue}"
                  </Button>
                </div>
              )}
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => setDismissed(true)}
          data-testid="button-dismiss-discrepancy"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  );
}

export function useDataValidation(userId: number | null) {
  const { data: validation, isLoading, refetch } = useQuery<ValidationResult>({
    queryKey: ["/api/user-validation", userId],
    queryFn: async () => {
      if (!userId) throw new Error("No user ID");
      const response = await fetch(`/api/user-validation/${userId}?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to validate user data");
      return response.json();
    },
    enabled: !!userId,
    staleTime: 60000,
  });

  return {
    validation,
    isLoading,
    hasDiscrepancies: validation?.discrepancies?.length ? validation.discrepancies.length > 0 : false,
    discrepancies: validation?.discrepancies || [],
    refetch,
  };
}

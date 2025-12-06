import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, TrendingUp, Award, Lightbulb } from "lucide-react";

interface AIExplanation {
  algorithm: string;
  description: string;
  weighting: {
    [key: string]: number;
  };
  example_calculation: {
    volunteer: {
      name: string;
      skills: string[];
      sdgs: number[];
      location: string;
      availability: string[];
    };
    organization: {
      name: string;
      required_skills: string[];
      sdgs: number[];
      location: string;
      availability: string[];
    };
    scores: {
      [key: string]: number;
    };
    weighted_score: number;
    final_percentage: number;
  };
}

interface AIExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AIExplanationModal({ isOpen, onClose }: AIExplanationModalProps) {
  const { data: aiExplanation, isLoading } = useQuery<AIExplanation>({
    queryKey: ["/api/ai/explain"],
    queryFn: async () => {
      const response = await fetch("/api/ai/explain");
      if (!response.ok) throw new Error("Failed to fetch AI explanation");
      return response.json();
    },
    enabled: isOpen,
    staleTime: 300000, // Cache for 5 minutes
  });

  const formatFactorName = (name: string) => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Brain className="h-6 w-6 text-purple-600" />
            AI Matchmaking Algorithm
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : aiExplanation ? (
          <div className="space-y-6">
            {/* Algorithm Description */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-yellow-600" />
                  {aiExplanation.algorithm}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  {aiExplanation.description}
                </p>
              </CardContent>
            </Card>

            {/* Weighting Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  Weighting Factors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(aiExplanation.weighting).map(([factor, weight]) => (
                    <div key={factor} className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">
                          {formatFactorName(factor)}
                        </span>
                        <span className="text-sm font-semibold text-blue-600">
                          {(weight * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${weight * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Example Calculation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-green-600" />
                  Example Calculation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-6">
                  {/* Volunteer Profile */}
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-900 mb-3">Volunteer</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {aiExplanation.example_calculation.volunteer.name}</p>
                      <p>
                        <strong>Skills:</strong>{" "}
                        {aiExplanation.example_calculation.volunteer.skills.join(", ")}
                      </p>
                      <p>
                        <strong>SDGs:</strong>{" "}
                        {aiExplanation.example_calculation.volunteer.sdgs.join(", ")}
                      </p>
                      <p>
                        <strong>Location:</strong>{" "}
                        {aiExplanation.example_calculation.volunteer.location}
                      </p>
                      <p>
                        <strong>Availability:</strong>{" "}
                        {aiExplanation.example_calculation.volunteer.availability.join(", ")}
                      </p>
                    </div>
                  </div>

                  {/* Organization Profile */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900 mb-3">Organization</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {aiExplanation.example_calculation.organization.name}</p>
                      <p>
                        <strong>Required Skills:</strong>{" "}
                        {aiExplanation.example_calculation.organization.required_skills.join(", ")}
                      </p>
                      <p>
                        <strong>SDGs:</strong>{" "}
                        {aiExplanation.example_calculation.organization.sdgs.join(", ")}
                      </p>
                      <p>
                        <strong>Location:</strong>{" "}
                        {aiExplanation.example_calculation.organization.location}
                      </p>
                      <p>
                        <strong>Availability:</strong>{" "}
                        {aiExplanation.example_calculation.organization.availability.join(", ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Individual Scores */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Individual Factor Scores</h4>
                  <div className="space-y-2">
                    {Object.entries(aiExplanation.example_calculation.scores).map(([factor, score]) => (
                      <div key={factor} className="flex justify-between items-center text-sm">
                        <span>{formatFactorName(factor)}:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${score * 100}%` }}
                            />
                          </div>
                          <span className="font-semibold w-12 text-right">
                            {(score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Final Score */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg text-center">
                  <p className="text-sm font-medium mb-1">Final Weighted Match Score</p>
                  <p className="text-4xl font-bold">
                    {aiExplanation.example_calculation.final_percentage}%
                  </p>
                  <p className="text-xs mt-2 opacity-90">
                    Calculated as: {Object.entries(aiExplanation.example_calculation.scores)
                      .map(([factor, score]) => `(${(score * 100).toFixed(0)}% × ${(aiExplanation.weighting[factor] * 100).toFixed(0)}%)`)
                      .join(" + ")}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Footer Info */}
            <div className="text-xs text-gray-500 text-center border-t pt-4">
              <p>
                This algorithm is continuously refined based on successful volunteer-organization
                matches and feedback from both parties.
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Failed to load AI explanation. Please try again.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

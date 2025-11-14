import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
  FileText
} from "lucide-react";
import { SDG_GOALS } from "@shared/sdg-goals";

export default function OpportunityDetail() {
  const { id } = useParams();
  const opportunityId = parseInt(id!);

  const { data: opportunity, isLoading } = useQuery({
    queryKey: [`/api/opportunities/${opportunityId}`],
  });

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold mb-4">Opportunity Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          The opportunity you're looking for doesn't exist or has been removed.
        </p>
        <Link href="/discover-opportunities">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Opportunities
          </Button>
        </Link>
      </div>
    );
  }

  const getMatchBadge = (score?: number) => {
    if (!score) return null;
    
    if (score >= 80) {
      return (
        <Badge className="bg-green-500 text-white">
          <Sparkles className="w-3 h-3 mr-1" />
          Excellent Match ({score}%)
        </Badge>
      );
    } else if (score >= 60) {
      return (
        <Badge className="bg-blue-500 text-white">
          <TrendingUp className="w-3 h-3 mr-1" />
          Good Match ({score}%)
        </Badge>
      );
    } else if (score >= 40) {
      return <Badge variant="outline">Fair Match ({score}%)</Badge>;
    }
    return null;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link href="/my-applications">
        <Button variant="ghost" className="mb-4" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to My Applications
        </Button>
      </Link>

      {/* Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-3xl mb-2">{opportunity.title}</CardTitle>
              {opportunity.organizationName && (
                <div className="flex items-center text-muted-foreground mb-3">
                  <Building2 className="w-4 h-4 mr-2" />
                  <span className="text-lg">{opportunity.organizationName}</span>
                </div>
              )}
            </div>
            {opportunity.matchScore && getMatchBadge(opportunity.matchScore)}
          </div>
          
          {opportunity.isUrgent && (
            <Badge className="bg-red-500 text-white w-fit">
              Urgent Opportunity
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-lg text-gray-700 dark:text-gray-300">
            {opportunity.description}
          </p>
        </CardContent>
      </Card>

      {/* Match Details */}
      {opportunity.matchScore && opportunity.matchScore >= 40 && (
        <Card className="mb-6 border-primary-200 dark:border-primary-800">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-primary" />
              Why This Matches Your Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {opportunity.matchReasons && opportunity.matchReasons.length > 0 ? (
              <ul className="space-y-2">
                {opportunity.matchReasons.map((reason: string, idx: number) => (
                  <li key={idx} className="flex items-start">
                    <Award className="w-4 h-4 mr-2 mt-0.5 text-primary flex-shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">
                This opportunity matches your profile with a score of {opportunity.matchScore}%
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Location & Time */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Location & Commitment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunity.location && (
              <div className="flex items-start">
                <MapPin className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{opportunity.location}</p>
                  {opportunity.isRemote && (
                    <Badge variant="outline" className="mt-1">Remote</Badge>
                  )}
                </div>
              </div>
            )}
            
            {opportunity.timeCommitment && (
              <div className="flex items-start">
                <Clock className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Time Commitment</p>
                  <p className="text-sm text-muted-foreground">{opportunity.timeCommitment}</p>
                </div>
              </div>
            )}

            {opportunity.volunteersNeeded && (
              <div className="flex items-start">
                <Users className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Volunteers Needed</p>
                  <p className="text-sm text-muted-foreground">{opportunity.volunteersNeeded} volunteer{opportunity.volunteersNeeded > 1 ? 's' : ''}</p>
                </div>
              </div>
            )}

            {opportunity.commitmentType && (
              <div className="flex items-start">
                <Briefcase className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Type</p>
                  <p className="text-sm text-muted-foreground capitalize">{opportunity.commitmentType.replace('-', ' ')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dates & Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {opportunity.category && (
              <div className="flex items-start">
                <Target className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Category</p>
                  <p className="text-sm text-muted-foreground capitalize">{opportunity.category}</p>
                </div>
              </div>
            )}

            {opportunity.startDate && (
              <div className="flex items-start">
                <Calendar className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Start Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(opportunity.startDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {opportunity.endDate && (
              <div className="flex items-start">
                <Calendar className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">End Date</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(opportunity.endDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}

            {opportunity.status && (
              <div className="flex items-start">
                <FileText className="w-5 h-5 mr-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Status</p>
                  <Badge variant={opportunity.status === 'open' ? 'default' : 'secondary'}>
                    {opportunity.status}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Skills */}
      {opportunity.requiredSkills && opportunity.requiredSkills.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Required Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {opportunity.requiredSkills.map((skill: string, idx: number) => (
                <Badge key={idx} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SDG Goals */}
      {opportunity.sdgGoals && opportunity.sdgGoals.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Sustainable Development Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {opportunity.sdgGoals.map((sdgNumber: number) => {
                const sdg = SDG_GOALS[sdgNumber];
                return sdg ? (
                  <Badge
                    key={sdgNumber}
                    style={{ backgroundColor: sdg.color }}
                    className="text-white"
                  >
                    Goal {sdgNumber}: {sdg.name}
                  </Badge>
                ) : null;
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {opportunity.requirements && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{opportunity.requirements}</p>
          </CardContent>
        </Card>
      )}

      {/* Benefits */}
      {opportunity.benefits && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">What You'll Gain</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap">{opportunity.benefits}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
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
  FileText,
  Share2,
  AlertCircle
} from "lucide-react";
import { SDG_GOALS } from "@shared/sdg-goals";

export default function OpportunityDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const opportunityId = parseInt(id!);
  
  const handleBack = () => {
    // Use history back to return to dashboard with framing intact
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/discover-opportunities");
    }
  };

  const { data: opportunity, isLoading } = useQuery<any>({
    queryKey: [`/api/opportunities/${opportunityId}`],
  });

  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#faf9f7] dark:bg-slate-900">
        <div className="sticky top-0 z-10 bg-blue-600 text-white px-4 py-3 md:hidden">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="p-4 md:p-6 space-y-4">
          <Skeleton className="h-64 w-full rounded-lg" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="w-full min-h-screen bg-[#faf9f7] dark:bg-slate-900 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Opportunity Not Found</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          The opportunity you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Opportunities
        </Button>
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
    <div className="w-full min-h-screen bg-[#faf9f7] dark:bg-slate-900 pb-20 md:pb-0">
      {/* Mobile Header */}
      <div className="sticky top-0 z-10 bg-blue-600 text-white px-4 py-3 flex items-center justify-between md:hidden">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-white hover:bg-blue-700 -ml-2" 
          onClick={handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold">Opportunity Detail</h1>
        <div className="w-10" />
      </div>

      {/* Offline Badge for mobile */}
      <div className="md:hidden px-4 pt-3 pb-0">
        <Badge className="bg-amber-500 text-white w-full justify-center">
          <AlertCircle className="h-3 w-3 mr-1" />
          Offline Mode: Data may be outdated
        </Badge>
      </div>

      {/* Desktop Back Button */}
      <div className="hidden md:block px-6 pt-6 pb-2">
        <Link href="/my-applications">
          <Button variant="ghost" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Applications
          </Button>
        </Link>
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden p-4 space-y-4">
        <Card className="overflow-hidden">
          {/* Hero Image */}
          <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Briefcase className="h-12 w-12 text-white opacity-50" />
          </div>

          <CardContent className="p-4 space-y-3">
            {/* Match Score */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h2 className="text-lg font-bold">{opportunity.title}</h2>
                {opportunity.organizationName && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {opportunity.organizationName}
                  </p>
                )}
              </div>
              {opportunity.matchScore && getMatchBadge(opportunity.matchScore)}
            </div>

            {/* Description - Shorter for mobile */}
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
              {opportunity.description}
            </p>

            {/* Key Info Section */}
            <div className="space-y-2 py-3 border-t border-b border-slate-200 dark:border-slate-700">
              {opportunity.timeCommitment && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{opportunity.timeCommitment}</span>
                </div>
              )}
              {opportunity.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>{opportunity.location}</span>
                </div>
              )}
            </div>

            {/* SDG Goals - Compact */}
            {opportunity.sdgGoals && opportunity.sdgGoals.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-semibold text-muted-foreground">SDG #{ opportunity.sdgGoals[0] }</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {opportunity.sdgGoals.slice(0, 2).map((sdgNumber: number) => {
                    const sdg = SDG_GOALS[sdgNumber];
                    return sdg ? (
                      <Badge
                        key={sdgNumber}
                        style={{ backgroundColor: sdg.color }}
                        className="text-white text-xs"
                      >
                        #{sdgNumber}
                      </Badge>
                    ) : null;
                  })}
                  {opportunity.sdgGoals.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{opportunity.sdgGoals.length - 2}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="pt-3 space-y-2">
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold h-12 text-base" data-testid="button-apply-opportunity">
                Apply for Opportunity
              </Button>
              <Button variant="outline" className="w-full h-10">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Why This Matches */}
        {opportunity.matchScore && opportunity.matchScore >= 40 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-base">
                <Award className="w-4 h-4 mr-2 text-primary flex-shrink-0" />
                Why This Matches
              </CardTitle>
            </CardHeader>
            <CardContent>
              {opportunity.matchReasons && opportunity.matchReasons.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {opportunity.matchReasons.slice(0, 2).map((reason: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-primary mr-2 flex-shrink-0">✓</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This opportunity matches your profile with a score of {opportunity.matchScore}%
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block p-6 max-w-4xl mx-auto space-y-6">
        {/* Header Card */}
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
    </div>
  );
}

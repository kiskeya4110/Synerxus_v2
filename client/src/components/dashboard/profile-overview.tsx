import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Award, Target, MapPin, Heart, Building2, Users, Globe, Mail, Phone } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { SDGDetailDialog } from "@/components/sdg/sdg-detail-dialog";
import { getSDGFullName } from "@shared/sdg-goals";


interface ProfileOverviewProps {
  userId: string | null;
  userType: string;
}

export default function ProfileOverview({ userId, userType }: ProfileOverviewProps) {
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<'skills' | 'interests' | 'needs' | 'goals' | 'sdgs' | null>(null);
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [showSDGDialog, setShowSDGDialog] = useState(false);
  
  const { data: currentUser, isLoading: isLoadingUser } = useQuery<any>({
    queryKey: ["/api/users/me", userId],
    enabled: !!userId
  });

  // Fetch volunteer profile data from intake endpoint
  const { data: volunteerData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["/api/intake/volunteer-profile", userId],
    enabled: !!userId && userType === 'volunteer',
    staleTime: 0,
    refetchOnMount: true,
    queryFn: async () => {
      if (!userId) return null;
      const url = `/api/intake/volunteer-profile?userId=${userId}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Fetch organization profile data from Settings
  const { data: orgData, isLoading: isLoadingOrgProfile } = useQuery({
    queryKey: ["/api/profile/organization", userId],
    enabled: !!userId && userType === 'organization',
    queryFn: async () => {
      if (!userId) return null;
      const url = `/api/profile/organization?userId=${userId}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    }
  });

  const volunteerProfile = volunteerData;
  const orgProfile = orgData?.organization;

  const isLoading = isLoadingUser || isLoadingProfile || isLoadingOrgProfile;
  const isVolunteer = userType === 'volunteer';
  const profile = isVolunteer ? volunteerProfile : orgProfile;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : currentUser?.email?.[0].toUpperCase();

  const handleSectionClick = (section: 'skills' | 'interests' | 'needs' | 'goals' | 'sdgs') => {
    setSelectedSection(section);
    setShowDetailsDialog(true);
  };

  const handleSDGClick = (sdgNumber: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedSDG(sdgNumber);
    setShowSDGDialog(true);
  };

  const renderDialogContent = () => {
    if (!selectedSection || !profile) return null;

    switch (selectedSection) {
      case 'skills':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              All skills listed in your profile
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.skills?.map((skill: string, index: number) => (
                <Badge key={index} variant="outline" className="text-sm py-1">{skill}</Badge>
              ))}
            </div>
          </div>
        );
      case 'interests':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Areas of interest and passion
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.interests?.map((interest: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-sm py-1">{interest}</Badge>
              ))}
            </div>
          </div>
        );
      case 'needs':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Volunteer skills and support needed
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.needs?.map((need: string, index: number) => (
                <Badge key={index} variant="outline" className="text-sm py-1">{need}</Badge>
              ))}
            </div>
          </div>
        );
      case 'goals':
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Organization mission and objectives
            </p>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-base">{profile.goals}</p>
            </div>
            {profile.description && (
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-2">About the Organization</h4>
                <p className="text-sm text-muted-foreground">{profile.description}</p>
              </div>
            )}
          </div>
        );
      case 'sdgs':
        const sdgList = isVolunteer ? (profile.preferredSdgs || profile.sdgGoals) : profile.primarySdgs;
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Sustainable Development Goals {isVolunteer ? 'you care about' : 'the organization focuses on'}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 sm:gap-4">
              {sdgList?.sort((a: number, b: number) => a - b).map((goal: number) => (
                <div 
                  key={goal} 
                  className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {UN_SDG_ICONS[goal] ? (
                    <img 
                      src={UN_SDG_ICONS[goal]} 
                      alt={`SDG ${goal}`}
                      className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm sm:text-base md:text-xl">
                      {goal}
                    </div>
                  )}
                  <span className="text-xs sm:text-sm text-center font-medium leading-tight line-clamp-2">
                    SDG {goal}: {getSDGFullName(goal)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getDialogTitle = () => {
    switch (selectedSection) {
      case 'skills': return 'All Skills';
      case 'interests': return 'Interests & Passions';
      case 'needs': return 'Volunteer Needs';
      case 'goals': return 'Organization Goals & Mission';
      case 'sdgs': return 'Sustainable Development Goals';
      default: return 'Details';
    }
  };

  return (
    <>
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Primary SDGs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* SDG Goals - Each individually clickable */}
        {((isVolunteer && (profile?.preferredSdgs?.length > 0 || profile?.sdgGoals?.length > 0)) || 
          (!isVolunteer && profile?.primarySdgs && profile.primarySdgs.length > 0)) && (
          <div 
            className="space-y-3"
            data-testid="clickable-sdgs"
          >
            <div className="flex items-center justify-between px-3 -mx-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Globe className="h-4 w-4" />
                <span>{isVolunteer ? "SDG Goals" : "Primary SDGs"}</span>
              </div>
              <span className="text-xs text-muted-foreground">Click to view details</span>
            </div>
            <TooltipProvider>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                {[...(isVolunteer ? (profile.preferredSdgs || []) : (profile.primarySdgs || []))]
                  .sort((a: number, b: number) => a - b)
                  .map((goal: number) => (
                    <Tooltip key={goal}>
                      <TooltipTrigger>
                        <div 
                          onClick={(e) => handleSDGClick(goal, e)}
                          className="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 border rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer hover:scale-105 hover:shadow-md"
                          data-testid={`sdg-goal-${goal}`}
                        >
                          {UN_SDG_ICONS[goal] ? (
                            <img 
                              src={UN_SDG_ICONS[goal]} 
                              alt={`SDG ${goal}`}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded"
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm sm:text-base">
                              {goal}
                            </div>
                          )}
                          <span className="text-[10px] sm:text-xs text-center line-clamp-2 font-medium leading-tight">
                            {getSDGFullName(goal)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click to view SDG {goal} details</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
              </div>
            </TooltipProvider>
          </div>
        )}

        {/* Empty State */}
        {!profile && (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3" data-testid="text-empty-profile">
              Add your SDG focus areas to see them here
            </p>
            <Link href={isVolunteer ? "/volunteer-intake" : "/organization-intake"}>
              <Button variant="outline" size="sm" data-testid="button-update-profile">
                Update Profile
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Details Dialog */}
    <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>
            {isVolunteer ? 'Your profile information' : 'Organization information'}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {renderDialogContent()}
        </div>
      </DialogContent>
    </Dialog>

    {/* Individual SDG Dialog - Reusable Component */}
    <SDGDetailDialog 
      sdgId={selectedSDG}
      open={showSDGDialog}
      onOpenChange={setShowSDGDialog}
    />
    </>
  );
}

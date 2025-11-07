import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Target, MapPin, Heart } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";

const SDG_LABELS: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water",
  7: "Clean Energy",
  8: "Decent Work",
  9: "Industry Innovation",
  10: "Reduced Inequalities",
  11: "Sustainable Cities",
  12: "Responsible Consumption",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life On Land",
  16: "Peace and Justice",
  17: "Partnerships"
};

interface ProfileOverviewProps {
  userId: string | null;
  userType: string;
}

export default function ProfileOverview({ userId, userType }: ProfileOverviewProps) {
  const { data: currentUser, isLoading: isLoadingUser } = useQuery<any>({
    queryKey: ["/api/users/me", userId],
    enabled: !!userId
  });

  // Fetch volunteer profile data from Settings
  const { data: volunteerData, isLoading: isLoadingProfile } = useQuery({
    queryKey: ["/api/profile/volunteer", userId],
    enabled: !!userId && userType === 'volunteer',
    queryFn: async () => {
      if (!userId) return null;
      const url = `/api/profile/volunteer?userId=${userId}`;
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

  const volunteerProfile = volunteerData?.volunteerProfile;
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Profile Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-16 w-16" data-testid="avatar-profile-overview">
            <AvatarImage src={currentUser?.avatar || profile?.profilePhotoUrl} />
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold text-lg" data-testid="text-user-name">{currentUser?.displayName || currentUser?.username}</h3>
            {profile?.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span data-testid="text-location">{profile.location}</span>
              </div>
            )}
          </div>
        </div>

        {/* Skills */}
        {isVolunteer && profile?.skills && profile.skills.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>Skills</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.skills.slice(0, 5).map((skill: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-skill-${skill}`}>{skill}</Badge>
              ))}
              {profile.skills.length > 5 && (
                <Badge variant="outline" className="text-xs" data-testid="badge-skill-more">+{profile.skills.length - 5} more</Badge>
              )}
            </div>
          </div>
        )}

        {/* Interests */}
        {isVolunteer && profile?.interests && profile.interests.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>Interests</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.interests.slice(0, 5).map((interest: string, index: number) => (
                <Badge key={index} variant="secondary" className="text-xs" data-testid={`badge-interest-${interest}`}>{interest}</Badge>
              ))}
              {profile.interests.length > 5 && (
                <Badge variant="secondary" className="text-xs" data-testid="badge-interest-more">+{profile.interests.length - 5} more</Badge>
              )}
            </div>
          </div>
        )}

        {/* Organization Needs */}
        {!isVolunteer && profile?.needs && profile.needs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>Volunteer Needs</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.needs.slice(0, 5).map((need: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs" data-testid={`badge-need-${need}`}>{need}</Badge>
              ))}
              {profile.needs.length > 5 && (
                <Badge variant="outline" className="text-xs" data-testid="badge-need-more">+{profile.needs.length - 5} more</Badge>
              )}
            </div>
          </div>
        )}

        {/* Organization Goals */}
        {!isVolunteer && profile?.goals && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>Goals</span>
            </div>
            <p className="text-xs text-muted-foreground" data-testid="text-goals">
              {profile.goals.length > 100 ? `${profile.goals.substring(0, 100)}...` : profile.goals}
            </p>
          </div>
        )}

        {/* SDG Goals - Use primarySdgs for organizations, sdgGoals for volunteers */}
        {((isVolunteer && profile?.sdgGoals && profile.sdgGoals.length > 0) || 
          (!isVolunteer && profile?.primarySdgs && profile.primarySdgs.length > 0)) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Target className="h-4 w-4" />
              <span>{isVolunteer ? "SDG Goals" : "Primary SDGs"}</span>
            </div>
            <TooltipProvider>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[...(isVolunteer ? profile.sdgGoals : profile.primarySdgs)]
                  .sort((a: number, b: number) => a - b)
                  .map((goal: number) => (
                    <Tooltip key={goal}>
                      <TooltipTrigger>
                        <div 
                          className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                          data-testid={`sdg-goal-${goal}`}
                        >
                          {UN_SDG_ICONS[goal] ? (
                            <img 
                              src={UN_SDG_ICONS[goal]} 
                              alt={`SDG ${goal}`}
                              className="w-12 h-12 rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base">
                              {goal}
                            </div>
                          )}
                          <span className="text-xs text-center line-clamp-2 font-medium leading-tight">
                            {SDG_LABELS[goal]}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>SDG {goal}: {SDG_LABELS[goal]}</p>
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
              Complete your profile to see your information here
            </p>
            <Link href="/settings">
              <a>
                <Button variant="outline" size="sm" data-testid="button-update-profile">
                  Update Profile
                </Button>
              </a>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

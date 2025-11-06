import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Mail, MapPin, Award, Briefcase, Target, Users } from "lucide-react";
import SDGIcons from "@/assets/sdg-icons";

const SDG_LABELS = {
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

export default function Profile() {
  const userId = localStorage.getItem('currentUserId');
  
  // First, fetch basic user info to determine userType
  const { data: currentUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    }
  });
  
  // Fetch volunteer profile data (combines user and volunteer matching data)
  const { data: volunteerData, isLoading: isLoadingVolunteer } = useQuery({
    queryKey: ["/api/profile/volunteer", userId],
    enabled: !!userId && currentUser?.userType === 'volunteer',
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const url = `/api/profile/volunteer?userId=${id}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    }
  });

  // Fetch organization profile data (combines user, organization, and matchable org data)
  const { data: orgData, isLoading: isLoadingOrg } = useQuery({
    queryKey: ["/api/profile/organization", userId],
    enabled: !!userId && currentUser?.userType === 'organization',
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const url = `/api/profile/organization?userId=${id}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      return response.json();
    }
  });

  const isLoading = isLoadingUser || isLoadingVolunteer || isLoadingOrg;
  const volunteerProfile = volunteerData?.volunteerProfile;
  const organizationData = orgData?.organization;
  const matchableOrgData = orgData?.matchableOrganization;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isVolunteer = currentUser?.userType === 'volunteer';
  const profile = isVolunteer ? volunteerProfile : organizationData;
  
  // For organizations, use primarySdgs from organization data instead of sdgGoals
  const sdgsToDisplay = isVolunteer 
    ? volunteerProfile?.sdgGoals 
    : organizationData?.primarySdgs;
  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : currentUser?.email?.[0].toUpperCase();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        {/* Header Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <Avatar className="h-32 w-32">
                <AvatarImage src={currentUser?.avatar || profile?.profilePhotoUrl || matchableOrgData?.profilePhotoUrl} />
                <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-3xl font-bold">{currentUser?.displayName || currentUser?.username}</h1>
                  <Badge variant={isVolunteer ? "default" : "secondary"}>
                    {isVolunteer ? "Volunteer" : "Organization"}
                  </Badge>
                </div>
                
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{currentUser?.email}</span>
                </div>
                
                {(profile?.location || matchableOrgData?.location) && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{profile?.location || matchableOrgData?.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            {(currentUser?.bio || profile?.mission || matchableOrgData?.mission) && (
              <div className="mt-6">
                <p className="text-muted-foreground">
                  {currentUser?.bio || profile?.mission || matchableOrgData?.mission || "No bio available"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills/Needs Section */}
        {isVolunteer && profile?.skills && profile.skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: string, index: number) => (
                  <Badge key={index} variant="outline">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isVolunteer && ((profile?.needs && profile.needs.length > 0) || (matchableOrgData?.needs && matchableOrgData.needs.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Volunteer Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {(profile?.needs || matchableOrgData?.needs || []).map((need: string, index: number) => (
                  <Badge key={index} variant="outline">{need}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Interests/Mission Section */}
        {isVolunteer && profile?.interests && profile.interests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Interests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map((interest: string, index: number) => (
                  <Badge key={index} variant="secondary">{interest}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals Section for Organizations */}
        {!isVolunteer && profile?.goals && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{profile.goals}</p>
            </CardContent>
          </Card>
        )}

        {/* SDG Goals Section */}
        {sdgsToDisplay && sdgsToDisplay.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {isVolunteer ? "Sustainable Development Goals" : "Primary SDG Focus Areas"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {[...sdgsToDisplay].sort((a: number, b: number) => a - b).map((goal: number) => (
                    <Tooltip key={goal}>
                      <TooltipTrigger>
                        <div className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          {SDGIcons[goal] ? (
                            SDGIcons[goal]({ width: 60, height: 60 })
                          ) : (
                            <div className="w-15 h-15 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                              {goal}
                            </div>
                          )}
                          <span className="text-xs text-center line-clamp-2 font-medium">
                            {SDG_LABELS[goal as keyof typeof SDG_LABELS]}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>SDG {goal}: {SDG_LABELS[goal as keyof typeof SDG_LABELS]}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!profile && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>Complete your profile in Settings to show more information here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

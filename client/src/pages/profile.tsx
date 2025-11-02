import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, MapPin, Award, Briefcase, Target, Users } from "lucide-react";

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
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    }
  });

  const { data: volunteerProfile } = useQuery({
    queryKey: ["/api/volunteers", currentUser?.email],
    enabled: !!currentUser?.email && currentUser?.userType === 'volunteer',
    queryFn: async () => {
      const response = await fetch(`/api/volunteers?email=${currentUser?.email}`);
      const volunteers = await response.json();
      return volunteers[0];
    }
  });

  const { data: orgProfile } = useQuery({
    queryKey: ["/api/matchable-organizations", currentUser?.email],
    enabled: !!currentUser?.email && currentUser?.userType === 'organization',
    queryFn: async () => {
      const response = await fetch(`/api/matchable-organizations?email=${currentUser?.email}`);
      const orgs = await response.json();
      return orgs[0];
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isVolunteer = currentUser?.userType === 'volunteer';
  const profile = isVolunteer ? volunteerProfile : orgProfile;
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
                <AvatarImage src={currentUser?.avatar || profile?.profilePhotoUrl} />
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
                
                {profile?.location && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>{profile.location}</span>
                  </div>
                )}
              </div>
            </div>
            
            {(currentUser?.bio || profile?.mission) && (
              <div className="mt-6">
                <p className="text-muted-foreground">
                  {currentUser?.bio || profile?.mission || "No bio available"}
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

        {!isVolunteer && profile?.needs && profile.needs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Volunteer Needs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.needs.map((need: string, index: number) => (
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

        {/* SDG Goals Section */}
        {profile?.sdgGoals && profile.sdgGoals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Sustainable Development Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {profile.sdgGoals.map((goal: number) => (
                  <div key={goal} className="flex items-center gap-2 p-2 border rounded">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      {goal}
                    </div>
                    <span className="text-sm">{SDG_LABELS[goal as keyof typeof SDG_LABELS]}</span>
                  </div>
                ))}
              </div>
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

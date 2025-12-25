import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Mail, MapPin, Award, Briefcase, Target, Users, 
  Star, Clock, TrendingUp, Calendar, FolderKanban,
  Activity, CheckCircle2, Globe, X
} from "lucide-react";
import { UN_SDG_ICONS } from "@/assets/un-sdg-icons";
import { Link } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import { calculateProficiencyStats, getFormattedAverageProficiency, getProficiencySummary } from "@/lib/proficiency-utils";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import OrganizationHeader from "@/components/layout/organization-header";
import VolunteerNav from "@/components/layout/volunteer-nav";
import Footer from "@/components/layout/footer";
import { useIsMobile } from "@/hooks/use-mobile";

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

const SDG_DESCRIPTIONS = {
  1: "End poverty in all its forms. Eradicate extreme poverty and promote shared prosperity through economic growth and social protection.",
  2: "End hunger and achieve food security. Promote sustainable agriculture and support rural development for a world without hunger.",
  3: "Ensure healthy lives and promote well-being. Achieve universal health coverage and reduce mortality rates across all age groups.",
  4: "Quality education for all. Ensure inclusive and equitable education opportunities and lifelong learning for everyone.",
  5: "Achieve gender equality and empower all women and girls worldwide through equal rights and participation.",
  6: "Clean water and sanitation for all. Ensure access to safe water and improve sanitation and hygiene globally.",
  7: "Affordable and clean energy. Increase use of renewable energy and improve energy efficiency for sustainable development.",
  8: "Decent work and economic growth. Promote sustained economic growth and decent work opportunities for all.",
  9: "Build resilient infrastructure and foster innovation. Promote sustainable industrialization and technological advancement.",
  10: "Reduce inequality within and among countries. Promote social, economic, and political inclusion of all people.",
  11: "Sustainable cities and communities. Create inclusive, safe, resilient, and sustainable cities and human settlements.",
  12: "Responsible consumption and production. Ensure sustainable production and consumption patterns.",
  13: "Climate action. Combat climate change and its impacts through urgent and ambitious action.",
  14: "Protect and conserve oceans, seas, and marine life for sustainable development.",
  15: "Protect forests and combat desertification. Promote sustainable use of terrestrial ecosystems and biodiversity.",
  16: "Promote just, peaceful, and inclusive societies. Strengthen institutions and reduce all forms of violence.",
  17: "Partnerships for the goals. Strengthen global partnerships for sustainable development implementation."
};

export default function Profile() {
  const [selectedSdg, setSelectedSdg] = useState<number | null>(null);
  const isMobile = useIsMobile();
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
  
  // Fetch volunteer profile data - use intake endpoint to get weeklyAvailability
  const { data: volunteerData, isLoading: isLoadingVolunteer } = useQuery({
    queryKey: ["/api/intake/volunteer-profile", userId],
    enabled: !!userId && currentUser?.userType === 'volunteer',
    staleTime: 0, // Always refetch fresh data
    refetchOnMount: true, // Force fresh load on component mount
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const url = `/api/intake/volunteer-profile?userId=${id}`;
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

  // Fetch volunteer activities for contribution stats
  const { data: activities } = useQuery({
    queryKey: ["/api/volunteer-activities", userId],
    enabled: !!userId && currentUser?.userType === 'volunteer',
    staleTime: 0, // Always refetch fresh data for real-time updates
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${id}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch current projects (via project assignments)
  const { data: assignments } = useQuery({
    queryKey: ["/api/project-assignments", userId],
    enabled: !!userId && currentUser?.userType === 'volunteer',
    staleTime: 0, // Always refetch fresh data for real-time updates
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return [];
      const response = await fetch(`/api/project-assignments?volunteerId=${id}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  const isLoading = isLoadingUser || isLoadingVolunteer || isLoadingOrg;
  // volunteerData is directly the profile from /api/intake/volunteer-profile endpoint
  const volunteerProfile = volunteerData;
  const organizationData = orgData?.organization;
  const matchableOrgData = orgData?.matchableOrganization;

  // Calculate contribution stats for volunteers
  const activitiesArray = Array.isArray(activities) ? activities : [];
  const assignmentsArray = Array.isArray(assignments) ? assignments : [];
  
  const totalHours = activitiesArray.reduce((sum: number, activity: any) => sum + (activity.hours || 0), 0);
  const totalActivities = activitiesArray.length;
  const activeProjects = assignmentsArray.filter((a: any) => a.status === 'active').length;
  const completedProjects = assignmentsArray.filter((a: any) => a.status === 'completed').length;
  
  // Recent activities (last 5)
  const recentActivities = activitiesArray.slice(0, 5);
  
  // Current projects from active assignments
  const currentProjects = assignmentsArray.filter((a: any) => a.status === 'active').slice(0, 5);

  // Calculate profile completion score based on settings data
  const calculateProfileCompleteness = () => {
    if (!volunteerProfile) return 0;
    let completedFields = 0;
    let totalFields = 0;
    
    // Check critical fields
    if (volunteerProfile.volunteerName) completedFields++;
    totalFields++;
    
    if (volunteerProfile.professionalTitle) completedFields++;
    totalFields++;
    
    if (volunteerProfile.skills && Array.isArray(volunteerProfile.skills) && volunteerProfile.skills.length > 0) completedFields++;
    totalFields++;
    
    if (typeof volunteerProfile.weeklyAvailability === 'number' && volunteerProfile.weeklyAvailability > 0) completedFields++;
    totalFields++;
    
    if (volunteerProfile.preferredSdgs && Array.isArray(volunteerProfile.preferredSdgs) && volunteerProfile.preferredSdgs.length > 0) completedFields++;
    totalFields++;
    
    if (volunteerProfile.preferredWorkStyle) completedFields++;
    totalFields++;
    
    if (volunteerProfile.location) completedFields++;
    totalFields++;
    
    return Math.round((completedFields / totalFields) * 100);
  };

  // Calculate skill diversity score from proficiency ratings
  const calculateSkillScore = () => {
    if (!volunteerProfile?.skillRatings) return 0;
    const ratings = typeof volunteerProfile.skillRatings === 'object' ? Object.values(volunteerProfile.skillRatings) : [];
    if (ratings.length === 0) return 0;
    const avgRating = (ratings.reduce((sum: number, r: unknown) => sum + (typeof r === 'number' ? r : 0), 0) / ratings.length);
    return Math.round(avgRating / 20); // Convert 0-100 to 0-5 star scale
  };

  const isOrganization = currentUser?.userType === 'organization';

  if (isLoading) {
    return (
      <>
        {isOrganization && <OrganizationHeader activeTab="profile" />}
        {!isOrganization && <VolunteerNav />}
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full" />
        </div>
      </>
    );
  }

  const isVolunteer = currentUser?.userType === 'volunteer';
  const profile = isVolunteer ? volunteerProfile : organizationData;

  // For organizations, use primarySdgs from organization data instead of sdgGoals
  const sdgsToDisplay = isVolunteer
    ? volunteerProfile?.preferredSdgs
    : organizationData?.primarySdgs;
  const initials = currentUser?.displayName
    ? currentUser.displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase()
    : currentUser?.email?.[0].toUpperCase();

  return (
    <div className={isVolunteer ? "bg-[#f8f9fa] min-h-screen" : ""}>
      {isOrganization && <OrganizationHeader activeTab="profile" />}
      {isVolunteer && <VolunteerNav />}
      <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '24px' }}>
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

        {/* Volunteer Stats Cards */}
        {isVolunteer && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/volunteer-intake">
              <div className="cursor-pointer hover:opacity-80 transition-opacity">
                <Card className="hover:border-primary/50 transition-colors" data-testid="card-overall-rating">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Overall Rating</CardTitle>
                    <Star className="h-4 w-4 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">{formatDecimal(calculateSkillScore() || 0)}</div>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${star <= (calculateSkillScore() || 0) ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {volunteerProfile?.skills && volunteerProfile.skills.length > 0 
                        ? `${volunteerProfile.skills.length} skills rated` 
                        : 'Add skills to see rating'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </Link>

            <Link href="/volunteer-intake">
              <div className="cursor-pointer hover:opacity-80 transition-opacity">
                <Card className="hover:border-primary/50 transition-colors" data-testid="card-availability">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Availability</CardTitle>
                    <Clock className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const weeklyHours = volunteerProfile?.weeklyAvailability || 0;
                      const totalSlotHours = (volunteerProfile?.availability || []).reduce((sum: number, slot: any) => {
                        const start = parseInt(slot.startTime?.split(':')[0] || 0);
                        const end = parseInt(slot.endTime?.split(':')[0] || 0);
                        return sum + (end - start);
                      }, 0);
                      const actualAvailability = Math.min(weeklyHours, totalSlotHours);
                      return <div className="text-2xl font-bold">{actualAvailability} hrs</div>;
                    })()}
                    <p className="text-xs text-muted-foreground mt-1">
                      {volunteerProfile?.availability && Array.isArray(volunteerProfile.availability) && volunteerProfile.availability.length > 0 
                        ? `${volunteerProfile.availability.length} time slot${volunteerProfile.availability.length > 1 ? 's' : ''} set` 
                        : 'No time slots set'}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </Link>

            <Link href="/calendar">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" data-testid="card-total-hours">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalHours.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalActivities > 0 
                      ? `${totalActivities} activities recorded` 
                      : 'No activities logged yet'}
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/assignments">
              <Card className="cursor-pointer hover:border-primary/50 transition-colors" data-testid="card-projects">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Projects</CardTitle>
                  <FolderKanban className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{activeProjects}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedProjects > 0 
                      ? `${completedProjects} completed` 
                      : 'Active projects'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
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
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setSelectedSdg(goal)}
                          className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors cursor-pointer hover:border-primary/50"
                          data-testid={`sdg-button-${goal}`}
                        >
                          {UN_SDG_ICONS[goal] ? (
                            <img 
                              src={UN_SDG_ICONS[goal]} 
                              alt={`SDG ${goal}`}
                              className="w-15 h-15 rounded"
                            />
                          ) : (
                            <div className="w-15 h-15 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                              {goal}
                            </div>
                          )}
                          <span className="text-xs text-center line-clamp-2 font-medium">
                            {SDG_LABELS[goal as keyof typeof SDG_LABELS]}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Learn more about SDG {goal}</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>

              {/* SDG Details Modal */}
              <Dialog open={selectedSdg !== null} onOpenChange={(open) => !open && setSelectedSdg(null)}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <div className="flex items-center gap-3 mb-4">
                      {UN_SDG_ICONS[selectedSdg as number] ? (
                        <img 
                          src={UN_SDG_ICONS[selectedSdg as number]} 
                          alt={`SDG ${selectedSdg}`}
                          className="w-12 h-12 rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
                          {selectedSdg}
                        </div>
                      )}
                      <div>
                        <DialogTitle className="text-lg">
                          SDG {selectedSdg}: {SDG_LABELS[selectedSdg as keyof typeof SDG_LABELS]}
                        </DialogTitle>
                      </div>
                    </div>
                  </DialogHeader>
                  <DialogDescription className="text-base leading-relaxed">
                    {SDG_DESCRIPTIONS[selectedSdg as keyof typeof SDG_DESCRIPTIONS]}
                  </DialogDescription>
                  <Button 
                    onClick={() => setSelectedSdg(null)}
                    className="w-full mt-4"
                    variant="outline"
                  >
                    Close
                  </Button>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        {/* Skills & Proficiency */}
        {isVolunteer && volunteerProfile?.skillRatings && (() => {
          const proficiencyStats = calculateProficiencyStats(volunteerProfile.skillRatings as Record<string, number>);
          return proficiencyStats.hasSkills && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Skills & Proficiency
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your professional skills and proficiency levels
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(volunteerProfile.skillRatings as Record<string, number>)
                    .filter(([_, proficiency]) => {
                      const num = Number(proficiency);
                      return typeof num === 'number' && !isNaN(num) && num >= 0 && num <= 100;
                    })
                    .map(([skillName, proficiency], index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{skillName}</span>
                          <span className="text-sm font-semibold text-primary">{proficiency}%</span>
                        </div>
                        <Progress value={proficiency} className="h-2" />
                      </div>
                    ))}
                </div>
                
                {/* Average Proficiency Summary */}
                <div className="mt-6 pt-6 border-t space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Average Total Proficiency</p>
                    <Badge variant="default" className="text-base px-3 py-1">
                      {getFormattedAverageProficiency(proficiencyStats)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {getProficiencySummary(proficiencyStats)}
                    </p>
                  </div>
                </div>
                
                <div className="mt-6 pt-4">
                  <Link href="/volunteer-intake">
                    <Button variant="outline" className="w-full" data-testid="button-edit-skills">
                      <Award className="mr-2 h-4 w-4" />
                      Edit Skills in Settings
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* Availability Details */}
        {isVolunteer && volunteerProfile && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Availability & Work Preferences
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Your time commitment and work style preferences
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Weekly Availability */}
                <div className="flex flex-col gap-2">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="font-medium">Weekly Availability</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {(() => {
                      const weeklyHours = volunteerProfile.weeklyAvailability || 0;
                      const totalSlotHours = (volunteerProfile?.availability || []).reduce((sum: number, slot: any) => {
                        const start = parseInt(slot.startTime?.split(':')[0] || 0);
                        const end = parseInt(slot.endTime?.split(':')[0] || 0);
                        return sum + (end - start);
                      }, 0);
                      return Math.min(weeklyHours, totalSlotHours);
                    })()} hrs
                  </p>
                  <p className="text-xs text-muted-foreground">
                    per week commitment
                  </p>
                </div>

                {/* Preferred Work Style */}
                {volunteerProfile.preferredWorkStyle && (
                  <div className="flex flex-col gap-2">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="font-medium">Work Style</p>
                    <Badge variant="secondary" className="capitalize w-fit">
                      {volunteerProfile.preferredWorkStyle}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {volunteerProfile.preferredWorkStyle === 'remote' && 'Remote work'}
                      {volunteerProfile.preferredWorkStyle === 'in-person' && 'On-site work'}
                      {volunteerProfile.preferredWorkStyle === 'hybrid' && 'Flexible'}
                    </p>
                  </div>
                )}

                {/* Preferred Commitment */}
                {volunteerProfile.preferredCommitment && (
                  <div className="flex flex-col gap-2">
                    <div className="h-10 w-10 rounded-lg bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <p className="font-medium">Commitment</p>
                    <Badge variant="secondary" className="capitalize w-fit">
                      {volunteerProfile.preferredCommitment.replace('-', ' ')}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {volunteerProfile.preferredCommitment === 'one-time' && 'One-time'}
                      {volunteerProfile.preferredCommitment === 'short-term' && 'Weeks to months'}
                      {volunteerProfile.preferredCommitment === 'long-term' && 'Long-term'}
                      {volunteerProfile.preferredCommitment === 'flexible' && 'Flexible'}
                    </p>
                  </div>
                )}

                {/* Timezone */}
                {volunteerProfile.timezone && (
                  <div className="flex flex-col gap-2">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/20 flex items-center justify-center">
                      <Globe className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="font-medium">Timezone</p>
                    <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
                      {volunteerProfile.timezone}
                    </p>
                  </div>
                )}

                {/* Years of Experience */}
                {volunteerProfile.yearsOfExperience && (
                  <div className="flex flex-col gap-2">
                    <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <p className="font-medium">Experience</p>
                    <Badge variant="secondary" className="w-fit">
                      {volunteerProfile.yearsOfExperience}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      years in field
                    </p>
                  </div>
                )}
              </div>

              {/* Time Slots */}
              {volunteerProfile.availability && Array.isArray(volunteerProfile.availability) && volunteerProfile.availability.length > 0 && (
                <div className="mb-6 pb-6 border-b">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-3">Available Time Slots</p>
                      <div className="space-y-2">
                        {(volunteerProfile.availability as any[]).map((slot: any, index: number) => {
                          const hasValidTimes = slot.startTime && slot.endTime;
                          const timeDisplay = hasValidTimes 
                            ? `${slot.startTime} - ${slot.endTime}` 
                            : 'Time not specified';
                          
                          return (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="capitalize min-w-[100px]">
                                {slot.day || 'Unspecified'}
                              </Badge>
                              <span className={hasValidTimes ? 'text-muted-foreground' : 'text-muted-foreground italic'}>
                                {timeDisplay}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t">
                <Link href="/volunteer-intake">
                  <Button variant="outline" className="w-full" data-testid="button-edit-availability">
                    <Clock className="mr-2 h-4 w-4" />
                    Update Availability in Settings
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        {isVolunteer && recentActivities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities.map((activity: any, index: number) => (
                  <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{activity.description || 'Activity logged'}</p>
                        <Badge variant="secondary">{activity.hours} hrs</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                      {activity.skillsApplied && activity.skillsApplied.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activity.skillsApplied.map((skill: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">{skill}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Projects */}
        {isVolunteer && currentProjects.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                Current Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentProjects.map((assignment: any, index: number) => (
                  <Link key={index} href={`/projects/${assignment.projectId}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">{assignment.projectName || `Project #${assignment.projectId}`}</p>
                          {assignment.role && (
                            <p className="text-sm text-muted-foreground">{assignment.role}</p>
                          )}
                        </div>
                      </div>
                      <Badge>{assignment.hoursCompleted || 0} hrs</Badge>
                    </div>
                  </Link>
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

        {/* Empty State */}
        {!profile && (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>Complete your profile in Settings to show more information here.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobile Bottom Navigation - Only for organizations */}
      {isOrganization && <MobileBottomNav />}

      {/* Footer - Hidden on mobile */}
      {!isMobile && <Footer />}
    </div>
    </div>
  );
}

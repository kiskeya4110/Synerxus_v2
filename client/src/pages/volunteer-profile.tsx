import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Briefcase, Award, Globe, Clock, Calendar, Target, Heart, Sliders } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

const SDG_LABELS: Record<number, string> = {
  1: "1. No Poverty", 2: "2. Zero Hunger", 3: "3. Good Health", 4: "4. Quality Education",
  5: "5. Gender Equality", 6: "6. Clean Water", 7: "7. Clean Energy", 8: "8. Decent Work",
  9: "9. Industry Innovation", 10: "10. Reduced Inequalities", 11: "11. Sustainable Cities",
  12: "12. Responsible Consumption", 13: "13. Climate Action", 14: "14. Life Below Water",
  15: "15. Life On Land", 16: "16. Peace and Justice", 17: "17. Partnerships"
};

export default function VolunteerProfile() {
  const userId = localStorage.getItem("currentUserId");
  
  const { data: profileData, isLoading } = useQuery<any>({
    queryKey: ["/api/intake/volunteer-profile", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/intake/volunteer-profile?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-700">Profile Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-amber-600 mb-4">You haven't created your volunteer profile yet.</p>
            <Link href="/volunteer-intake">
              <Button>Create Your Profile</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Volunteer Profile</h1>
          <p className="text-muted-foreground">Your complete profile information</p>
        </div>
        <Link href="/volunteer-intake">
          <Button variant="outline">Edit Profile</Button>
        </Link>
      </div>

      {/* Personal Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{profileData.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{profileData.name}</p>
            </div>
            {profileData.professionalTitle && (
              <div>
                <p className="text-sm text-muted-foreground">Professional Title</p>
                <p className="font-medium">{profileData.professionalTitle}</p>
              </div>
            )}
            {profileData.yearsOfExperience && (
              <div>
                <p className="text-sm text-muted-foreground">Years of Experience</p>
                <p className="font-medium">{profileData.yearsOfExperience}</p>
              </div>
            )}
            {profileData.linkedinProfile && (
              <div className="md:col-span-2">
                <p className="text-sm text-muted-foreground">LinkedIn Profile</p>
                <a href={profileData.linkedinProfile} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {profileData.linkedinProfile}
                </a>
              </div>
            )}
            {profileData.location && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Location
                </p>
                <p className="font-medium">{profileData.location}</p>
              </div>
            )}
            {profileData.languages && profileData.languages.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">Languages</p>
                <div className="flex flex-wrap gap-2">
                  {profileData.languages.map((lang: string) => (
                    <Badge key={lang}>{lang}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Skills & Proficiency */}
      {profileData.skills && profileData.skills.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Skills & Proficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profileData.skills.map((skill: any) => (
                <div key={skill.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{skill.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-full bg-blue-600 rounded-full"
                        style={{ width: `${skill.proficiency}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold min-w-[45px]">{skill.proficiency}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interests & Causes */}
      {profileData.interests && profileData.interests.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Interests & Causes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {profileData.interests.map((interest: string) => (
                <Badge key={interest} variant="secondary">{interest}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SDG Goals */}
      {profileData.sdgGoals && profileData.sdgGoals.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Sustainable Development Goals</CardTitle>
            <CardDescription>Goals you're passionate about</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {profileData.sdgGoals.map((sdgId: number) => (
                <Badge key={sdgId} variant="outline">{SDG_LABELS[sdgId]}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Availability & Preferences */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Availability & Work Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileData.timezone && (
            <div>
              <p className="text-sm text-muted-foreground">Timezone</p>
              <p className="font-medium">{profileData.timezone}</p>
            </div>
          )}
          {profileData.weeklyHours && (
            <div>
              <p className="text-sm text-muted-foreground">Weekly Hours Available</p>
              <p className="font-medium">{profileData.weeklyHours} hours/week</p>
            </div>
          )}
          {profileData.preferredCommitment && (
            <div>
              <p className="text-sm text-muted-foreground">Preferred Commitment Type</p>
              <Badge>{profileData.preferredCommitment}</Badge>
            </div>
          )}
          {profileData.preferredWorkStyle && (
            <div>
              <p className="text-sm text-muted-foreground">Preferred Work Style</p>
              <Badge>{profileData.preferredWorkStyle}</Badge>
            </div>
          )}
          
          {/* Availability Schedule */}
          {profileData.availability && profileData.availability.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Availability Schedule</p>
              <div className="space-y-2">
                {profileData.availability.map((slot: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded">
                    <Badge variant="outline" className="capitalize min-w-fit">{slot.day}</Badge>
                    <span className="text-sm">{slot.startTime} - {slot.endTime}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matching Priorities */}
      {profileData.matchingPriorities && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5" />
              Matching Priorities
            </CardTitle>
            <CardDescription>Your importance ratings for match factors (1 = Not Important, 5 = Very Important)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'skillsMatch', label: 'Skills Match' },
              { key: 'causeAlignment', label: 'Cause Alignment' },
              { key: 'timeFlexibility', label: 'Time Flexibility' },
              { key: 'geographicPreference', label: 'Geographic Preference' },
              { key: 'impactPotential', label: 'Impact Potential' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="font-medium">{label}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${((profileData.matchingPriorities[key as keyof typeof profileData.matchingPriorities] || 3) / 5) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold min-w-fit">
                    {profileData.matchingPriorities[key as keyof typeof profileData.matchingPriorities] || 3}/5
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

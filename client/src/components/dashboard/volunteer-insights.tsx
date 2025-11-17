import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  User, 
  MapPin, 
  Briefcase, 
  Heart, 
  Target, 
  Globe, 
  Clock, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  TrendingUp,
  Monitor
} from "lucide-react";
import { Link } from "wouter";

interface VolunteerProfile {
  skills?: string[];
  interests?: string[];
  location?: string;
  preferredSdgs?: number[];
  languages?: string[];
  motivations?: string;
  weeklyAvailability?: number;
  preferredWorkStyle?: string;
  profileCompleteness?: number;
}

interface ApplicationStats {
  total: number;
  pending: number;
  accepted: number;
  rejected: number;
}

interface HoursBreakdown {
  projectId: number;
  projectName: string;
  hours: number;
  activityCount: number;
}

interface VolunteerInsightsSectionProps {
  volunteerProfile: VolunteerProfile | null;
  applicationStats: ApplicationStats;
  hoursByProject: HoursBreakdown[];
}

const SDG_NAMES: Record<number, string> = {
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
  15: "Life on Land",
  16: "Peace and Justice",
  17: "Partnerships",
};

const SDG_COLORS: Record<number, string> = {
  1: "#E5243B",
  2: "#DDA63A",
  3: "#4C9F38",
  4: "#C5192D",
  5: "#FF3A21",
  6: "#26BDE2",
  7: "#FCC30B",
  8: "#A21942",
  9: "#FD6925",
  10: "#DD1367",
  11: "#FD9D24",
  12: "#BF8B2E",
  13: "#3F7E44",
  14: "#0A97D9",
  15: "#56C02B",
  16: "#00689D",
  17: "#19486A",
};

export function VolunteerInsightsSection({ 
  volunteerProfile, 
  applicationStats, 
  hoursByProject 
}: VolunteerInsightsSectionProps) {
  const completeness = volunteerProfile?.profileCompleteness || 0;
  const hasProfile = volunteerProfile !== null;
  const hasApplications = applicationStats && applicationStats.total > 0;
  const hasHours = hoursByProject && hoursByProject.length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Volunteer Insights</h2>
      
      {/* Row 1: Your Profile (Full Width) */}
      <Card data-testid="card-volunteer-profile">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Profile
            </CardTitle>
            <CardDescription>
              Profile completeness and information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Profile Completeness */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Profile Completeness</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">{completeness}%</span>
              </div>
              <Progress value={completeness} className="h-2" data-testid="progress-profile-completeness" />
            </div>

            {!hasProfile ? (
              <div className="text-center py-6 space-y-3">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete your profile to get better opportunity matches
                </p>
                <Link href="/volunteer-profile">
                  <Button size="sm" data-testid="button-complete-profile">
                    Complete Profile
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Location */}
                {volunteerProfile.location && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4" />
                      Location
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-6" data-testid="text-location">
                      {volunteerProfile.location}
                    </p>
                  </div>
                )}

                {/* Skills */}
                {volunteerProfile.skills && volunteerProfile.skills.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Briefcase className="h-4 w-4" />
                      Skills
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {volunteerProfile.skills.slice(0, 5).map((skill, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-xs"
                          data-testid={`badge-skill-${idx}`}
                        >
                          {skill}
                        </Badge>
                      ))}
                      {volunteerProfile.skills.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{volunteerProfile.skills.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {volunteerProfile.interests && volunteerProfile.interests.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Heart className="h-4 w-4" />
                      Interests
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {volunteerProfile.interests.slice(0, 5).map((interest, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-xs"
                          data-testid={`badge-interest-${idx}`}
                        >
                          {interest}
                        </Badge>
                      ))}
                      {volunteerProfile.interests.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{volunteerProfile.interests.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Languages */}
                {volunteerProfile.languages && volunteerProfile.languages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Globe className="h-4 w-4" />
                      Languages
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {volunteerProfile.languages.slice(0, 5).map((language, idx) => (
                        <Badge 
                          key={idx} 
                          variant="secondary" 
                          className="text-xs"
                          data-testid={`badge-language-${idx}`}
                        >
                          {language}
                        </Badge>
                      ))}
                      {volunteerProfile.languages.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{volunteerProfile.languages.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* SDG Goals */}
                {volunteerProfile.preferredSdgs && volunteerProfile.preferredSdgs.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Target className="h-4 w-4" />
                      SDG Focus Areas
                    </div>
                    <div className="flex flex-wrap gap-1 ml-6">
                      {volunteerProfile.preferredSdgs.slice(0, 3).map((sdg, idx) => (
                        <Badge 
                          key={idx}
                          className="text-xs text-white"
                          style={{ backgroundColor: SDG_COLORS[sdg] }}
                          data-testid={`badge-sdg-${idx}`}
                          title={SDG_NAMES[sdg]}
                        >
                          {sdg}. {SDG_NAMES[sdg]}
                        </Badge>
                      ))}
                      {volunteerProfile.preferredSdgs.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{volunteerProfile.preferredSdgs.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Motivations */}
                {volunteerProfile.motivations && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Heart className="h-4 w-4" />
                      Motivations
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-6 italic" data-testid="text-motivations">
                      "{volunteerProfile.motivations}"
                    </p>
                  </div>
                )}

                {/* Weekly Availability */}
                {volunteerProfile.weeklyAvailability !== undefined && volunteerProfile.weeklyAvailability !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Clock className="h-4 w-4" />
                      Weekly Availability
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-6" data-testid="text-weekly-availability">
                      {volunteerProfile.weeklyAvailability} hours/week
                    </p>
                  </div>
                )}

                {/* Work Style */}
                {volunteerProfile.preferredWorkStyle && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      <Monitor className="h-4 w-4" />
                      Work Style
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 ml-6 capitalize" data-testid="text-work-style">
                      {volunteerProfile.preferredWorkStyle}
                    </p>
                  </div>
                )}

                {/* Edit Profile CTA */}
                {completeness < 100 && (
                  <Link href="/volunteer-profile">
                    <Button variant="outline" size="sm" className="w-full" data-testid="button-edit-profile">
                      Complete Profile ({100 - completeness}% remaining)
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>

      {/* Row 2: Applications and Hours (2 Columns) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Application Stats Card */}
        <Card data-testid="card-application-stats">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Applications
            </CardTitle>
            <CardDescription>
              Your opportunity application status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applicationStats.total === 0 ? (
              <div className="text-center py-6 space-y-3">
                <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You haven't applied to any opportunities yet
                </p>
                <Link href="/discover-opportunities">
                  <Button size="sm" data-testid="button-discover-opportunities">
                    Discover Opportunities
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Total Applications */}
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-medium">Total Applications</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="stat-total-applications">
                    {applicationStats.total}
                  </span>
                </div>

                {/* Pending */}
                <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-medium">Pending</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="stat-pending-applications">
                    {applicationStats.pending}
                  </span>
                </div>

                {/* Accepted */}
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium">Accepted</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-accepted-applications">
                    {applicationStats.accepted}
                  </span>
                </div>

                {/* Rejected */}
                {applicationStats.rejected > 0 && (
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center">
                        <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      </div>
                      <span className="font-medium">Rejected</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600 dark:text-red-400" data-testid="stat-rejected-applications">
                      {applicationStats.rejected}
                    </span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hours Breakdown Card */}
        <Card data-testid="card-hours-breakdown">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Hours by Project
            </CardTitle>
            <CardDescription>
              Your contribution breakdown
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hoursByProject.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <Clock className="h-12 w-12 text-gray-400 mx-auto" />
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No volunteer hours logged yet
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Start contributing to projects to track your impact
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {hoursByProject.slice(0, 5).map((project, idx) => {
                  const maxHours = Math.max(...hoursByProject.map(p => p.hours));
                  const percentage = (project.hours / maxHours) * 100;
                  
                  return (
                    <div key={idx} className="space-y-2" data-testid={`hours-project-${idx}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <Link href={`/projects/${project.projectId}`}>
                            <p className="font-medium text-sm truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                              {project.projectName}
                            </p>
                          </Link>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {project.activityCount} {project.activityCount === 1 ? 'entry' : 'entries'}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-primary-600 dark:text-primary-400 ml-2" data-testid={`hours-value-${idx}`}>
                          {project.hours}h
                        </span>
                      </div>
                      <Progress value={percentage} className="h-1.5" />
                    </div>
                  );
                })}
                {hoursByProject.length > 5 && (
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 pt-2">
                    +{hoursByProject.length - 5} more projects
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

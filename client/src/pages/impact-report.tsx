import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Share2, Download, Copy, Printer, ArrowLeft } from "lucide-react";
import type { User, Task, ProjectAssignment } from "@shared/schema";
import { sdgGoals, getSDGName } from "@shared/sdg-goals";
import { useToast } from "@/hooks/use-toast";

interface ImpactReportProps {
  volunteerId?: string;
}

export default function ImpactReport(props: any) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isPrinting, setIsPrinting] = useState(false);

  // Get volunteer ID from URL params or current user
  const paramVolunteerId = props.volunteerId;
  const currentUserIdStr = localStorage.getItem('currentUserId');
  const volunteerId = paramVolunteerId ? parseInt(paramVolunteerId) : (currentUserIdStr ? parseInt(currentUserIdStr) : undefined);

  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", volunteerId],
    queryFn: async () => {
      const url = volunteerId ? `/api/users/me?userId=${volunteerId}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's tasks
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks", { volunteerId }],
    queryFn: async () => {
      const response = await fetch("/api/tasks");
      const allTasks = await response.json();
      return allTasks.filter((task: Task) => task.assigneeId === volunteerId);
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's project assignments
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", { volunteerId }],
    queryFn: async () => {
      const response = await fetch(`/api/project-assignments?volunteerId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer's activities
  const { data: volunteerActivities = [] } = useQuery<any[]>({
    queryKey: ["/api/volunteer-activities", { volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return [];
      const response = await fetch(`/api/volunteer-activities?userId=${volunteerId}`);
      return response.json();
    },
    enabled: !!volunteerId
  });

  // Fetch volunteer profile
  const { data: volunteerProfile } = useQuery<any>({
    queryKey: ["/api/intake/volunteer-profile", { volunteerId }],
    queryFn: async () => {
      if (!volunteerId) return null;
      const response = await fetch(`/api/intake/volunteer-profile?userId=${volunteerId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.volunteerProfile || data;
    },
    enabled: !!volunteerId
  });

  // Calculate impact metrics
  const totalHours = volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
  const completedTasks = tasks.filter(t => t.status?.toLowerCase() === "completed").length;
  const activeProjects = projectAssignments.filter(a => a.status === 'active').length;
  const allSkills = volunteerProfile?.skills || [];
  const sdgs = volunteerProfile?.preferredSdgs || [];

  const shareUrl = `${window.location.origin}/impact-report/${volunteerId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Copied!",
      description: "Impact report link copied to clipboard",
    });
  };

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleDownload = async () => {
    // This would integrate with a screenshot library in production
    toast({
      title: "Feature Coming Soon",
      description: "Download as image will be available soon. Use print to save as PDF!",
    });
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/my-work")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Work
          </Button>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="print:hidden"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy Link
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="print:hidden"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print/PDF
            </Button>
          </div>
        </div>

        {/* Main Impact Report Card */}
        <Card className="bg-white dark:bg-slate-800 shadow-lg border-2 border-blue-200 dark:border-blue-900 print:shadow-none print:border-black">
          <CardContent className="p-8 print:p-4">
            {/* Header Section */}
            <div className="text-center mb-8 pb-6 border-b-2 border-gray-200 dark:border-gray-700 print:mb-4 print:pb-3">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Share2 className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white print:text-2xl">
                  Impact Report
                </h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300 print:text-sm">
                {currentUser?.displayName || currentUser?.username || 'Volunteer'}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 print:text-xs">
                {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 print:grid-cols-4 print:gap-2 print:mb-4">
              <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg print:p-2 print:bg-white print:border">
                <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold print:text-xs">
                  Hours Logged
                </p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 print:text-2xl">
                  {totalHours}h
                </p>
              </div>

              <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg print:p-2 print:bg-white print:border">
                <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold print:text-xs">
                  Tasks Completed
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 print:text-2xl">
                  {completedTasks}
                </p>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900 p-4 rounded-lg print:p-2 print:bg-white print:border">
                <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold print:text-xs">
                  Active Projects
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 print:text-2xl">
                  {activeProjects}
                </p>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900 p-4 rounded-lg print:p-2 print:bg-white print:border">
                <p className="text-xs text-gray-600 dark:text-gray-300 uppercase font-semibold print:text-xs">
                  Assignments
                </p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 print:text-2xl">
                  {projectAssignments.length}
                </p>
              </div>
            </div>

            {/* Skills Section */}
            {allSkills.length > 0 && (
              <div className="mb-8 print:mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 print:text-base print:mb-2">
                  Skills Applied
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allSkills.map((skill: string) => (
                    <Badge key={skill} variant="secondary" className="print:text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* SDG Impact Section */}
            {sdgs.length > 0 && (
              <div className="mb-8 print:mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 print:text-base print:mb-2">
                  UN Sustainable Development Goals
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print:grid-cols-3 print:gap-2">
                  {sdgs.map((sdgId: number) => {
                    const goal = sdgGoals[sdgId];
                    return (
                      <div
                        key={sdgId}
                        className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 p-3 rounded-lg border border-blue-200 dark:border-blue-700 print:bg-white print:border print:text-xs"
                      >
                        <p className="font-semibold text-gray-900 dark:text-white print:text-xs">
                          SDG {sdgId}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-300 print:text-xs">
                          {goal?.name || getSDGName(sdgId)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Projects Section */}
            {projectAssignments.length > 0 && (
              <div className="mb-8 print:mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 print:text-base print:mb-2">
                  Active Assignments
                </h3>
                <div className="space-y-3 print:space-y-1">
                  {projectAssignments.slice(0, 5).map((assignment: any) => (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg print:p-1 print:bg-white print:border print:text-xs">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white print:text-xs">
                          {assignment.project?.name || `Project ${assignment.projectId}`}
                        </p>
                        {assignment.role && (
                          <p className="text-sm text-gray-600 dark:text-gray-300 print:text-xs">
                            Role: {assignment.role}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={assignment.status === 'active' ? 'default' : 'outline'}
                          className="print:text-xs"
                        >
                          {assignment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700 text-center text-sm text-gray-600 dark:text-gray-400 print:mt-4 print:pt-3 print:border-t print:text-xs">
              <p>
                Generated on {new Date().toLocaleDateString()} • Synerxus Impact Report
              </p>
              {!isPrinting && (
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Share this link: {shareUrl}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            background: white;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

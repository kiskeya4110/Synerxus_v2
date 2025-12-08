import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Clock, Calendar as CalendarIcon, Save, ArrowLeft, CheckCircle, MoreVertical, Settings, MessageCircle, Award, Bell, HelpCircle, LogOut, Compass, Home, User as UserIcon, TrendingUp, Users } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import logoUrl from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";

export default function LogActivity() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<"activity" | "impact">("activity");

  // Activity form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [hours, setHours] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [activityType, setActivityType] = useState<string>("volunteering");

  // Impact form state
  const [impactProjectId, setImpactProjectId] = useState<string>("");
  const [impactDate, setImpactDate] = useState<Date>(new Date());
  const [peopleReached, setPeopleReached] = useState<string>("");
  const [impactDescription, setImpactDescription] = useState<string>("");
  const [impactCategory, setImpactCategory] = useState<string>("direct");

  // Fetch current user
  const storedUserId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", storedUserId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      const url = id ? `/api/users/me?userId=${id}` : '/api/users/me';
      const response = await fetch(url);
      return response.json();
    },
  });

  // Fetch volunteer's project assignments (includes enriched project data)
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", { volunteerId: currentUser?.id }],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/project-assignments?volunteerId=${currentUser.id}`);
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: !!currentUser?.id
  });

  // Fetch all projects as fallback
  const { data: allProjects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
  });

  // Get assigned projects - prioritize projects from assignments (enriched data)
  // Fall back to matching with all projects if assignment doesn't have project data
  const assignedProjects = Array.isArray(projectAssignments)
    ? projectAssignments
        .filter((assignment: any) => assignment.projectId && assignment.status !== 'removed')
        .map((assignment: any) => {
          // Use enriched project from assignment if available
          if (assignment.project) {
            return assignment.project;
          }
          // Otherwise find from all projects
          return allProjects.find((p: any) => p.id === assignment.projectId);
        })
        .filter(Boolean) // Remove any undefined entries
        .filter((project: any, index: number, self: any[]) =>
          // Remove duplicates by id
          index === self.findIndex((p: any) => p.id === project.id)
        )
    : [];

  // Log activity mutation
  const logActivityMutation = useMutation({
    mutationFn: async (activityData: any) => {
      const response = await fetch("/api/volunteer-activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activityData),
      });
      if (!response.ok) throw new Error("Failed to log activity");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/project-assignments"] });

      toast({
        title: "Activity Logged",
        description: "Your volunteer hours have been recorded successfully.",
      });

      // Reset form
      setSelectedProjectId("");
      setHours("");
      setDescription("");
      setActivityType("volunteering");
      setDate(new Date());
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to log activity. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Record impact mutation
  const recordImpactMutation = useMutation({
    mutationFn: async (impactData: any) => {
      const response = await fetch("/api/impact-metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(impactData),
      });
      if (!response.ok) throw new Error("Failed to record impact");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/impact-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary"] });

      toast({
        title: "Impact Recorded",
        description: "Your impact has been recorded successfully.",
      });

      // Reset form
      setImpactProjectId("");
      setPeopleReached("");
      setImpactDescription("");
      setImpactCategory("direct");
      setImpactDate(new Date());
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record impact. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId || !hours || !date) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const activityData = {
      userId: currentUser?.id,
      projectId: parseInt(selectedProjectId),
      date: format(date, "yyyy-MM-dd"),
      hours: parseFloat(hours),
      description: description || null,
      activityType,
    };

    logActivityMutation.mutate(activityData);
  };

  const handleImpactSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!impactProjectId || !peopleReached || !impactDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const impactData = {
      projectId: parseInt(impactProjectId),
      date: format(impactDate, "yyyy-MM-dd"),
      peopleReached: parseInt(peopleReached),
      description: impactDescription || null,
      category: impactCategory,
      reportedBy: currentUser?.id,
    };

    recordImpactMutation.mutate(impactData);
  };

  const isVolunteer = currentUser?.userType === 'volunteer';

  return (
    <div className={`min-h-screen ${isMobile && isVolunteer ? 'bg-[#1a1a2e] max-w-[428px] mx-auto pb-20' : 'bg-background'}`}>
      {/* PWA Header for Volunteers on Mobile */}
      {isMobile && isVolunteer && (
        <header className="bg-[#16213e] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={logoUrl} alt="Synerxus Logo" className="h-7 w-auto" />
            <span className="font-bold text-base bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
              SYNERXUS
            </span>
          </button>
          <div className="flex items-center gap-2 relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/10 rounded-full"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Floating Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute top-12 right-0 bg-[#16213e] border border-gray-700 rounded-lg shadow-xl w-56 z-50">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setLocation('/dashboard');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Home className="w-4 h-4" />
                      <span>Dashboard</span>
                    </button>
                    <button
                      onClick={() => {
                        setLocation('/my-work');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Clock className="w-4 h-4" />
                      <span>My Work</span>
                    </button>
                    <button
                      onClick={() => {
                        setLocation('/discover-opportunities');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Compass className="w-4 h-4" />
                      <span>Discover Opportunities</span>
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        setLocation('/volunteer-profile-settings');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Profile Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setLocation('/volunteer-messages');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Messages</span>
                    </button>
                    <button
                      onClick={() => {
                        setLocation('/achievements');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Award className="w-4 h-4" />
                      <span>Achievements</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <Bell className="w-4 h-4" />
                      <span>Notifications</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-white"
                    >
                      <HelpCircle className="w-4 h-4" />
                      <span>Help & Support</span>
                    </button>
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={() => {
                        localStorage.clear();
                        setLocation('/login');
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center gap-3 text-red-400"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>
      )}

      {/* Back Button for Non-PWA */}
      {(!isMobile || !isVolunteer) && (
        <div className="max-w-2xl mx-auto px-4 pt-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/my-work')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Work
          </Button>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isMobile && isVolunteer ? 'px-4 py-6' : 'max-w-2xl mx-auto px-4 py-6'}`}>
        <Card className={isMobile && isVolunteer ? 'bg-[#16213e] border-gray-700 text-white' : ''}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isMobile && isVolunteer ? 'text-white' : ''}`}>
              <Clock className="w-6 h-6 text-emerald-400" />
              Log Activity & Record Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "activity" | "impact")} className="w-full">
              <TabsList className={`grid w-full grid-cols-2 ${isMobile && isVolunteer ? 'bg-[#1a1a2e]' : ''}`}>
                <TabsTrigger value="activity" className={isMobile && isVolunteer ? 'data-[state=active]:bg-emerald-500' : ''}>
                  <Clock className="w-4 h-4 mr-2" />
                  Log Activity
                </TabsTrigger>
                <TabsTrigger value="impact" className={isMobile && isVolunteer ? 'data-[state=active]:bg-emerald-500' : ''}>
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Record Impact
                </TabsTrigger>
              </TabsList>

              <TabsContent value="activity" className="mt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="project" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Project <span className="text-red-500">*</span>
                </Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger id="project" className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white' : ''}>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white' : ''}>
                    {assignedProjects.length === 0 ? (
                      <SelectItem value="none" disabled>No assigned projects</SelectItem>
                    ) : (
                      assignedProjects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="date" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white hover:bg-[#1a1a2e]/80' : ''
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => newDate && setDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hours Input */}
              <div className="space-y-2">
                <Label htmlFor="hours" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Hours <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  placeholder="e.g., 2.5"
                  className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white placeholder:text-gray-400' : ''}
                />
              </div>

              {/* Activity Type */}
              <div className="space-y-2">
                <Label htmlFor="activityType" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Activity Type
                </Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger id="activityType" className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white' : ''}>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white' : ''}>
                    <SelectItem value="volunteering">Volunteering</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="event">Event</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Description (Optional)
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you did..."
                  rows={4}
                  className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white placeholder:text-gray-400' : ''}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={logActivityMutation.isPending || !selectedProjectId || !hours}
                  className={`flex-1 ${
                    isMobile && isVolunteer
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : ''
                  }`}
                >
                  {logActivityMutation.isPending ? (
                    <>Logging...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Log Activity
                    </>
                  )}
                </Button>
                {(!isMobile || !isVolunteer) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/my-work')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>

          <TabsContent value="impact" className="mt-6">
            <form onSubmit={handleImpactSubmit} className="space-y-6">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="impact-project" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Project <span className="text-red-500">*</span>
                </Label>
                <Select value={impactProjectId} onValueChange={setImpactProjectId}>
                  <SelectTrigger id="impact-project" className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white' : ''}>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white' : ''}>
                    {assignedProjects.length === 0 ? (
                      <SelectItem value="none" disabled>No assigned projects</SelectItem>
                    ) : (
                      assignedProjects.map((project: any) => (
                        <SelectItem key={project.id} value={project.id.toString()}>
                          {project.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label htmlFor="impact-date" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Date <span className="text-red-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white hover:bg-[#1a1a2e]/80' : ''
                      }`}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {impactDate ? format(impactDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={impactDate}
                      onSelect={(newDate) => newDate && setImpactDate(newDate)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* People Reached */}
              <div className="space-y-2">
                <Label htmlFor="peopleReached" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  People Reached <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="peopleReached"
                  type="number"
                  min="1"
                  value={peopleReached}
                  onChange={(e) => setPeopleReached(e.target.value)}
                  placeholder="e.g., 50"
                  className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white placeholder:text-gray-400' : ''}
                />
              </div>

              {/* Impact Category */}
              <div className="space-y-2">
                <Label htmlFor="impactCategory" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Impact Category
                </Label>
                <Select value={impactCategory} onValueChange={setImpactCategory}>
                  <SelectTrigger id="impactCategory" className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white' : ''}>
                    <SelectItem value="direct">Direct Impact</SelectItem>
                    <SelectItem value="indirect">Indirect Impact</SelectItem>
                    <SelectItem value="community">Community Impact</SelectItem>
                    <SelectItem value="environmental">Environmental Impact</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="impactDescription" className={isMobile && isVolunteer ? 'text-gray-200' : ''}>
                  Impact Description (Optional)
                </Label>
                <Textarea
                  id="impactDescription"
                  value={impactDescription}
                  onChange={(e) => setImpactDescription(e.target.value)}
                  placeholder="Describe the impact made..."
                  rows={4}
                  className={isMobile && isVolunteer ? 'bg-[#1a1a2e] border-gray-600 text-white placeholder:text-gray-400' : ''}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={recordImpactMutation.isPending || !impactProjectId || !peopleReached}
                  className={`flex-1 ${
                    isMobile && isVolunteer
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      : ''
                  }`}
                >
                  {recordImpactMutation.isPending ? (
                    <>Recording...</>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Record Impact
                    </>
                  )}
                </Button>
                {(!isMobile || !isVolunteer) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/my-work')}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </TabsContent>
        </Tabs>
          </CardContent>
        </Card>

        {/* Success Messages for PWA */}
        {logActivityMutation.isSuccess && isMobile && isVolunteer && activeTab === "activity" && (
          <Card className="mt-4 bg-emerald-500/20 border-emerald-500">
            <CardContent className="pt-6 flex items-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span>Activity logged successfully!</span>
            </CardContent>
          </Card>
        )}
        {recordImpactMutation.isSuccess && isMobile && isVolunteer && activeTab === "impact" && (
          <Card className="mt-4 bg-emerald-500/20 border-emerald-500">
            <CardContent className="pt-6 flex items-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span>Impact recorded successfully!</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

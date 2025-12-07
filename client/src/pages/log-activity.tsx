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
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Clock, Calendar as CalendarIcon, Save, ArrowLeft, CheckCircle, MoreVertical, Settings, MessageCircle, Award, Bell, HelpCircle, LogOut, Compass, Home, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import type { User } from "@shared/schema";
import logoUrl from "@assets/Synerxus Modern Logo  NBG_1763706841211.png";

export default function LogActivity() {
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showMenu, setShowMenu] = useState(false);

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [date, setDate] = useState<Date>(new Date());
  const [hours, setHours] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [activityType, setActivityType] = useState<string>("volunteering");

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

  // Fetch volunteer's projects
  const { data: projectAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/project-assignments", { volunteerId: currentUser?.id }],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/project-assignments?volunteerId=${currentUser.id}`);
      return response.json();
    },
    enabled: !!currentUser?.id
  });

  // Fetch projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      const response = await fetch("/api/projects");
      return response.json();
    },
  });

  // Get assigned projects
  const assignedProjects = projects.filter(project =>
    projectAssignments.some((assignment: any) => assignment.projectId === project.id)
  );

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
              Log Volunteer Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        {/* Success Message for PWA */}
        {logActivityMutation.isSuccess && isMobile && isVolunteer && (
          <Card className="mt-4 bg-emerald-500/20 border-emerald-500">
            <CardContent className="pt-6 flex items-center gap-3 text-emerald-400">
              <CheckCircle className="w-5 h-5" />
              <span>Activity logged successfully!</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

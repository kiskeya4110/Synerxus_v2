import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, getAuthHeaders } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import OrganizationHeader from "@/components/layout/organization-header";
import OrganizationWelcomeBanner from "@/components/layout/organization-welcome-banner";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import OfflineBanner from "@/components/layout/offline-banner";
import Footer from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ClipboardList, UserPlus, Users, Clock, Calendar, Check, Plus,
  Search, User, Building2, ArrowLeft, Loader2, CheckCircle, History
} from "lucide-react";
import type { Project, ExternalVolunteer, VolunteerActivity, User as UserType } from "@shared/schema";

interface RecentActivity extends VolunteerActivity {
  projectName?: string;
  volunteerName?: string;
}

interface OutcomeTemplate {
  name: string;
  unit: string;
  sdg: number;
  icon: string;
  sortOrder: number;
}

export default function LogVolunteerHoursPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const userId = localStorage.getItem('currentUserId');

  // Form state
  const [volunteerType, setVolunteerType] = useState<'registered' | 'external'>('registered');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedExternalVolunteerId, setSelectedExternalVolunteerId] = useState<number | null>(null);
  const [externalVolunteerTab, setExternalVolunteerTab] = useState<'select' | 'create'>('select');
  const [newVolunteerName, setNewVolunteerName] = useState('');
  const [newVolunteerEmail, setNewVolunteerEmail] = useState('');
  const [newVolunteerPhone, setNewVolunteerPhone] = useState('');
  const [newVolunteerNotes, setNewVolunteerNotes] = useState('');
  const [newVolunteerSource, setNewVolunteerSource] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [externalSearch, setExternalSearch] = useState('');
  const [selectedKpi, setSelectedKpi] = useState('');
  const [kpiQuantity, setKpiQuantity] = useState('');

  // Fetch current user's organization
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/me?userId=${userId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  // Derive organization ID from authenticated user
  const organizationId = currentUser?.organizationId;

  // Fetch organization details (for display purposes like name/logo)
  const { data: organization } = useQuery({
    queryKey: ["/api/organizations", organizationId],
    queryFn: async () => {
      const response = await fetch(`/api/organizations`);
      if (!response.ok) return null;
      const orgs = await response.json();
      const orgList = Array.isArray(orgs) ? orgs : [];
      return orgList.find((o: any) => o.id === organizationId) || null;
    },
    enabled: !!organizationId
  });

  // Fetch organization profile for logo
  const { data: organizationProfile } = useQuery({
    queryKey: ['/api/intake/organization-profile', organizationId],
    queryFn: async () => {
      if (!organizationId) return null;
      const response = await fetch(`/api/intake/organization-profile?organizationId=${organizationId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!organizationId
  });

  // Fetch organization's projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects/organization", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await fetch(`/api/projects?organizationId=${organizationId}`);
      return response.ok ? response.json() : [];
    },
    enabled: !!organizationId
  });

  // Fetch registered volunteers who have assignments with our organization's projects
  const { data: volunteers = [] } = useQuery<any[]>({
    queryKey: ["/api/organizations/volunteers", organizationId, userId],
    queryFn: async () => {
      if (!organizationId || !userId) return [];
      const response = await fetch(`/api/organizations/${organizationId}/volunteers?userId=${userId}`);
      return response.ok ? response.json() : [];
    },
    enabled: !!organizationId && !!userId
  });

  // Fetch external volunteers
  const { data: externalVolunteers = [] } = useQuery<ExternalVolunteer[]>({
    queryKey: ["/api/external-volunteers", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const response = await fetch(`/api/external-volunteers?organizationId=${organizationId}`);
      return response.ok ? response.json() : [];
    },
    enabled: !!organizationId
  });

  // Derive outcomeTemplates from the selected project's KPI configuration
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p: Project) => p.id === selectedProjectId) || null;
  }, [selectedProjectId, projects]);

  const outcomeTemplates: OutcomeTemplate[] = useMemo(() => {
    if (!selectedProject || !(selectedProject as any).outcomeTemplates) return [];
    const templates = (selectedProject as any).outcomeTemplates;
    if (!Array.isArray(templates) || templates.length === 0) return [];
    return [...templates].sort((a: OutcomeTemplate, b: OutcomeTemplate) => a.sortOrder - b.sortOrder);
  }, [selectedProject]);

  // Fetch recent admin-logged activities
  const { data: recentActivities = [] } = useQuery<RecentActivity[]>({
    queryKey: ["/api/volunteer-activities/recent", organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      // Get recent activities for organization's projects
      const activitiesPromises = projects.slice(0, 5).map(async (project: Project) => {
        const response = await fetch(`/api/volunteer-activities?projectId=${project.id}&limit=5`);
        if (!response.ok) return [];
        const activities = await response.json();
        return activities.map((a: any) => ({
          ...a,
          projectName: project.name
        }));
      });
      const allActivities = await Promise.all(activitiesPromises);
      return allActivities.flat()
        .filter((a: any) => a.loggedByType === 'admin')
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 10);
    },
    enabled: !!organizationId && projects.length > 0
  });

  // Create activity mutation
  const createActivityMutation = useMutation({
    mutationFn: async (data: any) => {
      const authHeaders = await getAuthHeaders();
      const response = await fetch('/api/admin/volunteer-activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create activity');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Hours Logged",
        description: autoApprove ? "Activity has been logged and approved." : "Activity has been logged and is pending approval.",
      });
      // Reset entire form
      setSelectedUserId(null);
      setSelectedExternalVolunteerId(null);
      setNewVolunteerName('');
      setNewVolunteerEmail('');
      setNewVolunteerPhone('');
      setNewVolunteerNotes('');
      setNewVolunteerSource('');
      setSelectedProjectId(null);
      setHours('');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setExternalVolunteerTab('select');
      setVolunteerSearch('');
      setExternalSearch('');
      setSelectedKpi('');
      setKpiQuantity('');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["/api/volunteer-activities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/external-volunteers"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Filter volunteers by search
  const filteredVolunteers = volunteers.filter((v: any) => {
    if (!volunteerSearch) return true;
    const search = volunteerSearch.toLowerCase();
    return (
      v.displayName?.toLowerCase().includes(search) ||
      v.email?.toLowerCase().includes(search) ||
      v.username?.toLowerCase().includes(search)
    );
  });

  // Filter external volunteers by search
  const filteredExternalVolunteers = externalVolunteers.filter((v: ExternalVolunteer) => {
    if (!externalSearch) return true;
    const search = externalSearch.toLowerCase();
    return (
      v.fullName?.toLowerCase().includes(search) ||
      v.email?.toLowerCase().includes(search)
    );
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProjectId) {
      toast({ title: "Error", description: "Please select a project", variant: "destructive" });
      return;
    }

    if (!hours || parseFloat(hours) <= 0) {
      toast({ title: "Error", description: "Please enter valid hours", variant: "destructive" });
      return;
    }

    const activityData: any = {
      volunteerType,
      projectId: selectedProjectId,
      hours: parseFloat(hours),
      date,
      description: description || undefined,
      autoApprove,
      ...(selectedKpi ? {
        outcomes: selectedKpi,
        outcomeText: selectedKpi,
        outcomeQuantity: kpiQuantity ? parseFloat(kpiQuantity) : undefined,
        outcomeType: 'individual',
      } : {}),
    };

    if (volunteerType === 'registered') {
      if (!selectedUserId) {
        toast({ title: "Error", description: "Please select a volunteer", variant: "destructive" });
        return;
      }
      activityData.userId = selectedUserId;
    } else {
      if (externalVolunteerTab === 'select') {
        if (!selectedExternalVolunteerId) {
          toast({ title: "Error", description: "Please select an external volunteer", variant: "destructive" });
          return;
        }
        activityData.externalVolunteerId = selectedExternalVolunteerId;
      } else {
        if (!newVolunteerName.trim()) {
          toast({ title: "Error", description: "Please enter volunteer name", variant: "destructive" });
          return;
        }
        activityData.newExternalVolunteer = {
          fullName: newVolunteerName.trim(),
          email: newVolunteerEmail.trim() || undefined,
          phone: newVolunteerPhone.trim() || undefined,
          notes: newVolunteerNotes.trim() || undefined,
          source: newVolunteerSource.trim() || 'admin-logged'
        };
      }
    }

    createActivityMutation.mutate(activityData);
  };

  // Mobile/PWA layout
  if (isMobile) {
    return (
      <OrganizationPWALayout
        activeTab="home"
        organizationName={organizationProfile?.commonName || organization?.name}
        organizationLogo={organizationProfile?.logoUrl || organization?.logoUrl || organization?.logo}
      >
        <div className="px-4 pb-24">
          <LogHoursForm
            volunteerType={volunteerType}
            setVolunteerType={setVolunteerType}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            selectedExternalVolunteerId={selectedExternalVolunteerId}
            setSelectedExternalVolunteerId={setSelectedExternalVolunteerId}
            externalVolunteerTab={externalVolunteerTab}
            setExternalVolunteerTab={setExternalVolunteerTab}
            newVolunteerName={newVolunteerName}
            setNewVolunteerName={setNewVolunteerName}
            newVolunteerEmail={newVolunteerEmail}
            setNewVolunteerEmail={setNewVolunteerEmail}
            newVolunteerPhone={newVolunteerPhone}
            setNewVolunteerPhone={setNewVolunteerPhone}
            newVolunteerNotes={newVolunteerNotes}
            setNewVolunteerNotes={setNewVolunteerNotes}
            newVolunteerSource={newVolunteerSource}
            setNewVolunteerSource={setNewVolunteerSource}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            hours={hours}
            setHours={setHours}
            date={date}
            setDate={setDate}
            description={description}
            setDescription={setDescription}
            autoApprove={autoApprove}
            setAutoApprove={setAutoApprove}
            volunteerSearch={volunteerSearch}
            setVolunteerSearch={setVolunteerSearch}
            externalSearch={externalSearch}
            setExternalSearch={setExternalSearch}
            volunteers={filteredVolunteers}
            externalVolunteers={filteredExternalVolunteers}
            projects={projects}
            onSubmit={handleSubmit}
            isSubmitting={createActivityMutation.isPending}
            outcomeTemplates={outcomeTemplates}
            selectedKpi={selectedKpi}
            setSelectedKpi={setSelectedKpi}
            kpiQuantity={kpiQuantity}
            setKpiQuantity={setKpiQuantity}
          />
        </div>
      </OrganizationPWALayout>
    );
  }

  // Desktop layout
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <OfflineBanner />
      <OrganizationHeader activeTab="log-hours" />
      <OrganizationWelcomeBanner />

      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-blue-600" />
            Log Volunteer Hours
          </h1>
          <p className="text-gray-600 mt-2">
            Record volunteer hours on behalf of registered or external volunteers
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Log Activity
                </CardTitle>
                <CardDescription>
                  Enter volunteer activity details. Admin-logged activities are auto-approved by default.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LogHoursForm
                  volunteerType={volunteerType}
                  setVolunteerType={setVolunteerType}
                  selectedUserId={selectedUserId}
                  setSelectedUserId={setSelectedUserId}
                  selectedExternalVolunteerId={selectedExternalVolunteerId}
                  setSelectedExternalVolunteerId={setSelectedExternalVolunteerId}
                  externalVolunteerTab={externalVolunteerTab}
                  setExternalVolunteerTab={setExternalVolunteerTab}
                  newVolunteerName={newVolunteerName}
                  setNewVolunteerName={setNewVolunteerName}
                  newVolunteerEmail={newVolunteerEmail}
                  setNewVolunteerEmail={setNewVolunteerEmail}
                  newVolunteerPhone={newVolunteerPhone}
                  setNewVolunteerPhone={setNewVolunteerPhone}
                  newVolunteerNotes={newVolunteerNotes}
                  setNewVolunteerNotes={setNewVolunteerNotes}
                  newVolunteerSource={newVolunteerSource}
                  setNewVolunteerSource={setNewVolunteerSource}
                  selectedProjectId={selectedProjectId}
                  setSelectedProjectId={setSelectedProjectId}
                  hours={hours}
                  setHours={setHours}
                  date={date}
                  setDate={setDate}
                  description={description}
                  setDescription={setDescription}
                  autoApprove={autoApprove}
                  setAutoApprove={setAutoApprove}
                  volunteerSearch={volunteerSearch}
                  setVolunteerSearch={setVolunteerSearch}
                  externalSearch={externalSearch}
                  setExternalSearch={setExternalSearch}
                  volunteers={filteredVolunteers}
                  externalVolunteers={filteredExternalVolunteers}
                  projects={projects}
                  onSubmit={handleSubmit}
                  isSubmitting={createActivityMutation.isPending}
                  outcomeTemplates={outcomeTemplates}
                  selectedKpi={selectedKpi}
                  setSelectedKpi={setSelectedKpi}
                  kpiQuantity={kpiQuantity}
                  setKpiQuantity={setKpiQuantity}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-600" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-blue-700">Registered Volunteers</span>
                  <Badge variant="secondary">{volunteers.length}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm text-purple-700">External Volunteers</span>
                  <Badge variant="secondary">{externalVolunteers.length}</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                  <span className="text-sm text-emerald-700">Active Projects</span>
                  <Badge variant="secondary">{projects.filter((p: Project) => p.status === 'active').length}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recent Admin-Logged Activities */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600" />
                  Recent Admin Logs
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No admin-logged activities yet
                  </p>
                ) : (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3">
                      {recentActivities.map((activity: RecentActivity) => (
                        <div key={activity.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                          <div className="flex justify-between items-start">
                            <span className="font-medium text-gray-900">
                              {activity.hours}h logged
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {activity.verificationStatus}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-xs mt-1">
                            {activity.projectName || 'Unknown project'}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Log Hours Form Component
interface LogHoursFormProps {
  volunteerType: 'registered' | 'external';
  setVolunteerType: (type: 'registered' | 'external') => void;
  selectedUserId: number | null;
  setSelectedUserId: (id: number | null) => void;
  selectedExternalVolunteerId: number | null;
  setSelectedExternalVolunteerId: (id: number | null) => void;
  externalVolunteerTab: 'select' | 'create';
  setExternalVolunteerTab: (tab: 'select' | 'create') => void;
  newVolunteerName: string;
  setNewVolunteerName: (name: string) => void;
  newVolunteerEmail: string;
  setNewVolunteerEmail: (email: string) => void;
  newVolunteerPhone: string;
  setNewVolunteerPhone: (phone: string) => void;
  newVolunteerNotes: string;
  setNewVolunteerNotes: (notes: string) => void;
  newVolunteerSource: string;
  setNewVolunteerSource: (source: string) => void;
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  hours: string;
  setHours: (hours: string) => void;
  date: string;
  setDate: (date: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  autoApprove: boolean;
  setAutoApprove: (approve: boolean) => void;
  volunteerSearch: string;
  setVolunteerSearch: (search: string) => void;
  externalSearch: string;
  setExternalSearch: (search: string) => void;
  volunteers: any[];
  externalVolunteers: ExternalVolunteer[];
  projects: Project[];
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  outcomeTemplates: OutcomeTemplate[];
  selectedKpi: string;
  setSelectedKpi: (kpi: string) => void;
  kpiQuantity: string;
  setKpiQuantity: (qty: string) => void;
}

function LogHoursForm({
  volunteerType,
  setVolunteerType,
  selectedUserId,
  setSelectedUserId,
  selectedExternalVolunteerId,
  setSelectedExternalVolunteerId,
  externalVolunteerTab,
  setExternalVolunteerTab,
  newVolunteerName,
  setNewVolunteerName,
  newVolunteerEmail,
  setNewVolunteerEmail,
  newVolunteerPhone,
  setNewVolunteerPhone,
  newVolunteerNotes,
  setNewVolunteerNotes,
  newVolunteerSource,
  setNewVolunteerSource,
  selectedProjectId,
  setSelectedProjectId,
  hours,
  setHours,
  date,
  setDate,
  description,
  setDescription,
  autoApprove,
  setAutoApprove,
  volunteerSearch,
  setVolunteerSearch,
  externalSearch,
  setExternalSearch,
  volunteers,
  externalVolunteers,
  projects,
  onSubmit,
  isSubmitting,
  outcomeTemplates,
  selectedKpi,
  setSelectedKpi,
  kpiQuantity,
  setKpiQuantity
}: LogHoursFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Volunteer Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Volunteer Type</Label>
        <Tabs value={volunteerType} onValueChange={(v) => setVolunteerType(v as 'registered' | 'external')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="registered" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Registered
            </TabsTrigger>
            <TabsTrigger value="external" className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              External
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registered" className="mt-4 space-y-4">
            {/* Search registered volunteers */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search volunteers..."
                value={volunteerSearch}
                onChange={(e) => setVolunteerSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <ScrollArea className="h-[200px] border rounded-lg">
              <div className="p-2 space-y-1">
                {volunteers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No volunteers found
                  </p>
                ) : (
                  volunteers.map((vol: any) => (
                    <button
                      key={vol.id}
                      type="button"
                      onClick={() => setSelectedUserId(vol.id)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedUserId === vol.id
                          ? 'bg-blue-100 border-blue-300 border'
                          : 'hover:bg-gray-100 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">
                            {(vol.displayName || vol.username || 'V')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{vol.displayName || vol.username}</p>
                          <p className="text-xs text-gray-500">{vol.email}</p>
                        </div>
                        {selectedUserId === vol.id && (
                          <Check className="w-4 h-4 text-blue-600 ml-auto" />
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="external" className="mt-4 space-y-4">
            <Tabs value={externalVolunteerTab} onValueChange={(v) => setExternalVolunteerTab(v as 'select' | 'create')}>
              <TabsList className="w-full">
                <TabsTrigger value="select" className="flex-1">Select Existing</TabsTrigger>
                <TabsTrigger value="create" className="flex-1">Add New</TabsTrigger>
              </TabsList>

              <TabsContent value="select" className="mt-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search external volunteers..."
                    value={externalSearch}
                    onChange={(e) => setExternalSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[180px] border rounded-lg">
                  <div className="p-2 space-y-1">
                    {externalVolunteers.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No external volunteers yet. Add one to get started.
                      </p>
                    ) : (
                      externalVolunteers.map((vol: ExternalVolunteer) => (
                        <button
                          key={vol.id}
                          type="button"
                          onClick={() => setSelectedExternalVolunteerId(vol.id)}
                          className={`w-full p-3 rounded-lg text-left transition-colors ${
                            selectedExternalVolunteerId === vol.id
                              ? 'bg-purple-100 border-purple-300 border'
                              : 'hover:bg-gray-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-purple-700">
                                {vol.fullName[0].toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{vol.fullName}</p>
                              <p className="text-xs text-gray-500">{vol.email || 'No email'}</p>
                            </div>
                            {selectedExternalVolunteerId === vol.id && (
                              <Check className="w-4 h-4 text-purple-600 ml-auto" />
                            )}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="create" className="mt-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="newVolunteerName">Full Name *</Label>
                    <Input
                      id="newVolunteerName"
                      placeholder="Enter volunteer's full name"
                      value={newVolunteerName}
                      onChange={(e) => setNewVolunteerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newVolunteerEmail">Email (optional)</Label>
                    <Input
                      id="newVolunteerEmail"
                      type="email"
                      placeholder="volunteer@example.com"
                      value={newVolunteerEmail}
                      onChange={(e) => setNewVolunteerEmail(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newVolunteerPhone">Phone (optional)</Label>
                    <Input
                      id="newVolunteerPhone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={newVolunteerPhone}
                      onChange={(e) => setNewVolunteerPhone(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newVolunteerSource">Source</Label>
                    <Select value={newVolunteerSource} onValueChange={setNewVolunteerSource}>
                      <SelectTrigger>
                        <SelectValue placeholder="How did they join?" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="walk-in">Walk-in</SelectItem>
                        <SelectItem value="corporate">Corporate Partner</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="newVolunteerNotes">Notes (optional)</Label>
                    <Textarea
                      id="newVolunteerNotes"
                      placeholder="Any additional information..."
                      value={newVolunteerNotes}
                      onChange={(e) => setNewVolunteerNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>

      {/* Project Selection */}
      <div className="space-y-2">
        <Label htmlFor="project">Project *</Label>
        <Select
          value={selectedProjectId?.toString() || ''}
          onValueChange={(v) => {
            setSelectedProjectId(parseInt(v));
            setSelectedKpi('');
            setKpiQuantity('');
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project: Project) => (
              <SelectItem key={project.id} value={project.id.toString()}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Selection (optional) */}
      {selectedProjectId && outcomeTemplates.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Impact KPI <span className="text-xs text-gray-400 font-normal">(optional)</span>
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {outcomeTemplates.map((template) => (
              <button
                key={template.name}
                type="button"
                onClick={() => {
                  if (selectedKpi === template.name) {
                    setSelectedKpi('');
                    setKpiQuantity('');
                  } else {
                    setSelectedKpi(template.name);
                    setKpiQuantity('');
                  }
                }}
                className={`relative flex flex-col items-center text-center p-4 rounded-xl border-2 transition-all ${
                  selectedKpi === template.name
                    ? "border-emerald-500 bg-emerald-50 shadow-md"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <span className="text-2xl mb-1">{template.icon}</span>
                <span className={`text-sm font-medium leading-tight ${selectedKpi === template.name ? "text-emerald-800" : "text-slate-700"}`}>
                  {template.name}
                </span>
                <span className="text-xs text-slate-400 mt-0.5">{template.unit}</span>

                {selectedKpi === template.name && (
                  <div className="mt-3 w-full" onClick={(e) => e.stopPropagation()}>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={kpiQuantity}
                      onChange={(e) => setKpiQuantity(e.target.value)}
                      placeholder="Qty"
                      className="h-9 text-center text-lg font-semibold bg-white border-emerald-300 focus:border-emerald-500"
                      autoFocus
                    />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hours and Date */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="hours">Hours *</Label>
          <Input
            id="hours"
            type="number"
            step="0.5"
            min="0.5"
            max="24"
            placeholder="e.g., 2.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Date *</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea
          id="description"
          placeholder="Describe the volunteer work performed..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      {/* Auto-approve toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="space-y-0.5">
          <Label htmlFor="auto-approve" className="text-sm font-medium">
            Auto-approve activity
          </Label>
          <p className="text-xs text-gray-500">
            Recommended for admin-logged entries
          </p>
        </div>
        <Switch
          id="auto-approve"
          checked={autoApprove}
          onCheckedChange={setAutoApprove}
        />
      </div>

      {/* Submit */}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Logging Activity...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 mr-2" />
            Log Volunteer Hours
          </>
        )}
      </Button>
    </form>
  );
}

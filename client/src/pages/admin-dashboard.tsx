import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Users, Building2, FolderOpen, Briefcase, Activity, Clock,
  Server, Database, Cpu, HardDrive, Search, Filter, RefreshCw,
  CheckCircle, XCircle, AlertCircle, TrendingUp, UserPlus, Shield, MapPin
} from "lucide-react";

// Leaflet imports for map
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";

// Fix Leaflet default marker icon issue
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-ignore - Leaflet icon fix
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow, format } from "date-fns";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";

interface AdminStats {
  totalUsers: number;
  totalVolunteers: number;
  totalOrganizations: number;
  totalProjects: number;
  totalOpportunities: number;
  totalApplications: number;
  totalActivityLogs: number;
  recentSignups: number;
  pendingApprovals: number;
}

interface AdminUser {
  id: number;
  email: string;
  displayName: string | null;
  username: string;
  userType: string | null;
  avatar: string | null;
  isAdmin: boolean | null;
  createdAt: string;
  organizationId: number | null;
}

interface ActivityLog {
  id: number;
  volunteerId: number | null;
  projectId: number | null;
  activityType: string;
  hoursLogged: number | null;
  description: string | null;
  status: string | null;
  createdAt: string;
  volunteerName: string;
  projectName: string;
}

interface Organization {
  id: number;
  name: string;
  description: string | null;
  logo: string | null;
  contactEmail: string | null;
  approvalStatus: string | null;
  createdAt: string;
  memberCount: number;
  projectCount: number;
}

interface SystemInfo {
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
    external: string;
  };
  uptime: {
    seconds: number;
    formatted: string;
  };
  database: {
    connected: boolean;
    timestamp: string;
  };
  nodeVersion: string;
  platform: string;
  pid: number;
}

interface LocationItem {
  id: number | string;
  name: string;
  type: 'organization' | 'project' | 'volunteers';
  location: string;
  lat: number;
  lng: number;
  status?: string;
  logo?: string;
  organizationId?: number;
  count?: number;
}

interface LocationsData {
  organizations: LocationItem[];
  projects: LocationItem[];
  volunteers: LocationItem[];
  summary: {
    totalOrganizations: number;
    totalProjects: number;
    totalVolunteerLocations: number;
    totalVolunteers: number;
  };
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const userId = localStorage.getItem("currentUserId");

  // Check if user is admin (basic check - should be enhanced with proper auth)
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch user");
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch admin stats
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    }
  });

  // Fetch users with pagination
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users", currentPage, searchTerm, userTypeFilter],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        ...(searchTerm && { search: searchTerm }),
        ...(userTypeFilter !== "all" && { userType: userTypeFilter })
      });
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    }
  });

  // Fetch recent activity
  const { data: activity = [], isLoading: activityLoading, refetch: refetchActivity } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: async () => {
      const response = await fetch("/api/admin/activity?limit=50");
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    }
  });

  // Fetch organizations
  const { data: organizations = [], isLoading: orgsLoading, refetch: refetchOrgs } = useQuery<Organization[]>({
    queryKey: ["/api/admin/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/organizations");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    }
  });

  // Fetch system info
  const { data: systemInfo, isLoading: systemLoading, refetch: refetchSystem } = useQuery<SystemInfo>({
    queryKey: ["/api/admin/system"],
    queryFn: async () => {
      const response = await fetch("/api/admin/system");
      if (!response.ok) throw new Error("Failed to fetch system info");
      return response.json();
    },
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Fetch locations for map
  const { data: locationsData, isLoading: locationsLoading, refetch: refetchLocations } = useQuery<LocationsData>({
    queryKey: ["/api/admin/locations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/locations");
      if (!response.ok) throw new Error("Failed to fetch locations");
      return response.json();
    }
  });

  // Map filter state
  const [mapFilter, setMapFilter] = useState<'all' | 'organizations' | 'projects' | 'volunteers'>('all');

  const handleRefreshAll = () => {
    refetchStats();
    refetchUsers();
    refetchActivity();
    refetchLocations();
    refetchOrgs();
    refetchSystem();
  };

  const getUserTypeBadge = (userType: string | null) => {
    switch (userType) {
      case "volunteer":
        return <Badge className="bg-blue-100 text-blue-800">Volunteer</Badge>;
      case "organization":
        return <Badge className="bg-green-100 text-green-800">Organization</Badge>;
      case "corporate-partner":
      case "corporate_partner":
        return <Badge className="bg-purple-100 text-purple-800">Corporate</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoUrl} alt="Synerxus" className="h-8" />
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Admin Dashboard
                </h1>
                <p className="text-sm text-slate-300">Platform Management & Monitoring</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshAll}
                className="border-slate-600 text-slate-900 hover:bg-slate-700 hover:text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="text-slate-300 hover:text-white"
              >
                Back to App
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
                  <p className="text-xs text-gray-500">Total Users</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalOrganizations || 0}</p>
                  <p className="text-xs text-gray-500">Organizations</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FolderOpen className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.totalProjects || 0}</p>
                  <p className="text-xs text-gray-500">Projects</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <UserPlus className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.recentSignups || 0}</p>
                  <p className="text-xs text-gray-500">New (7 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.pendingApprovals || 0}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger value="organizations" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organizations
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Server className="h-4 w-4" />
              System
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-2">
              <MapPin className="h-4 w-4" />
              Locations
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>All Users</CardTitle>
                    <CardDescription>
                      {usersData?.pagination?.total || 0} total users
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 w-64"
                      />
                    </div>
                    <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="volunteer">Volunteers</SelectItem>
                        <SelectItem value="organization">Organizations</SelectItem>
                        <SelectItem value="corporate-partner">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {usersLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading users...</div>
                    ) : (usersData?.users || []).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No users found</div>
                    ) : (
                      (usersData?.users || []).map((user: AdminUser) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar || undefined} />
                              <AvatarFallback>
                                {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {user.displayName || user.username}
                                {user.isAdmin && (
                                  <Badge className="ml-2 bg-slate-800 text-white text-xs">Admin</Badge>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {getUserTypeBadge(user.userType)}
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                {usersData?.pagination && usersData.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-gray-500">
                      Page {currentPage} of {usersData.pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(usersData.pagination.totalPages, p + 1))}
                      disabled={currentPage === usersData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest platform activity logs</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {activityLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading activity...</div>
                    ) : activity.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No activity found</div>
                    ) : (
                      activity.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Activity className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {log.volunteerName}
                                <span className="text-gray-500 font-normal">
                                  {" "}logged {log.activityType}
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {log.projectName} • {log.hoursLogged ? `${log.hoursLogged}h` : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.status && getStatusBadge(log.status)}
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organizations Tab */}
          <TabsContent value="organizations">
            <Card>
              <CardHeader>
                <CardTitle>All Organizations</CardTitle>
                <CardDescription>{organizations.length} registered organizations</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {orgsLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading organizations...</div>
                    ) : organizations.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No organizations found</div>
                    ) : (
                      organizations.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 rounded-lg">
                              <AvatarImage src={org.logo || undefined} />
                              <AvatarFallback className="rounded-lg bg-green-100">
                                <Building2 className="h-6 w-6 text-green-600" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{org.name}</p>
                              <p className="text-sm text-gray-500 line-clamp-1">
                                {org.description || org.contactEmail || "No description"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-lg font-bold text-blue-600">{org.memberCount}</p>
                              <p className="text-xs text-gray-500">Members</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-600">{org.projectCount}</p>
                              <p className="text-xs text-gray-500">Projects</p>
                            </div>
                            {getStatusBadge(org.approvalStatus)}
                            {/* Approval buttons for pending organizations */}
                            {org.approvalStatus === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/admin/organizations/${org.id}/approval`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: parseInt(userId || '0'), status: 'approved' })
                                      });
                                      if (response.ok) {
                                        refetchOrgs();
                                      }
                                    } catch (err) {
                                      console.error('Error approving organization:', err);
                                    }
                                  }}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(`/api/admin/organizations/${org.id}/approval`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: parseInt(userId || '0'), status: 'rejected' })
                                      });
                                      if (response.ok) {
                                        refetchOrgs();
                                      }
                                    } catch (err) {
                                      console.error('Error rejecting organization:', err);
                                    }
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Tab */}
          <TabsContent value="system">
            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="h-5 w-5" />
                    Memory Usage
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {systemLoading ? (
                    <div className="text-center py-4 text-gray-500">Loading...</div>
                  ) : (
                    <>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Heap Used</span>
                          <span className="font-medium">{systemInfo?.memory.heapUsed}</span>
                        </div>
                        <Progress
                          value={parseInt(systemInfo?.memory.heapUsed || "0") / parseInt(systemInfo?.memory.heapTotal || "1") * 100}
                          className="h-2"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500">Heap Total</p>
                          <p className="font-medium">{systemInfo?.memory.heapTotal}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500">RSS</p>
                          <p className="font-medium">{systemInfo?.memory.rss}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500">External</p>
                          <p className="font-medium">{systemInfo?.memory.external}</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-gray-500">PID</p>
                          <p className="font-medium">{systemInfo?.pid}</p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    Server Info
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {systemLoading ? (
                    <div className="text-center py-4 text-gray-500">Loading...</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Uptime</span>
                        </div>
                        <span className="font-medium text-sm">{systemInfo?.uptime.formatted}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Database</span>
                        </div>
                        <Badge className={systemInfo?.database.connected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                          {systemInfo?.database.connected ? "Connected" : "Disconnected"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Node Version</span>
                        </div>
                        <span className="font-medium text-sm">{systemInfo?.nodeVersion}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Server className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Platform</span>
                        </div>
                        <span className="font-medium text-sm">{systemInfo?.platform}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Quick Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold text-blue-600">{stats?.totalOpportunities || 0}</p>
                      <p className="text-sm text-gray-600">Opportunities</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold text-green-600">{stats?.totalApplications || 0}</p>
                      <p className="text-sm text-gray-600">Applications</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold text-purple-600">{stats?.totalActivityLogs || 0}</p>
                      <p className="text-sm text-gray-600">Activity Logs</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                      <p className="text-2xl font-bold text-amber-600">{stats?.totalVolunteers || 0}</p>
                      <p className="text-sm text-gray-600">Volunteers</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Locations Tab */}
          <TabsContent value="locations">
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Global Locations Map</CardTitle>
                    <CardDescription>
                      View organizations, projects, and volunteers on the map
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={mapFilter} onValueChange={(v: any) => setMapFilter(v)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="organizations">Organizations</SelectItem>
                        <SelectItem value="projects">Projects</SelectItem>
                        <SelectItem value="volunteers">Volunteers</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={() => refetchLocations()}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <Building2 className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                    <p className="text-xl font-bold text-blue-600">{locationsData?.summary?.totalOrganizations || 0}</p>
                    <p className="text-xs text-gray-600">Organizations</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <Briefcase className="h-6 w-6 mx-auto mb-1 text-green-600" />
                    <p className="text-xl font-bold text-green-600">{locationsData?.summary?.totalProjects || 0}</p>
                    <p className="text-xs text-gray-600">Projects</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <MapPin className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                    <p className="text-xl font-bold text-purple-600">{locationsData?.summary?.totalVolunteerLocations || 0}</p>
                    <p className="text-xs text-gray-600">Volunteer Locations</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-lg">
                    <Users className="h-6 w-6 mx-auto mb-1 text-amber-600" />
                    <p className="text-xl font-bold text-amber-600">{locationsData?.summary?.totalVolunteers || 0}</p>
                    <p className="text-xs text-gray-600">Total Volunteers</p>
                  </div>
                </div>

                {/* Map */}
                <div className="h-[500px] rounded-lg overflow-hidden border">
                  {locationsLoading ? (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                      <div className="text-center">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                        <p className="mt-2 text-gray-500">Loading map data...</p>
                      </div>
                    </div>
                  ) : (
                    <MapContainer
                      center={[20, 0]}
                      zoom={2}
                      style={{ width: "100%", height: "100%" }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />

                      {/* Organization Markers (Blue) */}
                      {(mapFilter === 'all' || mapFilter === 'organizations') && locationsData?.organizations?.map((loc) => {
                        const orgIcon = L.divIcon({
                          html: `<div style="
                            background: #3b82f6;
                            width: 28px;
                            height: 28px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          ">
                            <span style="color: white; font-size: 12px; font-weight: bold;">O</span>
                          </div>`,
                          className: 'custom-marker',
                          iconSize: [28, 28],
                          iconAnchor: [14, 14],
                        });
                        return (
                          <Marker key={`org-${loc.id}`} position={[loc.lat, loc.lng]} icon={orgIcon}>
                            <Popup>
                              <div style={{ minWidth: '180px' }}>
                                <p style={{ fontWeight: 600, margin: '0 0 4px 0', color: '#3b82f6' }}>{loc.name}</p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Type:</strong> Organization
                                </p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Location:</strong> {loc.location}
                                </p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Status:</strong> {loc.status}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}

                      {/* Project Markers (Green) */}
                      {(mapFilter === 'all' || mapFilter === 'projects') && locationsData?.projects?.map((loc) => {
                        const projectIcon = L.divIcon({
                          html: `<div style="
                            background: #22c55e;
                            width: 28px;
                            height: 28px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          ">
                            <span style="color: white; font-size: 12px; font-weight: bold;">P</span>
                          </div>`,
                          className: 'custom-marker',
                          iconSize: [28, 28],
                          iconAnchor: [14, 14],
                        });
                        return (
                          <Marker key={`proj-${loc.id}`} position={[loc.lat, loc.lng]} icon={projectIcon}>
                            <Popup>
                              <div style={{ minWidth: '180px' }}>
                                <p style={{ fontWeight: 600, margin: '0 0 4px 0', color: '#22c55e' }}>{loc.name}</p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Type:</strong> Project
                                </p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Location:</strong> {loc.location}
                                </p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Status:</strong> {loc.status}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}

                      {/* Volunteer Markers (Purple) */}
                      {(mapFilter === 'all' || mapFilter === 'volunteers') && locationsData?.volunteers?.map((loc) => {
                        const volunteerIcon = L.divIcon({
                          html: `<div style="
                            background: #a855f7;
                            width: ${Math.min(28 + (loc.count || 1) * 2, 48)}px;
                            height: ${Math.min(28 + (loc.count || 1) * 2, 48)}px;
                            border-radius: 50%;
                            border: 3px solid white;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                          ">
                            <span style="color: white; font-size: 11px; font-weight: bold;">${loc.count || 1}</span>
                          </div>`,
                          className: 'custom-marker',
                          iconSize: [Math.min(28 + (loc.count || 1) * 2, 48), Math.min(28 + (loc.count || 1) * 2, 48)],
                          iconAnchor: [Math.min(14 + (loc.count || 1), 24), Math.min(14 + (loc.count || 1), 24)],
                        });
                        return (
                          <Marker key={`vol-${loc.id}`} position={[loc.lat, loc.lng]} icon={volunteerIcon}>
                            <Popup>
                              <div style={{ minWidth: '180px' }}>
                                <p style={{ fontWeight: 600, margin: '0 0 4px 0', color: '#a855f7' }}>{loc.name}</p>
                                <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                                  <strong>Location:</strong> {loc.location}
                                </p>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                    </MapContainer>
                  )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 mt-4 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    <span className="text-sm text-gray-600">Organizations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-sm text-gray-600">Projects</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                    <span className="text-sm text-gray-600">Volunteers</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

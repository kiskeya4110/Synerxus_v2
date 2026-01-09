import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Users, Building2, FolderOpen, Briefcase, Activity, Clock,
  Server, Database, Cpu, HardDrive, Search, RefreshCw,
  CheckCircle, XCircle, AlertCircle, TrendingUp, TrendingDown,
  UserPlus, Shield, MapPin, Bell, ArrowUpRight, ArrowDownRight,
  Zap, Target, BarChart3, PieChart, FileCheck, UserCheck,
  ClipboardList, AlertTriangle, ChevronRight, Eye, ArrowLeft, Menu,
  LogOut, X, Home, Settings
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

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

// Types
interface EnhancedStats {
  totals: {
    users: number;
    volunteers: number;
    organizations: number;
    projects: number;
    activeProjects: number;
    opportunities: number;
    applications: number;
    activities: number;
    totalHours: number;
    verifiedHours: number;
  };
  thisWeek: {
    users: number;
    organizations: number;
    projects: number;
    applications: number;
    hours: number;
  };
  lastWeek: {
    users: number;
    organizations: number;
    projects: number;
    applications: number;
    hours: number;
  };
  growth: {
    users: number;
    organizations: number;
    projects: number;
    applications: number;
    hours: number;
  };
  actionItems: {
    pendingApprovals: number;
    pendingApplications: number;
    unverifiedHours: number;
  };
  trends: {
    userSignups: { month: string; count: number }[];
    activityByDay: { day: string; count: number; hours: number }[];
  };
  engagement: {
    applicationRate: number;
    avgHoursPerVolunteer: number;
    verificationRate: number;
  };
  updatedAt: string;
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

// Mini Sparkline Component
function Sparkline({ data, color = "#3b82f6", height = 32 }: { data: number[]; color?: string; height?: number }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const width = 80;
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1 || 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// Trend Indicator Component
function TrendIndicator({ value, suffix = "%" }: { value: number; suffix?: string }) {
  if (value === 0) {
    return <span className="text-xs text-gray-500">No change</span>;
  }

  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}{suffix}
    </span>
  );
}

// Hero KPI Card Component
function HeroKpiCard({
  title,
  value,
  subtitle,
  trend,
  trendLabel,
  icon: Icon,
  color,
  sparklineData,
  onClick
}: {
  title: string;
  value: number | string;
  subtitle?: string;
  trend?: number;
  trendLabel?: string;
  icon: any;
  color: string;
  sparklineData?: number[];
  onClick?: () => void;
}) {
  const colorClasses: Record<string, { bg: string; text: string; light: string }> = {
    blue: { bg: "bg-blue-500", text: "text-blue-600", light: "bg-blue-50" },
    green: { bg: "bg-green-500", text: "text-green-600", light: "bg-green-50" },
    purple: { bg: "bg-purple-500", text: "text-purple-600", light: "bg-purple-50" },
    amber: { bg: "bg-amber-500", text: "text-amber-600", light: "bg-amber-50" },
    red: { bg: "bg-red-500", text: "text-red-600", light: "bg-red-50" },
    indigo: { bg: "bg-indigo-500", text: "text-indigo-600", light: "bg-indigo-50" },
    teal: { bg: "bg-teal-500", text: "text-teal-600", light: "bg-teal-50" },
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <Card
      className={`relative overflow-hidden transition-all hover:shadow-lg ${onClick ? 'cursor-pointer hover:border-gray-300' : ''}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            {trend !== undefined && (
              <div className="mt-2 flex items-center gap-2">
                <TrendIndicator value={trend} />
                {trendLabel && <span className="text-xs text-gray-400">{trendLabel}</span>}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`p-2 rounded-lg ${colors.light}`}>
              <Icon className={`h-5 w-5 ${colors.text}`} />
            </div>
            {sparklineData && sparklineData.length > 1 && (
              <Sparkline data={sparklineData} color={colors.text.replace('text-', '').includes('blue') ? '#3b82f6' : colors.text.includes('green') ? '#22c55e' : '#8b5cf6'} />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Action Item Card Component
function ActionItemCard({
  title,
  count,
  description,
  icon: Icon,
  color,
  onClick
}: {
  title: string;
  count: number;
  description: string;
  icon: any;
  color: string;
  onClick?: () => void;
}) {
  if (count === 0) return null;

  const colorClasses: Record<string, string> = {
    red: "border-l-red-500 bg-red-50",
    amber: "border-l-amber-500 bg-amber-50",
    blue: "border-l-blue-500 bg-blue-50",
  };

  return (
    <div
      className={`border-l-4 rounded-r-lg p-3 ${colorClasses[color] || colorClasses.amber} cursor-pointer hover:shadow-md transition-shadow`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${color === 'red' ? 'text-red-600' : color === 'amber' ? 'text-amber-600' : 'text-blue-600'}`} />
          <div>
            <p className="font-medium text-sm">{title}</p>
            <p className="text-xs text-gray-600">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-bold">{count}</Badge>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </div>
      </div>
    </div>
  );
}

// Engagement Metric Card
function EngagementCard({
  title,
  value,
  max,
  suffix,
  icon: Icon,
  color
}: {
  title: string;
  value: number;
  max?: number;
  suffix?: string;
  icon: any;
  color: string;
}) {
  const colorClasses: Record<string, { bar: string; text: string }> = {
    blue: { bar: "bg-blue-500", text: "text-blue-600" },
    green: { bar: "bg-green-500", text: "text-green-600" },
    purple: { bar: "bg-purple-500", text: "text-purple-600" },
  };
  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${colors.text}`} />
        <span className="text-sm text-gray-600">{title}</span>
      </div>
      <p className="text-xl font-bold">{value}{suffix}</p>
      {max !== undefined && (
        <Progress value={(value / max) * 100} className={`h-1.5 mt-2 ${colors.bar}`} />
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [orgStatusFilter, setOrgStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const { user: firebaseUser, signOut } = useAuth();

  const userId = localStorage.getItem("currentUserId");

  // Fetch current user for profile display
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const response = await fetch(url);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId || !!firebaseUser
  });

  const handleLogout = async () => {
    setProfileMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const userInitial = (currentUser?.displayName || currentUser?.username || 'A').charAt(0).toUpperCase();

  // Fetch enhanced stats
  const { data: enhancedStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<EnhancedStats>({
    queryKey: ["/api/admin/stats/enhanced"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats/enhanced");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    refetchInterval: 30000 // Refresh every 30 seconds
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
    refetchInterval: 10000
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

  const [mapFilter, setMapFilter] = useState<'all' | 'organizations' | 'projects' | 'volunteers'>('all');

  const handleRefreshAll = () => {
    refetchStats();
    refetchUsers();
    refetchActivity();
    refetchLocations();
    refetchOrgs();
    refetchSystem();
  };

  // Prepare sparkline data from trends
  const userSparklineData = useMemo(() => {
    return enhancedStats?.trends?.userSignups?.map(t => t.count) || [];
  }, [enhancedStats]);

  const activitySparklineData = useMemo(() => {
    return enhancedStats?.trends?.activityByDay?.slice(-14).map(t => t.count) || [];
  }, [enhancedStats]);

  const hoursSparklineData = useMemo(() => {
    return enhancedStats?.trends?.activityByDay?.slice(-14).map(t => t.hours) || [];
  }, [enhancedStats]);

  // Total action items (only org approvals - admin's responsibility)
  const totalActionItems = enhancedStats?.actionItems?.pendingApprovals || 0;

  const getUserTypeBadge = (userType: string | null, clickable = true) => {
    const handleClick = clickable ? (type: string) => {
      setUserTypeFilter(type);
      setActiveTab("users");
    } : undefined;

    switch (userType) {
      case "volunteer":
        return (
          <Badge
            className={`bg-blue-100 text-blue-800 ${clickable ? 'cursor-pointer hover:bg-blue-200' : ''}`}
            onClick={clickable ? () => handleClick?.("volunteer") : undefined}
          >
            Volunteer
          </Badge>
        );
      case "organization":
        return (
          <Badge
            className={`bg-green-100 text-green-800 ${clickable ? 'cursor-pointer hover:bg-green-200' : ''}`}
            onClick={clickable ? () => handleClick?.("organization") : undefined}
          >
            Organization
          </Badge>
        );
      case "corporate-partner":
      case "corporate_partner":
        return (
          <Badge
            className={`bg-purple-100 text-purple-800 ${clickable ? 'cursor-pointer hover:bg-purple-200' : ''}`}
            onClick={clickable ? () => handleClick?.("corporate-partner") : undefined}
          >
            Corporate
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getStatusBadge = (status: string | null, clickable = true) => {
    const handleClick = clickable ? (filterStatus: string) => {
      setOrgStatusFilter(filterStatus);
      setActiveTab("organizations");
    } : undefined;

    switch (status) {
      case "approved":
        return (
          <Badge
            className={`bg-green-100 text-green-800 ${clickable ? 'cursor-pointer hover:bg-green-200' : ''}`}
            onClick={clickable ? () => handleClick?.("approved") : undefined}
          >
            Approved
          </Badge>
        );
      case "pending":
        return (
          <Badge
            className={`bg-yellow-100 text-yellow-800 ${clickable ? 'cursor-pointer hover:bg-yellow-200' : ''}`}
            onClick={clickable ? () => handleClick?.("pending") : undefined}
          >
            Pending
          </Badge>
        );
      case "rejected":
        return (
          <Badge
            className={`bg-red-100 text-red-800 ${clickable ? 'cursor-pointer hover:bg-red-200' : ''}`}
            onClick={clickable ? () => handleClick?.("rejected") : undefined}
          >
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">{status || "Unknown"}</Badge>;
    }
  };

  // Mobile tab items
  const mobileTabItems = [
    { value: 'overview', icon: BarChart3, label: 'Overview' },
    { value: 'users', icon: Users, label: 'Users' },
    { value: 'activity', icon: Activity, label: 'Activity' },
    { value: 'organizations', icon: Building2, label: 'Orgs' },
    { value: 'system', icon: Server, label: 'System' },
    { value: 'locations', icon: MapPin, label: 'Map' },
  ];

  return (
    <div className={`${isMobile ? 'fixed inset-0 flex flex-col overflow-hidden' : 'min-h-screen'} bg-gray-50`}>
      {/* Header - Colorful gradient style */}
      <header className={`bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-400 ${isMobile ? 'flex-shrink-0' : ''}`}>
        <div className={`${isMobile ? 'px-3 py-3' : 'max-w-7xl mx-auto px-6 py-4'}`}>
          <div className="flex items-center justify-between">
            {/* Left: Logo and Title */}
            <div className="flex items-center gap-3 md:gap-4">
              {isMobile && (
                <button
                  onClick={() => window.history.back()}
                  className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 text-white" />
                </button>
              )}
              <button
                onClick={() => navigate('/volunteer-dashboard')}
                className="flex items-center hover:opacity-90 transition-opacity"
              >
                <img
                  src={logoUrl}
                  alt="Synerxus"
                  className={`${isMobile ? 'h-8' : 'h-10'} w-auto object-contain`}
                  style={{ maxWidth: isMobile ? '100px' : '140px' }}
                />
              </button>

              {/* Admin Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/25 backdrop-blur-sm rounded-full">
                <Shield className="w-4 h-4 text-white" />
                <span className="text-white text-sm font-semibold">Admin</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 md:gap-3">
              {/* Pending Approvals Notification */}
              {totalActionItems > 0 && (
                <button
                  onClick={() => { setOrgStatusFilter("pending"); setActiveTab("organizations"); }}
                  className="relative w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all shadow-sm"
                >
                  <Bell className="w-5 h-5 text-white" />
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-lg">
                    {totalActionItems > 9 ? '9+' : totalActionItems}
                  </span>
                </button>
              )}

              {/* Last Updated - Desktop only */}
              {enhancedStats?.updatedAt && !isMobile && (
                <span className="text-xs text-white/70 hidden lg:block px-3 py-1 bg-white/10 rounded-full">
                  Updated {formatDistanceToNow(new Date(enhancedStats.updatedAt), { addSuffix: true })}
                </span>
              )}

              {/* Refresh Button */}
              <button
                onClick={handleRefreshAll}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all shadow-sm"
                title="Refresh data"
              >
                <RefreshCw className="w-5 h-5 text-white" />
              </button>

              {/* Profile/Menu Button */}
              <button
                onClick={() => setProfileMenuOpen(true)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all shadow-sm"
              >
                <Avatar className="h-8 w-8 border-2 border-white/40 shadow-sm">
                  <AvatarImage src={currentUser?.avatar} alt={currentUser?.displayName || 'Admin'} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white text-sm font-semibold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <Menu className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Slide-out Profile Menu */}
      {profileMenuOpen && (
        <div className="fixed inset-0 z-[100] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setProfileMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="relative ml-auto w-[320px] max-w-[85%] h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
            {/* Menu Header */}
            <div className="bg-gradient-to-br from-purple-700 via-indigo-600 to-purple-700 px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white/70 text-xs font-medium flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Admin Menu
                </span>
                <button
                  onClick={() => setProfileMenuOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                  <AvatarImage src={currentUser?.avatar} alt={currentUser?.displayName || 'Admin'} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white text-lg font-semibold">
                    {userInitial}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold text-base truncate">
                    {currentUser?.displayName || currentUser?.username || 'Admin'}
                  </p>
                  <p className="text-white/60 text-sm truncate">
                    {currentUser?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-2">
              {[
                { icon: Home, label: "Dashboard", action: () => { setProfileMenuOpen(false); setActiveTab('overview'); } },
                { icon: Users, label: "Users", action: () => { setProfileMenuOpen(false); setActiveTab('users'); } },
                { icon: Building2, label: "Organizations", action: () => { setProfileMenuOpen(false); setActiveTab('organizations'); } },
                { icon: Activity, label: "Activity", action: () => { setProfileMenuOpen(false); setActiveTab('activity'); } },
                { icon: Server, label: "System", action: () => { setProfileMenuOpen(false); setActiveTab('system'); } },
                { icon: MapPin, label: "Map", action: () => { setProfileMenuOpen(false); setActiveTab('locations'); } },
                { icon: BarChart3, label: "Analytics", path: "/admin/dashboard" },
                { icon: Settings, label: "Settings", path: "/volunteer-profile-settings" },
              ].map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else if (item.path) {
                      setProfileMenuOpen(false);
                      navigate(item.path);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left text-slate-700 hover:bg-slate-50"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-slate-100">
                    <item.icon className="w-4.5 h-4.5 text-slate-600" />
                  </div>
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-200 p-4">
              <button
                onClick={() => { setProfileMenuOpen(false); navigate('/volunteer-dashboard'); }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to App</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium text-sm hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`${isMobile ? 'flex-1 overflow-y-auto' : 'max-w-7xl mx-auto px-4 py-6'}`} style={isMobile ? { paddingBottom: 'calc(70px + env(safe-area-inset-bottom, 0px))' } : {}}>
        <div className={isMobile ? 'p-3' : ''}>
        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
          {/* Desktop Tabs */}
          {!isMobile && (
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid bg-white shadow-sm">
            <TabsTrigger value="overview" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
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
              Map
            </TabsTrigger>
          </TabsList>
          )}

          {/* Mobile Tabs - Horizontal scroll */}
          {isMobile && (
            <div className="overflow-x-auto -mx-3 px-3">
              <div className="flex gap-2 pb-2" style={{ minWidth: 'max-content' }}>
                {mobileTabItems.map((tab) => {
                  const isActive = activeTab === tab.value;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setActiveTab(tab.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-slate-600 border border-slate-200'
                      }`}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Overview Tab - Main Dashboard */}
          <TabsContent value="overview" className="space-y-6">
            {/* Action Items Section - Organization Approvals Only */}
            {(enhancedStats?.actionItems?.pendingApprovals || 0) > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Action Required
                </h2>
                <div className="max-w-md">
                  <ActionItemCard
                    title="Pending Org Approvals"
                    count={enhancedStats?.actionItems?.pendingApprovals || 0}
                    description="New organizations waiting for review"
                    icon={Building2}
                    color="red"
                    onClick={() => { setOrgStatusFilter("pending"); setActiveTab("organizations"); }}
                  />
                </div>
              </div>
            )}

            {/* Hero KPIs - Primary Metrics */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-500" />
                Key Performance Indicators
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <HeroKpiCard
                  title="Total Users"
                  value={enhancedStats?.totals?.users || 0}
                  subtitle={`${enhancedStats?.totals?.volunteers || 0} volunteers`}
                  trend={enhancedStats?.growth?.users}
                  trendLabel="vs last week"
                  icon={Users}
                  color="blue"
                  sparklineData={userSparklineData}
                  onClick={() => setActiveTab("users")}
                />
                <HeroKpiCard
                  title="Organizations"
                  value={enhancedStats?.totals?.organizations || 0}
                  subtitle={`${enhancedStats?.thisWeek?.organizations || 0} this week`}
                  trend={enhancedStats?.growth?.organizations}
                  trendLabel="vs last week"
                  icon={Building2}
                  color="green"
                  onClick={() => setActiveTab("organizations")}
                />
                <HeroKpiCard
                  title="Active Projects"
                  value={enhancedStats?.totals?.activeProjects || 0}
                  subtitle={`${enhancedStats?.totals?.projects || 0} total`}
                  trend={enhancedStats?.growth?.projects}
                  trendLabel="vs last week"
                  icon={FolderOpen}
                  color="purple"
                />
                <HeroKpiCard
                  title="Total Hours"
                  value={enhancedStats?.totals?.totalHours || 0}
                  subtitle={`${enhancedStats?.totals?.verifiedHours || 0} verified`}
                  trend={enhancedStats?.growth?.hours}
                  trendLabel="vs last week"
                  icon={Clock}
                  color="amber"
                  sparklineData={hoursSparklineData}
                />
              </div>
            </div>

            {/* Secondary Metrics Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <HeroKpiCard
                title="Opportunities"
                value={enhancedStats?.totals?.opportunities || 0}
                icon={Briefcase}
                color="indigo"
              />
              <HeroKpiCard
                title="Applications"
                value={enhancedStats?.totals?.applications || 0}
                subtitle={`${enhancedStats?.thisWeek?.applications || 0} this week`}
                trend={enhancedStats?.growth?.applications}
                trendLabel="vs last week"
                icon={ClipboardList}
                color="teal"
              />
              <HeroKpiCard
                title="Activity Logs"
                value={enhancedStats?.totals?.activities || 0}
                icon={Activity}
                color="purple"
                sparklineData={activitySparklineData}
                onClick={() => setActiveTab("activity")}
              />
              <HeroKpiCard
                title="New This Week"
                value={enhancedStats?.thisWeek?.users || 0}
                subtitle="user signups"
                icon={UserPlus}
                color="green"
              />
            </div>

            {/* Engagement Metrics */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-500" />
                Engagement Metrics
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                <EngagementCard
                  title="Application Rate"
                  value={enhancedStats?.engagement?.applicationRate || 0}
                  max={100}
                  suffix="%"
                  icon={Target}
                  color="blue"
                />
                <EngagementCard
                  title="Avg Hours/Volunteer"
                  value={enhancedStats?.engagement?.avgHoursPerVolunteer || 0}
                  suffix=" hrs"
                  icon={Clock}
                  color="green"
                />
                <EngagementCard
                  title="Verification Rate"
                  value={enhancedStats?.engagement?.verificationRate || 0}
                  max={100}
                  suffix="%"
                  icon={CheckCircle}
                  color="purple"
                />
              </div>
            </div>

            {/* Quick Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Recent Activity Summary */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {activityLoading ? (
                      <div className="text-center py-4 text-gray-500">Loading...</div>
                    ) : activity.slice(0, 5).length === 0 ? (
                      <div className="text-center py-4 text-gray-500">No recent activity</div>
                    ) : (
                      <div className="space-y-3">
                        {activity.slice(0, 5).map((log) => (
                          <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <div className="p-1.5 bg-blue-100 rounded-full">
                              <Activity className="h-3 w-3 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{log.volunteerName}</p>
                              <p className="text-xs text-gray-500 truncate">{log.projectName}</p>
                            </div>
                            <span className="text-xs text-gray-400 whitespace-nowrap">
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setActiveTab("activity")}
                  >
                    View All Activity <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>

              {/* Pending Organizations */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Pending Organizations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px]">
                    {orgsLoading ? (
                      <div className="text-center py-4 text-gray-500">Loading...</div>
                    ) : organizations.filter(o => o.approvalStatus === 'pending').length === 0 ? (
                      <div className="text-center py-4 text-gray-500 flex flex-col items-center">
                        <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                        <p>All caught up!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {organizations.filter(o => o.approvalStatus === 'pending').slice(0, 5).map((org) => (
                          <div key={org.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={org.logo || undefined} />
                              <AvatarFallback className="bg-green-100">
                                <Building2 className="h-4 w-4 text-green-600" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{org.name}</p>
                              <p className="text-xs text-gray-500">{org.projectCount} projects</p>
                            </div>
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              Pending
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => { setOrgStatusFilter("pending"); setActiveTab("organizations"); }}
                  >
                    Review All <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => navigate("/profile")}
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
                                  {" "}logged activity
                                </span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {log.projectName} {log.hoursLogged ? `• ${log.hoursLogged}h` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.status && getStatusBadge(log.status, false)}
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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle>All Organizations</CardTitle>
                    <CardDescription>{organizations.length} registered organizations</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={orgStatusFilter} onValueChange={setOrgStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {orgsLoading ? (
                      <div className="text-center py-8 text-gray-500">Loading organizations...</div>
                    ) : organizations.filter(org => orgStatusFilter === 'all' || org.approvalStatus === orgStatusFilter).length === 0 ? (
                      <div className="text-center py-8 text-gray-500">No organizations found</div>
                    ) : (
                      organizations.filter(org => orgStatusFilter === 'all' || org.approvalStatus === orgStatusFilter).map((org) => (
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
                            {getStatusBadge(org.approvalStatus, false)}
                            {org.approvalStatus === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const response = await fetch(`/api/organizations/${org.id}/approval`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: parseInt(userId || '0'), status: 'approved' })
                                      });
                                      if (response.ok) {
                                        refetchOrgs();
                                        refetchStats();
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
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const response = await fetch(`/api/organizations/${org.id}/approval`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ userId: parseInt(userId || '0'), status: 'rejected' })
                                      });
                                      if (response.ok) {
                                        refetchOrgs();
                                        refetchStats();
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
                    Platform Stats
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <Briefcase className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                      <p className="text-2xl font-bold text-blue-600">{enhancedStats?.totals?.opportunities || 0}</p>
                      <p className="text-sm text-gray-600">Opportunities</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <p className="text-2xl font-bold text-green-600">{enhancedStats?.totals?.applications || 0}</p>
                      <p className="text-sm text-gray-600">Applications</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <Activity className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                      <p className="text-2xl font-bold text-purple-600">{enhancedStats?.totals?.activities || 0}</p>
                      <p className="text-sm text-gray-600">Activity Logs</p>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-lg">
                      <Users className="h-8 w-8 mx-auto mb-2 text-amber-600" />
                      <p className="text-2xl font-bold text-amber-600">{enhancedStats?.totals?.volunteers || 0}</p>
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
                  <div
                    className={`text-center p-3 rounded-lg cursor-pointer transition-all ${
                      mapFilter === 'organizations' ? 'bg-blue-200 ring-2 ring-blue-400' : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                    onClick={() => setMapFilter(mapFilter === 'organizations' ? 'all' : 'organizations')}
                  >
                    <Building2 className="h-6 w-6 mx-auto mb-1 text-blue-600" />
                    <p className="text-xl font-bold text-blue-600">{locationsData?.summary?.totalOrganizations || 0}</p>
                    <p className="text-xs text-gray-600">Organizations</p>
                  </div>
                  <div
                    className={`text-center p-3 rounded-lg cursor-pointer transition-all ${
                      mapFilter === 'projects' ? 'bg-green-200 ring-2 ring-green-400' : 'bg-green-50 hover:bg-green-100'
                    }`}
                    onClick={() => setMapFilter(mapFilter === 'projects' ? 'all' : 'projects')}
                  >
                    <Briefcase className="h-6 w-6 mx-auto mb-1 text-green-600" />
                    <p className="text-xl font-bold text-green-600">{locationsData?.summary?.totalProjects || 0}</p>
                    <p className="text-xs text-gray-600">Projects</p>
                  </div>
                  <div
                    className={`text-center p-3 rounded-lg cursor-pointer transition-all ${
                      mapFilter === 'volunteers' ? 'bg-purple-200 ring-2 ring-purple-400' : 'bg-purple-50 hover:bg-purple-100'
                    }`}
                    onClick={() => setMapFilter(mapFilter === 'volunteers' ? 'all' : 'volunteers')}
                  >
                    <MapPin className="h-6 w-6 mx-auto mb-1 text-purple-600" />
                    <p className="text-xl font-bold text-purple-600">{locationsData?.summary?.totalVolunteerLocations || 0}</p>
                    <p className="text-xs text-gray-600">Volunteer Locations</p>
                  </div>
                  <div
                    className={`text-center p-3 rounded-lg cursor-pointer transition-all ${
                      mapFilter === 'all' ? 'bg-amber-200 ring-2 ring-amber-400' : 'bg-amber-50 hover:bg-amber-100'
                    }`}
                    onClick={() => setMapFilter('all')}
                  >
                    <Users className="h-6 w-6 mx-auto mb-1 text-amber-600" />
                    <p className="text-xl font-bold text-amber-600">{locationsData?.summary?.totalVolunteers || 0}</p>
                    <p className="text-xs text-gray-600">Show All</p>
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
                      key="admin-locations-map"
                      center={[20, 0]}
                      zoom={2}
                      style={{ width: "100%", height: "100%" }}
                      scrollWheelZoom={true}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
                      />

                      {/* Organization Markers - High Contrast Flag Pins */}
                      {(mapFilter === 'all' || mapFilter === 'organizations') && locationsData?.organizations?.map((loc) => {
                        const orgIcon = L.divIcon({
                          html: `<div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                            <!-- Flag Pin Shape -->
                            <div style="
                              background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
                              width: 32px;
                              height: 42px;
                              clip-path: polygon(50% 100%, 0% 30%, 0% 0%, 100% 0%, 100% 30%);
                              border: none;
                              box-shadow: 0 4px 12px rgba(29, 78, 216, 0.6), 0 2px 4px rgba(0,0,0,0.4);
                              display: flex;
                              align-items: flex-start;
                              justify-content: center;
                              padding-top: 6px;
                            ">
                              <span style="color: white; font-size: 16px; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">🏢</span>
                            </div>
                            <!-- Location Label -->
                            <div style="
                              position: absolute;
                              top: 46px;
                              left: 50%;
                              transform: translateX(-50%);
                              background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
                              color: white;
                              padding: 4px 10px;
                              border-radius: 4px;
                              font-size: 11px;
                              font-weight: 700;
                              white-space: nowrap;
                              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                              border: 2px solid rgba(255,255,255,0.8);
                              max-width: 140px;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                            ">${loc.name?.substring(0, 18) || 'Organization'}${loc.name?.length > 18 ? '...' : ''}</div>
                          </div>`,
                          className: '',
                          iconSize: [44, 70],
                          iconAnchor: [22, 42],
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

                      {/* Project Markers - High Contrast Flag Pins */}
                      {(mapFilter === 'all' || mapFilter === 'projects') && locationsData?.projects?.map((loc) => {
                        const projectIcon = L.divIcon({
                          html: `<div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                            <!-- Flag Pin Shape -->
                            <div style="
                              background: linear-gradient(135deg, #15803d 0%, #22c55e 100%);
                              width: 32px;
                              height: 42px;
                              clip-path: polygon(50% 100%, 0% 30%, 0% 0%, 100% 0%, 100% 30%);
                              border: none;
                              box-shadow: 0 4px 12px rgba(21, 128, 61, 0.6), 0 2px 4px rgba(0,0,0,0.4);
                              display: flex;
                              align-items: flex-start;
                              justify-content: center;
                              padding-top: 6px;
                            ">
                              <span style="color: white; font-size: 16px; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">📍</span>
                            </div>
                            <!-- Location Label -->
                            <div style="
                              position: absolute;
                              top: 46px;
                              left: 50%;
                              transform: translateX(-50%);
                              background: linear-gradient(135deg, #166534 0%, #16a34a 100%);
                              color: white;
                              padding: 4px 10px;
                              border-radius: 4px;
                              font-size: 11px;
                              font-weight: 700;
                              white-space: nowrap;
                              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                              border: 2px solid rgba(255,255,255,0.8);
                              max-width: 140px;
                              overflow: hidden;
                              text-overflow: ellipsis;
                              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                            ">${loc.name?.substring(0, 18) || 'Project'}${loc.name?.length > 18 ? '...' : ''}</div>
                          </div>`,
                          className: '',
                          iconSize: [44, 70],
                          iconAnchor: [22, 42],
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

                      {/* Volunteer Markers - High Contrast */}
                      {(mapFilter === 'all' || mapFilter === 'volunteers') && locationsData?.volunteers?.map((loc) => {
                        const size = Math.min(32 + (loc.count || 1) * 3, 56);
                        const volunteerIcon = L.divIcon({
                          html: `<div style="position: relative; display: flex; flex-direction: column; align-items: center;">
                            <!-- Volunteer Badge -->
                            <div style="
                              background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
                              width: ${size}px;
                              height: ${size}px;
                              border-radius: 50%;
                              border: 4px solid white;
                              box-shadow: 0 4px 12px rgba(124, 58, 237, 0.6), 0 2px 4px rgba(0,0,0,0.4);
                              display: flex;
                              align-items: center;
                              justify-content: center;
                            ">
                              <span style="color: white; font-size: ${Math.max(14, size / 3)}px; font-weight: bold; text-shadow: 0 1px 3px rgba(0,0,0,0.5);">${loc.count || 1}</span>
                            </div>
                            <!-- Location Label -->
                            <div style="
                              position: absolute;
                              top: ${size + 4}px;
                              left: 50%;
                              transform: translateX(-50%);
                              background: linear-gradient(135deg, #6d28d9 0%, #8b5cf6 100%);
                              color: white;
                              padding: 3px 8px;
                              border-radius: 4px;
                              font-size: 10px;
                              font-weight: 700;
                              white-space: nowrap;
                              box-shadow: 0 3px 8px rgba(0,0,0,0.4);
                              border: 2px solid rgba(255,255,255,0.8);
                              text-shadow: 0 1px 2px rgba(0,0,0,0.3);
                            ">${loc.count || 1} volunteer${(loc.count || 1) > 1 ? 's' : ''}</div>
                          </div>`,
                          className: '',
                          iconSize: [size + 20, size + 30],
                          iconAnchor: [(size + 20) / 2, size / 2],
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
    </div>
  );
}

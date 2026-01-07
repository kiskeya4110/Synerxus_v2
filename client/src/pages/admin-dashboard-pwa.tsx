import { useState, useMemo, startTransition } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Users, Building2, Activity, Clock,
  Server, RefreshCw, CheckCircle, XCircle, AlertCircle,
  TrendingUp, TrendingDown, Shield, Bell,
  ArrowUpRight, ArrowDownRight, BarChart3, ChevronRight,
  ArrowLeft, Home, Settings, UserCheck, Briefcase,
  Eye, Menu, X, Database, Cpu, Zap
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
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

interface SystemInfo {
  memory: {
    heapUsed: string;
    heapTotal: string;
    rss: string;
  };
  uptime: {
    formatted: string;
  };
  database: {
    connected: boolean;
  };
  nodeVersion: string;
  platform: string;
}

// Trend Indicator Component
function TrendIndicator({ value }: { value: number }) {
  if (value === 0) return <span className="text-[10px] text-slate-500">No change</span>;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
      {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {Math.abs(value)}%
    </span>
  );
}

export default function AdminDashboardPWA() {
  const [, navigate] = useLocation();
  const { user: currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orgs' | 'activity' | 'system'>('overview');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const queryClient = useQueryClient();

  // Check admin access
  if (!currentUser?.isAdmin) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-white text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-slate-400 text-sm mb-4">You don't have admin privileges.</p>
          <button
            onClick={() => navigate('/volunteer-dashboard')}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Fetch enhanced stats
  const { data: enhancedStats, isLoading: statsLoading, refetch: refetchStats } = useQuery<EnhancedStats>({
    queryKey: ["/api/admin/stats/enhanced"],
    queryFn: async () => {
      const response = await fetch("/api/admin/stats/enhanced");
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    refetchInterval: 30000
  });

  // Fetch users
  const { data: usersData, refetch: refetchUsers } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const response = await fetch("/api/admin/users?limit=50");
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    }
  });

  // Fetch organizations
  const { data: organizations = [], refetch: refetchOrgs } = useQuery<Organization[]>({
    queryKey: ["/api/admin/organizations"],
    queryFn: async () => {
      const response = await fetch("/api/admin/organizations");
      if (!response.ok) throw new Error("Failed to fetch organizations");
      return response.json();
    }
  });

  // Fetch activity
  const { data: activity = [], refetch: refetchActivity } = useQuery<ActivityLog[]>({
    queryKey: ["/api/admin/activity"],
    queryFn: async () => {
      const response = await fetch("/api/admin/activity?limit=30");
      if (!response.ok) throw new Error("Failed to fetch activity");
      return response.json();
    }
  });

  // Fetch system info
  const { data: systemInfo, refetch: refetchSystem } = useQuery<SystemInfo>({
    queryKey: ["/api/admin/system"],
    queryFn: async () => {
      const response = await fetch("/api/admin/system");
      if (!response.ok) throw new Error("Failed to fetch system info");
      return response.json();
    },
    refetchInterval: 10000
  });

  const handleRefreshAll = () => {
    refetchStats();
    refetchUsers();
    refetchOrgs();
    refetchActivity();
    refetchSystem();
  };

  const users = usersData?.users || [];
  const totalActionItems = (enhancedStats?.actionItems?.pendingApprovals || 0);
  const pendingOrgs = organizations.filter(o => o.approvalStatus === 'pending');

  // Tab items for bottom nav
  const tabItems = [
    { id: 'overview', icon: Home, label: 'Overview' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'orgs', icon: Building2, label: 'Orgs' },
    { id: 'activity', icon: Activity, label: 'Activity' },
    { id: 'system', icon: Server, label: 'System' },
  ];

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-100 max-w-[428px] mx-auto">
      {/* Header */}
      <header
        className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)',
          paddingTop: 'max(12px, env(safe-area-inset-top))'
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.history.back()}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
          </button>
          <img src={logoUrl} alt="Synerxus" className="h-6" />
          <div>
            <h1 className="text-white text-sm font-bold flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-amber-400" />
              Admin Dashboard
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {totalActionItems > 0 && (
            <button
              onClick={() => startTransition(() => setActiveTab('orgs'))}
              className="px-2 py-1 bg-amber-500/20 border border-amber-500/50 rounded-lg flex items-center gap-1"
            >
              <Bell className="h-3 w-3 text-amber-400" />
              <span className="text-amber-300 text-xs font-medium">{totalActionItems}</span>
            </button>
          )}
          <button
            onClick={handleRefreshAll}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
          >
            <RefreshCw className="h-4 w-4 text-white" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3">
            {/* Action Items Alert */}
            {totalActionItems > 0 && (
              <button
                onClick={() => startTransition(() => setActiveTab('orgs'))}
                className="w-full bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-amber-800 text-sm font-semibold">Action Required</div>
                  <div className="text-amber-600 text-xs">{totalActionItems} organization{totalActionItems !== 1 ? 's' : ''} pending approval</div>
                </div>
                <ChevronRight className="w-5 h-5 text-amber-400" />
              </button>
            )}

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-slate-600 text-xs font-medium">Total Users</span>
                </div>
                <div className="text-slate-900 text-2xl font-bold">{enhancedStats?.totals?.users?.toLocaleString() || 0}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIndicator value={enhancedStats?.growth?.users || 0} />
                  <span className="text-slate-500 text-[10px]">vs last week</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <UserCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-slate-600 text-xs font-medium">Volunteers</span>
                </div>
                <div className="text-slate-900 text-2xl font-bold">{enhancedStats?.totals?.volunteers?.toLocaleString() || 0}</div>
                <div className="text-slate-500 text-[10px] mt-1">Active volunteers</div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-slate-600 text-xs font-medium">Organizations</span>
                </div>
                <div className="text-slate-900 text-2xl font-bold">{enhancedStats?.totals?.organizations?.toLocaleString() || 0}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIndicator value={enhancedStats?.growth?.organizations || 0} />
                  <span className="text-slate-500 text-[10px]">vs last week</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <span className="text-slate-600 text-xs font-medium">Total Hours</span>
                </div>
                <div className="text-slate-900 text-2xl font-bold">{enhancedStats?.totals?.totalHours?.toLocaleString() || 0}</div>
                <div className="flex items-center gap-1 mt-1">
                  <TrendIndicator value={enhancedStats?.growth?.hours || 0} />
                  <span className="text-slate-500 text-[10px]">vs last week</span>
                </div>
              </div>
            </div>

            {/* This Week Stats */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-3">This Week</h3>
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <div className="text-slate-900 text-lg font-bold">{enhancedStats?.thisWeek?.users || 0}</div>
                  <div className="text-slate-500 text-[10px]">New Users</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-900 text-lg font-bold">{enhancedStats?.thisWeek?.organizations || 0}</div>
                  <div className="text-slate-500 text-[10px]">New Orgs</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-900 text-lg font-bold">{enhancedStats?.thisWeek?.projects || 0}</div>
                  <div className="text-slate-500 text-[10px]">New Projects</div>
                </div>
                <div className="text-center">
                  <div className="text-slate-900 text-lg font-bold">{enhancedStats?.thisWeek?.hours || 0}</div>
                  <div className="text-slate-500 text-[10px]">Hours</div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-3">Platform Stats</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 text-sm">Active Projects</span>
                  </div>
                  <span className="text-slate-900 font-semibold">{enhancedStats?.totals?.activeProjects || 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 text-sm">Opportunities</span>
                  </div>
                  <span className="text-slate-900 font-semibold">{enhancedStats?.totals?.opportunities || 0}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 text-sm">Applications</span>
                  </div>
                  <span className="text-slate-900 font-semibold">{enhancedStats?.totals?.applications || 0}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-700 text-sm">Verified Hours</span>
                  </div>
                  <span className="text-slate-900 font-semibold">{enhancedStats?.totals?.verifiedHours?.toLocaleString() || 0}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity Preview */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-900 text-sm font-semibold">Recent Activity</h3>
                <button
                  onClick={() => startTransition(() => setActiveTab('activity'))}
                  className="text-blue-600 text-xs font-medium flex items-center gap-1"
                >
                  View All <ChevronRight className="w-3 h-3" />
                </button>
              </div>
              <div className="space-y-2">
                {activity.slice(0, 4).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 py-2 border-b border-slate-100 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <Activity className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-900 text-xs font-medium truncate">{item.volunteerName}</div>
                      <div className="text-slate-500 text-[10px] truncate">{item.activityType} - {item.projectName}</div>
                    </div>
                    <div className="text-slate-400 text-[10px]">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 text-lg font-bold">Users</h2>
              <span className="text-slate-500 text-sm">{users.length} total</span>
            </div>
            <div className="space-y-2">
              {users.map((user: AdminUser) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className="w-full bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3 text-left hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white font-bold text-sm">
                    {(user.displayName || user.email)?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-900 text-sm font-medium truncate">{user.displayName || user.username}</div>
                    <div className="text-slate-500 text-xs truncate">{user.email}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      user.userType === 'volunteer' ? 'bg-emerald-100 text-emerald-700' :
                      user.userType === 'organization' ? 'bg-purple-100 text-purple-700' :
                      user.userType === 'corporate-partner' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {user.userType || 'Unknown'}
                    </span>
                    {user.isAdmin && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">
                        Admin
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Organizations Tab */}
        {activeTab === 'orgs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-slate-900 text-lg font-bold">Organizations</h2>
              <span className="text-slate-500 text-sm">{organizations.length} total</span>
            </div>

            {/* Pending Approvals */}
            {pendingOrgs.length > 0 && (
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200">
                <h3 className="text-amber-800 text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Pending Approval ({pendingOrgs.length})
                </h3>
                <div className="space-y-2">
                  {pendingOrgs.map((org) => (
                    <div
                      key={org.id}
                      className="bg-white rounded-lg p-3 border border-amber-200 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-900 text-sm font-medium truncate">{org.name}</div>
                        <div className="text-slate-500 text-xs truncate">{org.contactEmail}</div>
                      </div>
                      <button
                        onClick={() => setSelectedOrg(org)}
                        className="px-3 py-1.5 bg-amber-500 text-white text-xs font-medium rounded-lg"
                      >
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Organizations */}
            <div className="space-y-2">
              {organizations.filter(o => o.approvalStatus !== 'pending').map((org) => (
                <button
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className="w-full bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center gap-3 text-left hover:bg-slate-50 active:scale-[0.98] transition-all"
                >
                  {org.logo ? (
                    <img src={org.logo} alt={org.name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-purple-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-900 text-sm font-medium truncate">{org.name}</div>
                    <div className="text-slate-500 text-xs">{org.memberCount} members - {org.projectCount} projects</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    org.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    org.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {org.approvalStatus || 'Unknown'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-3">
            <h2 className="text-slate-900 text-lg font-bold">Recent Activity</h2>
            <div className="space-y-2">
              {activity.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-slate-900 text-sm font-medium">{item.volunteerName}</div>
                      <div className="text-slate-700 text-xs mt-0.5">{item.activityType}</div>
                      <div className="text-slate-500 text-xs mt-1">Project: {item.projectName}</div>
                      {item.hoursLogged && (
                        <div className="text-emerald-600 text-xs mt-1 font-medium">{item.hoursLogged} hours logged</div>
                      )}
                    </div>
                    <div className="text-slate-400 text-[10px] flex-shrink-0">
                      {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Tab */}
        {activeTab === 'system' && (
          <div className="space-y-3">
            <h2 className="text-slate-900 text-lg font-bold">System Status</h2>

            {/* Database Status */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg ${systemInfo?.database?.connected ? 'bg-emerald-100' : 'bg-red-100'} flex items-center justify-center`}>
                  <Database className={`w-5 h-5 ${systemInfo?.database?.connected ? 'text-emerald-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <div className="text-slate-900 text-sm font-semibold">Database</div>
                  <div className={`text-xs ${systemInfo?.database?.connected ? 'text-emerald-600' : 'text-red-600'}`}>
                    {systemInfo?.database?.connected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
              </div>
            </div>

            {/* Server Info */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-3 flex items-center gap-2">
                <Server className="w-4 h-4 text-slate-500" />
                Server Info
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 text-sm">Uptime</span>
                  <span className="text-slate-900 text-sm font-medium">{systemInfo?.uptime?.formatted || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 text-sm">Node Version</span>
                  <span className="text-slate-900 text-sm font-medium">{systemInfo?.nodeVersion || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600 text-sm">Platform</span>
                  <span className="text-slate-900 text-sm font-medium">{systemInfo?.platform || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Memory Usage */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-3 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-slate-500" />
                Memory Usage
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 text-sm">Heap Used</span>
                  <span className="text-slate-900 text-sm font-medium">{systemInfo?.memory?.heapUsed || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600 text-sm">Heap Total</span>
                  <span className="text-slate-900 text-sm font-medium">{systemInfo?.memory?.heapTotal || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600 text-sm">RSS</span>
                  <span className="text-slate-900 text-sm font-medium">{systemInfo?.memory?.rss || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {enhancedStats?.updatedAt && (
              <div className="text-center text-slate-500 text-xs py-2">
                Last updated: {formatDistanceToNow(new Date(enhancedStats.updatedAt), { addSuffix: true })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-slate-200 px-2 py-2 max-w-[428px] mx-auto z-50 bg-white"
        style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-around items-center">
          {tabItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => startTransition(() => setActiveTab(tab.id as any))}
                className={`flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                <tab.icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setSelectedUser(null)}>
          <div
            className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">User Details</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center text-white font-bold text-xl">
                  {(selectedUser.displayName || selectedUser.email)?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <div className="text-slate-900 text-lg font-bold">{selectedUser.displayName || selectedUser.username}</div>
                  <div className="text-slate-500 text-sm">{selectedUser.email}</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">User Type</span>
                  <span className="text-slate-900 font-medium capitalize">{selectedUser.userType || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Admin</span>
                  <span className="text-slate-900 font-medium">{selectedUser.isAdmin ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Username</span>
                  <span className="text-slate-900 font-medium">{selectedUser.username}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Joined</span>
                  <span className="text-slate-900 font-medium">
                    {formatDistanceToNow(new Date(selectedUser.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organization Detail Modal */}
      {selectedOrg && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-end justify-center" onClick={() => setSelectedOrg(null)}>
          <div
            className="bg-white rounded-t-2xl w-full max-w-[428px] max-h-[70vh] overflow-y-auto animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Organization Details</h2>
              <button onClick={() => setSelectedOrg(null)} className="p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                {selectedOrg.logo ? (
                  <img src={selectedOrg.logo} alt={selectedOrg.name} className="w-16 h-16 rounded-xl object-cover" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-purple-600" />
                  </div>
                )}
                <div>
                  <div className="text-slate-900 text-lg font-bold">{selectedOrg.name}</div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    selectedOrg.approvalStatus === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    selectedOrg.approvalStatus === 'pending' ? 'bg-amber-100 text-amber-700' :
                    selectedOrg.approvalStatus === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {selectedOrg.approvalStatus || 'Unknown'}
                  </span>
                </div>
              </div>
              {selectedOrg.description && (
                <p className="text-slate-600 text-sm">{selectedOrg.description}</p>
              )}
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Contact</span>
                  <span className="text-slate-900 font-medium">{selectedOrg.contactEmail || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Members</span>
                  <span className="text-slate-900 font-medium">{selectedOrg.memberCount}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-600">Projects</span>
                  <span className="text-slate-900 font-medium">{selectedOrg.projectCount}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Created</span>
                  <span className="text-slate-900 font-medium">
                    {formatDistanceToNow(new Date(selectedOrg.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

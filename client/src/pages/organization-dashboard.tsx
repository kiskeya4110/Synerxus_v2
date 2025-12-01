import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { 
  FolderOpen, Clock, Target, Users, Plus,
  ChevronDown, AlertTriangle, CheckSquare, TrendingUp, 
  Lightbulb, MapPin, UserPlus, BarChart3, X
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { getSDGName, SDG_GOALS, getSDGColor } from "@shared/sdg-goals";
import OrganizationHeader from "@/components/layout/organization-header";
import MobileMetricsGrid from "@/components/layout/mobile-metrics-grid";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import OfflineBanner from "@/components/layout/offline-banner";
import Footer from "@/components/layout/footer";
import sdg1 from "@assets/E_SDG_PRINT-01_1762550174893.jpg";
import sdg2 from "@assets/E_SDG_PRINT-02_1762550174896.jpg";
import sdg3 from "@assets/E_SDG_PRINT-03_1762550174898.jpg";
import sdg4 from "@assets/E_SDG_PRINT-04_1762550174899.jpg";
import sdg5 from "@assets/E_SDG_PRINT-05_1762550174900.jpg";
import sdg6 from "@assets/E_SDG_PRINT-06_1762550174902.jpg";
import sdg7 from "@assets/E_SDG_PRINT-07_1762550174903.jpg";
import sdg8 from "@assets/E_SDG_PRINT-08_1762550174904.jpg";
import sdg9 from "@assets/E_SDG_PRINT-09_1762550174905.jpg";
import sdg10 from "@assets/E_SDG_PRINT-10_1762550174906.jpg";
import sdg11 from "@assets/E_SDG_PRINT-11_1762550174908.jpg";
import sdg12 from "@assets/E_SDG_PRINT-12_1762550174909.jpg";
import sdg13 from "@assets/E_SDG_PRINT-13_1762550174910.jpg";
import sdg14 from "@assets/E_SDG_PRINT-14_1762550174911.jpg";
import sdg15 from "@assets/E_SDG_PRINT-15_1762550174912.jpg";
import sdg16 from "@assets/E_SDG_PRINT-16_1762550174914.jpg";
import sdg17 from "@assets/E_SDG_PRINT-17_1762550174915.jpg";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const SDG_ICONS: Record<number, string> = {
  1: sdg1, 2: sdg2, 3: sdg3, 4: sdg4, 5: sdg5,
  6: sdg6, 7: sdg7, 8: sdg8, 9: sdg9, 10: sdg10,
  11: sdg11, 12: sdg12, 13: sdg13, 14: sdg14, 15: sdg15,
  16: sdg16, 17: sdg17,
};

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

interface DashboardData {
  keyMetrics: {
    activeProjects: number;
    totalProjects: number;
    totalHours: number;
    sdgsAddressed: number;
    livesTouched: number;
    activeVolunteers: number;
  };
  sdgDistribution: Array<{ goal: number; hours: number; projects: number; volunteers: number }>;
  projectLocations: Array<{ id: number; name: string; location: string; status: string; sdgGoals: number[] }>;
  alerts: Array<{ id: string; type: string; title: string; message: string; severity: string }>;
  impactOverTime: Array<{ month: string; hours: number; peopleImpacted: number; volunteers: number }>;
  aiInsights: Array<{ id: string; type: string; title: string; message: string; sentiment: string }>;
  projects: Array<{ id: number; name: string; status: string; completionPercentage: number; sdgGoals: number[] }>;
  volunteerSummaries: Array<{ id: number; name: string; avatar?: string; hours: number; projects: number }>;
  pendingTasks: Array<{ id: number; title: string; status: string; projectId?: number }>;
  quickActions: Array<{ id: string; label: string; icon: string }>;
  filters: {
    projectId: string;
    timePeriod: string;
    availableProjects: Array<{ id: number; name: string }>;
  };
}

const TIME_PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
];

export default function OrganizationDashboard() {
  const [, navigate] = useLocation();
  const userType = localStorage.getItem('userType');
  const userId = localStorage.getItem('currentUserId');

  const [projectFilter, setProjectFilter] = useState('all');
  const [timePeriod, setTimePeriod] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeModal, setActiveModal] = useState<'projects' | 'hours' | 'sdgs' | 'lives' | null>(null);
  const [hoveredSDG, setHoveredSDG] = useState<number | null>(null);

  if (userType !== 'organization') {
    if (userType === 'volunteer') {
      navigate('/volunteer-dashboard');
    } else if (userType === 'corporate-partner') {
      navigate('/csr-dashboard');
    } else {
      navigate('/dashboard');
    }
    return null;
  }

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ['/api/organization/dashboard', userId, projectFilter, timePeriod],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: userId || '' });
      if (projectFilter !== 'all') params.append('projectId', projectFilter);
      if (timePeriod !== 'all') params.append('timePeriod', timePeriod);
      const response = await fetch(`/api/organization/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    },
    enabled: !!userId,
  });

  const { data: currentUser } = useQuery({
    queryKey: ['/api/users/me', userId],
    queryFn: async () => {
      const response = await fetch(`/api/users/me?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  const { data: organizationProfile } = useQuery({
    queryKey: ['/api/intake/organization-profile', currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/intake/organization-profile?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  const { data: organization } = useQuery({
    queryKey: ['/api/organizations', currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/organizations/${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
  });

  const handleQuickAction = (actionId: string) => {
    if (actionId === 'create-project') {
      navigate('/projects?create=true');
    } else if (actionId === 'invite-volunteer') {
      navigate('/volunteers?invite=true');
    } else if (actionId === 'create-task') {
      navigate('/tasks?create=true');
    } else if (actionId === 'view-reports') {
      navigate('/impact-visualization');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #166534', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#6b7280' }}>Loading dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const metrics = dashboardData?.keyMetrics || { activeProjects: 0, totalHours: 0, sdgsAddressed: 0, livesTouched: 0 };

  return (
    <div style={{ height: '100vh', overflowY: 'auto', backgroundColor: '#f9fafb' }} data-testid="organization-dashboard">
      {/* Offline Banner */}
      <OfflineBanner />
      
      {/* Reusable Organization Header Component */}
      <OrganizationHeader activeTab="dashboard" onCreateClick={() => setShowCreateModal(true)} />

      {/* Welcome Banner - Desktop Only */}
      <div className="hidden md:block" style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', padding: '8px 0' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: 0 }}>
            Welcome Back, {organization?.name || organizationProfile?.organizationName || 'Organization'}
          </h1>
        </div>
      </div>

      {/* Mobile Dashboard Header */}
      <div className="md:hidden" style={{ padding: '16px', backgroundColor: 'white', borderBottom: '1px solid #e5e7eb' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1f2937', margin: 0, marginBottom: '4px' }}>
          Organization Dashboard
        </h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          Welcome to {organization?.name || organizationProfile?.organizationName || 'Synerxus'} - volunteers organization.
        </p>
      </div>

      {/* Mobile Metrics Grid - 2x2 at top */}
      {metrics && <MobileMetricsGrid activeProjects={metrics.activeProjects} totalHours={metrics.totalHours} sdgsAddressed={metrics.sdgsAddressed} livesTouched={metrics.livesTouched} />}

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 24px' }} className="md:p-6">
        {/* Filters Section - Desktop Only */}
        <div className="hidden md:flex" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>Project:</label>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              data-testid="filter-project"
              style={{
                padding: '8px 32px 8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="all">All Projects</option>
              {dashboardData?.filters?.availableProjects?.map((p) => (
                <option key={p.id} value={p.id.toString()}>{p.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{ fontSize: '14px', color: '#374151', fontWeight: '500' }}>Time Period:</label>
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
              data-testid="filter-time-period"
              style={{
                padding: '8px 32px 8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                backgroundColor: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              {TIME_PERIODS.map((period) => (
                <option key={period.value} value={period.value}>{period.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mobile Impact Over Time Chart - BarChart Style - SDG Highlighted */}
        <div className="md:hidden" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>
            Impact Over Time
            {organizationProfile?.sdgGoals && organizationProfile.sdgGoals.length > 0 && (
              <span style={{ fontSize: '12px', color: '#666', fontWeight: '400', marginLeft: '8px' }}>
                ({organizationProfile.sdgGoals.slice(0, 2).map((g: number) => getSDGName(g)).join(', ')})
              </span>
            )}
          </h3>
          <div style={{ height: '200px' }}>
            {dashboardData?.impactOverTime && dashboardData.impactOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardData.impactOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={(v) => v.split('-')[1]} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const sdgColor = organizationProfile?.sdgGoals?.[0] ? getSDGColor(organizationProfile.sdgGoals[0]) : '#667eea';
                        return (
                          <div style={{ backgroundColor: 'white', padding: '10px', borderRadius: '8px', boxShadow: `0 4px 12px rgba(0,0,0,0.15)`, borderTop: `3px solid ${sdgColor}` }}>
                            <p style={{ fontWeight: '600', marginBottom: '4px', fontSize: '12px' }}>{label}</p>
                            <p style={{ fontSize: '12px', color: sdgColor }}>Hours: {payload[0]?.value}</p>
                            <p style={{ fontSize: '12px', color: organizationProfile?.sdgGoals?.[1] ? getSDGColor(organizationProfile.sdgGoals[1]) : '#f093fb' }}>People: {payload[1]?.value}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="hours" fill={organizationProfile?.sdgGoals?.[0] ? getSDGColor(organizationProfile.sdgGoals[0]) : '#667eea'} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="peopleImpacted" fill={organizationProfile?.sdgGoals?.[1] ? getSDGColor(organizationProfile.sdgGoals[1]) : '#f093fb'} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                No data available
              </div>
            )}
          </div>
        </div>

        {/* Mobile Quick Actions */}
        <div className="md:hidden" style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '12px' }}>Quick Actions</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            <button
              onClick={() => navigate('/my-work?create=true')}
              style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#374151',
              }}
              data-testid="quick-action-create-project"
            >
              <Plus size={18} style={{ color: '#667eea' }} />
              New Project
            </button>
            <button
              onClick={() => navigate('/volunteers?invite=true')}
              style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#374151',
              }}
              data-testid="quick-action-invite-volunteer"
            >
              <UserPlus size={18} style={{ color: '#764ba2' }} />
              Invite Volunteer
            </button>
            <button
              onClick={() => navigate('/tasks?create=true')}
              style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#374151',
              }}
              data-testid="quick-action-create-task"
            >
              <CheckSquare size={18} style={{ color: '#f093fb' }} />
              Create Task
            </button>
            <button
              onClick={() => navigate('/impact-visualization')}
              style={{
                padding: '12px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#374151',
              }}
              data-testid="quick-action-view-reports"
            >
              <BarChart3 size={18} style={{ color: '#10b981' }} />
              View Reports
            </button>
          </div>
        </div>

        {/* Desktop Key Metrics Section */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <MetricCard
            icon={<FolderOpen size={24} />}
            label="Active Projects"
            value={metrics.activeProjects}
            color="#166534"
            testId="metric-active-projects"
            onClick={() => setActiveModal('projects')}
          />
          <MetricCard
            icon={<Clock size={24} />}
            label="Total Volunteer Hours"
            value={metrics.totalHours}
            color="#1e40af"
            testId="metric-total-hours"
            onClick={() => setActiveModal('hours')}
          />
          <MetricCard
            icon={<Target size={24} />}
            label="SDGs Addressed"
            value={metrics.sdgsAddressed}
            color="#7c3aed"
            testId="metric-sdgs"
            onClick={() => setActiveModal('sdgs')}
          />
          <MetricCard
            icon={<Users size={24} />}
            label="Lives Touched"
            value={metrics.livesTouched}
            color="#dc2626"
            testId="metric-lives"
            onClick={() => {
              setActiveModal('lives');
              dashboardData?.projects?.sort((a: any, b: any) => (b.livesTouched || 0) - (a.livesTouched || 0));
            }}
          />
        </div>

        {/* Middle Section (2/5): SDG + Map | Alerts - Desktop Only */}
        <div className="hidden md:grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
          {/* Left Column: SDG Distribution + Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* SDG Impact Distribution - Interactive Pie Chart */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>SDG Impact Distribution</h3>
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
                  Total: {dashboardData?.sdgDistribution?.reduce((sum: number, item: any) => sum + item.hours, 0) || 0} hours
                </span>
              </div>
              <div style={{ height: '360px', display: 'flex', flexDirection: 'column' }}>
                {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 ? (
                  <>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={dashboardData.sdgDistribution.map(item => ({
                              ...item,
                              name: `SDG ${item.goal}`,
                              fullName: getSDGName(item.goal),
                              color: SDG_GOALS[item.goal]?.color || '#166534'
                            }))}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={2}
                            dataKey="hours"
                            nameKey="name"
                            label={({ goal, hours }) => {
                              const total = dashboardData.sdgDistribution.reduce((sum: number, item: any) => sum + item.hours, 0);
                              const hoursNum = typeof hours === 'string' ? parseInt(hours) : hours;
                              const percent = ((hoursNum / total) * 100).toFixed(0);
                              const sdgInfo = SDG_GOALS[goal];
                              const sdgName = sdgInfo?.shortName || `SDG ${goal}`;
                              // Show label for all segments with readable size
                              return `${sdgName} ${percent}%`;
                            }}
                            labelLine={true}
                          >
                            {dashboardData.sdgDistribution.map((entry) => (
                              <Cell 
                                key={`cell-${entry.goal}`} 
                                fill={SDG_GOALS[entry.goal]?.color || '#166534'}
                                stroke={hoveredSDG === entry.goal ? '#111827' : 'white'}
                                strokeWidth={hoveredSDG === entry.goal ? 3 : 2}
                                style={{ 
                                  cursor: 'pointer',
                                  filter: hoveredSDG === entry.goal ? 'brightness(1.1)' : 'brightness(1)',
                                  transition: 'all 0.2s ease-in-out'
                                }}
                                onMouseEnter={() => setHoveredSDG(entry.goal)}
                                onMouseLeave={() => setHoveredSDG(null)}
                              />
                            ))}
                          </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const sdgInfo = SDG_GOALS[data.goal];
                            const total = dashboardData.sdgDistribution.reduce((sum: number, item: any) => sum + item.hours, 0);
                            const percent = ((data.hours / total) * 100).toFixed(1);
                            return (
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '16px', 
                                borderRadius: '12px', 
                                boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
                                border: `2px solid ${sdgInfo?.color || '#166534'}`,
                                maxWidth: '340px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                                  <div style={{ 
                                    width: '32px', 
                                    height: '32px', 
                                    borderRadius: '8px', 
                                    backgroundColor: sdgInfo?.color || '#166534',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    flexShrink: 0
                                  }}>
                                    {data.goal}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <p style={{ fontWeight: '700', fontSize: '15px', color: '#111827', margin: '0 0 4px 0' }}>
                                      {sdgInfo?.name || `SDG ${data.goal}`}
                                    </p>
                                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '0', lineHeight: '1.3' }}>
                                      {sdgInfo?.description}
                                    </p>
                                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0 0', fontWeight: '500' }}>
                                      {percent}% of total impact hours
                                    </p>
                                  </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', paddingTop: '12px', borderTop: `1px solid ${sdgInfo?.color || '#166534'}33` }}>
                                  <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '17px', fontWeight: 'bold', color: sdgInfo?.color || '#166534', margin: '0' }}>{data.hours}</p>
                                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0 0', fontWeight: '500' }}>Hours</p>
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '17px', fontWeight: 'bold', color: sdgInfo?.color || '#166534', margin: '0' }}>{data.projects}</p>
                                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0 0', fontWeight: '500' }}>Projects</p>
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '17px', fontWeight: 'bold', color: sdgInfo?.color || '#166534', margin: '0' }}>{data.volunteers || 0}</p>
                                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '6px 0 0 0', fontWeight: '500' }}>Volunteers</p>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                          <Legend 
                            layout="horizontal" 
                            verticalAlign="bottom"
                            height={36}
                            wrapperStyle={{ paddingTop: '12px', overflow: 'visible' }}
                            formatter={(value, entry: any) => {
                              const sdg = entry.payload;
                              const sdgInfo = SDG_GOALS[sdg.goal];
                              const total = dashboardData.sdgDistribution.reduce((sum: number, item: any) => sum + item.hours, 0);
                              const percent = Math.round((sdg.hours / total) * 100);
                              return (
                                <span 
                                  style={{ 
                                    color: hoveredSDG === sdg.goal ? '#166534' : '#6b7280',
                                    fontSize: '11px',
                                    fontWeight: hoveredSDG === sdg.goal ? '600' : '500',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap',
                                    transition: 'all 0.2s ease',
                                    marginRight: '4px',
                                    padding: '4px 6px',
                                    borderRadius: '4px',
                                    backgroundColor: hoveredSDG === sdg.goal ? 'rgba(22, 101, 52, 0.08)' : 'transparent'
                                  }}
                                  onMouseEnter={() => setHoveredSDG(sdg.goal)}
                                  onMouseLeave={() => setHoveredSDG(null)}
                                  title={sdgInfo?.description}
                                >
                                  SDG {sdg.goal} • {percent}%
                                </span>
                              );
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                    No SDG data available
                  </div>
                )}
              </div>
            </div>

            {/* Project Locations Map */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Project Locations</h3>
              <div style={{ height: '250px', borderRadius: '8px', overflow: 'hidden' }}>
                <ProjectMapComponent projectLocations={dashboardData?.projectLocations || []} />
              </div>
            </div>
          </div>

          {/* Right Column: Alerts & Tasks */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
                Alerts & Tasks
              </h3>
              <button
                onClick={() => navigate('/tasks')}
                data-testid="view-all-tasks"
                style={{ fontSize: '12px', color: '#166534', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
              >
                View All →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dashboardData?.alerts && dashboardData.alerts.length > 0 ? (
                dashboardData.alerts.slice(0, 6).map((alert) => (
                  <button
                    key={alert.id}
                    type="button"
                    className="alert-btn"
                    onClick={() => {
                      if (alert.type === 'task_overdue' || alert.type === 'task_pending') {
                        navigate('/tasks');
                      } else if (alert.type === 'project_deadline' || alert.type === 'project_update') {
                        navigate('/projects');
                      } else if (alert.type === 'volunteer') {
                        navigate('/volunteers');
                      } else {
                        navigate('/tasks');
                      }
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      backgroundColor: alert.severity === 'high' ? '#fef2f2' : '#fffbeb',
                      borderLeft: `4px solid ${alert.severity === 'high' ? '#dc2626' : '#f59e0b'}`,
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      width: '100%',
                    }}
                    data-testid={`alert-${alert.id}`}
                  >
                    <p style={{ fontSize: '13px', fontWeight: '500', color: '#111827', marginBottom: '2px' }}>{alert.title}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>{alert.message}</p>
                  </button>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                  <CheckSquare size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p style={{ fontSize: '14px' }}>All caught up!</p>
                </div>
              )}
            </div>
            {dashboardData?.pendingTasks && dashboardData.pendingTasks.length > 0 && (
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <p style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>Pending Tasks</p>
                </div>
                {dashboardData.pendingTasks.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    className="task-btn"
                    onClick={() => navigate(`/tasks?id=${task.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 8px',
                      borderBottom: '1px solid #f3f4f6',
                      width: '100%',
                      backgroundColor: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'background-color 0.15s',
                    }}
                    data-testid={`task-${task.id}`}
                  >
                    <CheckSquare size={14} style={{ color: '#9ca3af', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', color: '#374151' }}>{task.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section (2/5): SDG Distribution PieChart | AI Insights - Desktop Only */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }} className="bottom-section hidden md:grid">
          {/* Left: SDG Distribution PieChart */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={18} style={{ color: '#7c3aed' }} />
              SDG Distribution
            </h3>
            <div style={{ height: '250px' }}>
              {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData.sdgDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ goal, hours }) => `SDG ${goal}: ${hours}h`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="hours"
                    >
                      {dashboardData.sdgDistribution.map((entry: any) => (
                        <Cell key={`cell-${entry.goal}`} fill={getSDGColor(entry.goal)} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const sdgInfo = SDG_GOALS[data.goal];
                          return (
                            <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', border: `2px solid ${getSDGColor(data.goal)}` }}>
                              <p style={{ fontWeight: '600', marginBottom: '4px', color: getSDGColor(data.goal) }}>{sdgInfo?.name || `SDG ${data.goal}`}</p>
                              <p style={{ fontSize: '13px', color: '#666' }}>Hours: {data.hours}</p>
                              <p style={{ fontSize: '13px', color: '#666' }}>Projects: {data.projects}</p>
                              <p style={{ fontSize: '13px', color: '#666' }}>Volunteers: {data.volunteers || 0}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                  No SDG data available
                </div>
              )}
            </div>
          </div>

          {/* Right: AI Insights */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={18} style={{ color: '#f59e0b' }} />
              AI Insights
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dashboardData?.aiInsights?.map((insight) => (
                <div
                  key={insight.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: insight.sentiment === 'positive' ? '#f0fdf4' : insight.sentiment === 'warning' ? '#fffbeb' : '#f9fafb',
                    borderLeft: `4px solid ${insight.sentiment === 'positive' ? '#166534' : insight.sentiment === 'warning' ? '#f59e0b' : '#6b7280'}`,
                  }}
                  data-testid={`insight-${insight.id}`}
                >
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{insight.title}</p>
                  <p style={{ fontSize: '12px', color: '#6b7280' }}>{insight.message}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Below the Fold: Active Projects + Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }} className="below-fold">
          {/* Active Projects List */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>Active Projects</h3>
              <button
                onClick={() => navigate('/projects')}
                data-testid="view-all-projects"
                style={{ fontSize: '13px', color: '#166534', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '500' }}
              >
                View All →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {dashboardData?.projects?.slice(0, 5).map((project) => (
                <div
                  key={project.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: '#f9fafb',
                    cursor: 'pointer',
                  }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                  data-testid={`project-item-${project.id}`}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827' }}>{project.name}</p>
                    <p style={{ fontSize: '12px', color: '#6b7280' }}>
                      SDGs: {project.sdgGoals.length > 0 ? project.sdgGoals.map(g => `SDG ${g}`).join(', ') : 'None'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      backgroundColor: project.status?.toLowerCase() === 'active' || project.status?.toLowerCase() === 'in progress' ? '#dcfce7' : '#e5e7eb',
                      color: project.status?.toLowerCase() === 'active' || project.status?.toLowerCase() === 'in progress' ? '#166534' : '#6b7280',
                    }}>
                      {project.status}
                    </span>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>{project.completionPercentage}% complete</p>
                  </div>
                </div>
              ))}
              {(!dashboardData?.projects || dashboardData.projects.length === 0) && (
                <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>
                  <FolderOpen size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <p>No projects yet</p>
                  <button
                    onClick={() => navigate('/projects?create=true')}
                    style={{
                      marginTop: '12px',
                      padding: '8px 16px',
                      backgroundColor: '#166534',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    Create First Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <QuickActionButton
                icon={<Plus size={18} />}
                label="Create Project"
                onClick={() => navigate('/projects?create=true')}
                testId="quick-create-project"
              />
              <QuickActionButton
                icon={<UserPlus size={18} />}
                label="Invite Volunteer"
                onClick={() => navigate('/volunteers?invite=true')}
                testId="quick-invite-volunteer"
              />
              <QuickActionButton
                icon={<CheckSquare size={18} />}
                label="Create Task"
                onClick={() => navigate('/tasks?create=true')}
                testId="quick-create-task"
              />
              <QuickActionButton
                icon={<BarChart3 size={18} />}
                label="View Reports"
                onClick={() => navigate('/impact-visualization')}
                testId="quick-view-reports"
              />
            </div>

            {/* Primary SDGs Summary */}
            {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 && (
              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#6b7280', marginBottom: '12px' }}>Top SDGs</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {dashboardData.sdgDistribution.slice(0, 3).map((sdg) => (
                    <span
                      key={sdg.goal}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f0fdf4',
                        borderRadius: '16px',
                        fontSize: '12px',
                        color: '#166534',
                        fontWeight: '500',
                      }}
                    >
                      SDG {sdg.goal}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              width: '90%',
              maxWidth: '400px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px' }}>Create New</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                onClick={() => { setShowCreateModal(false); navigate('/projects?create=true'); }}
                data-testid="modal-create-project"
                style={{ padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}
              >
                <FolderOpen size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                New Project
              </button>
              <button
                onClick={() => { setShowCreateModal(false); navigate('/opportunities?create=true'); }}
                data-testid="modal-create-opportunity"
                style={{ padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}
              >
                <Target size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                New Opportunity
              </button>
              <button
                onClick={() => { setShowCreateModal(false); navigate('/tasks?create=true'); }}
                data-testid="modal-create-task"
                style={{ padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', textAlign: 'left', cursor: 'pointer', fontSize: '14px' }}
              >
                <CheckSquare size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                New Task
              </button>
            </div>
            <button
              onClick={() => setShowCreateModal(false)}
              data-testid="modal-cancel"
              style={{ marginTop: '16px', width: '100%', padding: '12px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {activeModal === 'projects' && (
        <MetricsModal
          title="Active Projects"
          onClose={() => setActiveModal(null)}
          type="projects"
          data={dashboardData?.projects || []}
          color="#166534"
        />
      )}
      
      {activeModal === 'hours' && (
        <MetricsModal
          title="Total Volunteer Hours"
          onClose={() => setActiveModal(null)}
          type="hours"
          data={dashboardData?.impactOverTime || []}
          totalHours={metrics.totalHours}
          volunteers={dashboardData?.volunteerSummaries || []}
          color="#1e40af"
        />
      )}
      
      {activeModal === 'sdgs' && (
        <MetricsModal
          title="SDGs Addressed"
          onClose={() => setActiveModal(null)}
          type="sdgs"
          data={dashboardData?.sdgDistribution || []}
          color="#7c3aed"
        />
      )}
      
      {activeModal === 'lives' && (
        <MetricsModal
          title="Lives Touched"
          onClose={() => setActiveModal(null)}
          type="lives"
          data={dashboardData?.projects?.slice(0, 10).sort((a: any, b: any) => (b.livesTouched || 0) - (a.livesTouched || 0)) || []}
          color="#dc2626"
        />
      )}

      {/* Responsive Styles */}
      <style>{`
        @media (max-width: 1024px) {
          .middle-section, .bottom-section, .below-fold {
            grid-template-columns: 1fr !important;
          }
        }
        .metric-card-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
        }
        .metric-card-btn:focus {
          outline: 2px solid #166534;
          outline-offset: 2px;
        }
        .alert-btn:hover {
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .task-btn:hover {
          background-color: #f9fafb !important;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }
        .modal-content {
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.3);
          max-width: 600px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
          animation: slideUp 0.3s ease-out;
        }
        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>


      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onCreateClick={() => setShowCreateModal(true)} />

      {/* Footer - Hidden on Mobile */}
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, color, testId, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; testId: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value.toLocaleString()}`}
      className="metric-card-btn"
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        border: `2px solid ${color}20`,
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        width: '100%',
        height: '140px',
        textAlign: 'center',
        minHeight: 'auto',
      }}
      data-testid={testId}
    >
      <div style={{ padding: '8px', backgroundColor: `${color}10`, borderRadius: '8px', color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <p style={{ fontSize: '24px', fontWeight: 'bold', color, margin: 0 }}>{value.toLocaleString()}</p>
        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: '1.2' }}>{label}</p>
      </div>
    </button>
  );
}

function MobileMetricCard({ icon, label, value, color, testId, onClick }: { icon: React.ReactNode; label: string; value: number; color: string; testId: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${value.toLocaleString()}`}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: 'none',
        cursor: 'pointer',
        width: '100%',
      }}
      data-testid={testId}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '12px', 
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: color 
        }}>
          {icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
          <p style={{ fontSize: '28px', fontWeight: '700', color: '#1f2937', margin: 0, lineHeight: '1.1' }}>{value.toLocaleString()}</p>
        </div>
      </div>
      <div style={{ 
        width: '60px', 
        height: '40px', 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '2px',
        padding: '4px'
      }}>
        {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8].map((h, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${h * 100}%`,
              backgroundColor: color,
              opacity: 0.3 + (i * 0.1),
              borderRadius: '2px',
            }}
          />
        ))}
      </div>
    </button>
  );
}

function QuickActionButton({ icon, label, onClick, testId }: { icon: React.ReactNode; label: string; onClick: () => void; testId: string }) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        fontSize: '14px',
        color: '#374151',
        transition: 'background-color 0.2s',
      }}
    >
      <span style={{ color: '#166534' }}>{icon}</span>
      {label}
    </button>
  );
}

interface MetricsModalProps {
  title: string;
  onClose: () => void;
  type: 'projects' | 'hours' | 'sdgs' | 'lives';
  data?: any[];
  totalHours?: number;
  volunteers?: any[];
  color: string;
}

function MetricsModal({ title, onClose, type, data = [], totalHours, volunteers = [], color }: MetricsModalProps) {
  const [, navigate] = useLocation();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111827' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {type === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No projects yet</p>
              ) : (
                data.map((project: any) => (
                  <button 
                    key={project.id} 
                    onClick={() => {
                      navigate(`/projects/${project.id}`);
                      onClose();
                    }}
                    style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: `2px solid ${color}20`, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${color}10`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{project.name}</h4>
                      <span style={{ padding: '4px 12px', backgroundColor: color, color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                        {project.status}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        <p style={{ fontWeight: '500', marginBottom: '4px' }}>Completion</p>
                        <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', backgroundColor: color, width: `${project.completionPercentage || 0}%` }} />
                        </div>
                        <p style={{ marginTop: '4px', fontSize: '11px' }}>{project.completionPercentage || 0}%</p>
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        <p style={{ fontWeight: '500', marginBottom: '4px' }}>SDGs</p>
                        <p>{project.sdgGoals?.length || 0} goals</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {type === 'hours' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '16px', backgroundColor: color + '10', borderRadius: '8px', border: `2px solid ${color}` }}>
                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Hours</p>
                <p style={{ fontSize: '32px', fontWeight: '700', color: color }}>{totalHours?.toLocaleString() || 0}</p>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Top Contributors</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {volunteers.length === 0 ? (
                    <p style={{ color: '#9ca3af', fontSize: '13px' }}>No volunteer data</p>
                  ) : (
                    volunteers.slice(0, 5).map((vol: any) => (
                      <button 
                        key={vol.id} 
                        onClick={() => {
                          navigate('/volunteers');
                          onClose();
                        }}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'all 0.2s', width: '100%' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${color}10`}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600', color }}>
                            {vol.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontSize: '12px', fontWeight: '600', color: '#111827' }}>{vol.name}</p>
                            <p style={{ fontSize: '11px', color: '#6b7280' }}>{vol.projects} projects</p>
                          </div>
                        </div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color }}>{vol.hours}h</p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {type === 'sdgs' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
              {data.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px', gridColumn: '1/-1' }}>No SDG data</p>
              ) : (
                data.map((sdg: any) => {
                  const sdgColor = SDG_GOALS[sdg.goal]?.color || color;
                  const sdgIcon = SDG_ICONS[sdg.goal];
                  return (
                    <button 
                      key={sdg.goal} 
                      onClick={() => {
                        navigate('/sdg-mapping');
                        onClose();
                      }}
                      style={{ 
                        padding: '16px', 
                        backgroundColor: 'white', 
                        borderRadius: '12px', 
                        border: `2px solid ${sdgColor}`, 
                        cursor: 'pointer', 
                        transition: 'all 0.2s',
                        textAlign: 'center',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '12px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = `${sdgColor}08`;
                        e.currentTarget.style.boxShadow = `0 8px 16px ${sdgColor}20`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ 
                        width: '80px', 
                        height: '80px', 
                        borderRadius: '8px', 
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <img 
                          src={sdgIcon} 
                          alt={`SDG ${sdg.goal}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                      <div style={{ width: '100%' }}>
                        <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: '0 0 8px 0' }}>{getSDGName(sdg.goal)}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: sdgColor, margin: '0' }}>{sdg.hours}</p>
                            <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>Hours</p>
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: sdgColor, margin: '0' }}>{sdg.projects}</p>
                            <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>Projects</p>
                          </div>
                          <div style={{ fontSize: '11px', color: '#6b7280' }}>
                            <p style={{ fontSize: '13px', fontWeight: 'bold', color: sdgColor, margin: '0' }}>{sdg.volunteers || 0}</p>
                            <p style={{ fontSize: '10px', margin: '2px 0 0 0' }}>Volunteers</p>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {type === 'lives' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {data.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No projects</p>
              ) : (
                data.map((project: any) => (
                  <button 
                    key={project.id}
                    onClick={() => {
                      navigate(`/projects/${project.id}`);
                      onClose();
                    }}
                    style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: `2px solid ${color}20`, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = `${color}10`}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{project.name}</h4>
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: '4px 0 0 0' }}>Status: {project.status}</p>
                      </div>
                      <span style={{ padding: '4px 12px', backgroundColor: color, color: 'white', borderRadius: '12px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                        {project.livesTouched || 0} lives
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                      <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color }}>{project.completionPercentage || 0}%</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Complete</p>
                      </div>
                      <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color }}>{project.totalHours || 0}h</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Hours</p>
                      </div>
                      <div style={{ backgroundColor: 'white', padding: '8px', borderRadius: '4px', textAlign: 'center' }}>
                        <p style={{ fontSize: '16px', fontWeight: 'bold', color }}>{project.sdgGoals?.length || 0}</p>
                        <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>SDGs</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProjectLocation {
  id: number;
  name: string;
  location: string;
  status: string;
  sdgGoals: number[];
}

function ProjectMapComponent({ projectLocations }: { projectLocations: ProjectLocation[] }) {
  const mapRef = useRef<L.Map>(null);

  useEffect(() => {
    if (!mapRef.current || !projectLocations || projectLocations.length === 0) return;

    const coords = projectLocations
      .map(project => getCoordinatesFromLocation(project.location))
      .filter((coord): coord is { lat: number; lng: number } => coord !== null);

    if (coords.length === 0) return;

    if (coords.length === 1) {
      // Single project - zoom to that location
      mapRef.current.setView([coords[0].lat, coords[0].lng], 10);
    } else {
      // Multiple projects - fit bounds to all
      const bounds = L.latLngBounds(coords.map(c => [c.lat, c.lng] as [number, number]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [projectLocations]);

  return (
    <MapContainer
      ref={mapRef}
      center={[20, 0]}
      zoom={2}
      style={{ width: '100%', height: '100%' }}
      data-testid="project-map"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap contributors, &copy; CartoDB"
      />
      {projectLocations?.map((project) => {
        const coords = getCoordinatesFromLocation(project.location);
        if (!coords) return null;
        return (
          <Marker key={project.id} position={[coords.lat, coords.lng]}>
            <Popup>
              <strong>{project.name}</strong>
              <br />
              Status: {project.status}
              <br />
              SDGs: {project.sdgGoals.join(', ') || 'None'}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

function getCoordinatesFromLocation(location: string): { lat: number; lng: number } | null {
  const locationCoords: Record<string, { lat: number; lng: number }> = {
    // African Countries (centers)
    'zambia': { lat: -13.1939, lng: 27.8493 },
    'kenya': { lat: -0.0236, lng: 37.9062 },
    'nigeria': { lat: 9.0765, lng: 7.3986 },
    'south africa': { lat: -30.5595, lng: 22.9375 },
    'democratic republic of congo': { lat: -4.0383, lng: 21.7587 },
    'uganda': { lat: 1.3733, lng: 32.2903 },
    'tanzania': { lat: -6.3690, lng: 34.8888 },
    'ethiopia': { lat: 9.1450, lng: 40.4897 },
    'ghana': { lat: 7.3697, lng: -5.6789 },
    'cameroon': { lat: 3.8480, lng: 11.5021 },
    'egypt': { lat: 26.8206, lng: 30.8025 },
    'morocco': { lat: 31.7917, lng: -7.0926 },
    'algeria': { lat: 28.0339, lng: 1.6596 },
    'rwanda': { lat: -1.9536, lng: 29.8739 },
    'malawi': { lat: -13.2543, lng: 34.3015 },
    'mozambique': { lat: -18.6657, lng: 35.5296 },
    'zimbabwe': { lat: -19.0154, lng: 29.1549 },
    'botswana': { lat: -22.3285, lng: 24.6849 },
    'lesotho': { lat: -29.6100, lng: 28.2336 },
    'guinea': { lat: 9.9456, lng: -9.6966 },
    'sierra leone': { lat: 8.4606, lng: -11.7799 },
    'liberia': { lat: 6.4281, lng: -9.4295 },
    'ivory coast': { lat: 7.5400, lng: -5.5471 },
    'senegal': { lat: 14.4974, lng: -14.4524 },
    
    // European Countries
    'united kingdom': { lat: 55.3781, lng: -3.4360 },
    'france': { lat: 46.2276, lng: 2.2137 },
    'germany': { lat: 51.1657, lng: 10.4515 },
    'spain': { lat: 40.4637, lng: -3.7492 },
    'italy': { lat: 41.8719, lng: 12.5674 },
    'netherlands': { lat: 52.1326, lng: 5.2913 },
    'belgium': { lat: 50.5039, lng: 4.4699 },
    'austria': { lat: 47.5162, lng: 14.5501 },
    'czech republic': { lat: 49.8175, lng: 15.4730 },
    'poland': { lat: 51.9194, lng: 19.1451 },
    'greece': { lat: 39.0742, lng: 21.8243 },
    'portugal': { lat: 39.3999, lng: -8.2245 },
    'switzerland': { lat: 46.8182, lng: 8.2275 },
    'sweden': { lat: 60.1282, lng: 18.6435 },
    'norway': { lat: 60.4720, lng: 8.4689 },
    
    // Asian Countries
    'india': { lat: 20.5937, lng: 78.9629 },
    'japan': { lat: 36.2048, lng: 138.2529 },
    'china': { lat: 35.8617, lng: 104.1954 },
    'thailand': { lat: 15.8700, lng: 100.9925 },
    'vietnam': { lat: 14.0583, lng: 108.2772 },
    'philippines': { lat: 12.8797, lng: 121.7740 },
    'indonesia': { lat: -0.7893, lng: 113.9213 },
    'malaysia': { lat: 4.2105, lng: 101.6964 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    'pakistan': { lat: 30.3753, lng: 69.3451 },
    'bangladesh': { lat: 23.6850, lng: 90.3563 },
    'south korea': { lat: 35.9078, lng: 127.7669 },
    'myanmar': { lat: 21.9162, lng: 95.9560 },
    'cambodia': { lat: 12.5657, lng: 104.9910 },
    'laos': { lat: 19.8523, lng: 102.4955 },
    'sri lanka': { lat: 7.8731, lng: 80.7718 },
    
    // Americas - Countries
    'united states': { lat: 37.0902, lng: -95.7129 },
    'canada': { lat: 56.1304, lng: -106.3468 },
    'mexico': { lat: 23.6345, lng: -102.5528 },
    'brazil': { lat: -14.2350, lng: -51.9253 },
    'argentina': { lat: -38.4161, lng: -63.6167 },
    'chile': { lat: -35.6751, lng: -71.5430 },
    'colombia': { lat: 4.5709, lng: -74.2973 },
    'peru': { lat: -9.1900, lng: -75.0152 },
    'venezuela': { lat: 6.4238, lng: -66.5897 },
    'ecuador': { lat: -1.8312, lng: -78.1834 },
    'bolivia': { lat: -16.2902, lng: -63.5887 },
    'paraguay': { lat: -23.4425, lng: -58.4438 },
    'uruguay': { lat: -32.5228, lng: -55.7658 },
    'costa rica': { lat: 9.7489, lng: -83.7534 },
    'panama': { lat: 8.7832, lng: -80.7744 },
    
    // Oceania Countries
    'australia': { lat: -25.2744, lng: 133.7751 },
    'new zealand': { lat: -40.9006, lng: 174.8860 },
    'fiji': { lat: -17.7134, lng: 178.0650 },
    'samoa': { lat: -13.7590, lng: -172.1046 },
    
    // US Cities
    'new york': { lat: 40.7128, lng: -74.006 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'houston': { lat: 29.7604, lng: -95.3698 },
    'phoenix': { lat: 33.4484, lng: -112.074 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'seattle': { lat: 47.6062, lng: -122.3321 },
    'boston': { lat: 42.3601, lng: -71.0589 },
    'atlanta': { lat: 33.749, lng: -84.388 },
    'miami': { lat: 25.7617, lng: -80.1918 },
    'denver': { lat: 39.7392, lng: -104.9903 },
    'austin': { lat: 30.2672, lng: -97.7431 },
    'portland': { lat: 45.5152, lng: -122.6784 },
    'dallas': { lat: 32.7767, lng: -96.797 },
    
    // African Cities
    'nairobi': { lat: -1.2921, lng: 36.8219 },
    'lagos': { lat: 6.5244, lng: 3.3792 },
    'cape town': { lat: -33.9249, lng: 18.4241 },
    'johannesburg': { lat: -26.2023, lng: 28.0436 },
    'cairo': { lat: 30.0444, lng: 31.2357 },
    'kinshasa': { lat: -4.3276, lng: 15.3136 },
    'accra': { lat: 5.6037, lng: -0.187 },
    'lusaka': { lat: -15.3875, lng: 28.2833 },
    'harare': { lat: -17.8252, lng: 31.0335 },
    'dar es salaam': { lat: -6.8000, lng: 39.2833 },
    
    // European Cities
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'berlin': { lat: 52.52, lng: 13.405 },
    'madrid': { lat: 40.4168, lng: -3.7038 },
    'rome': { lat: 41.9028, lng: 12.4964 },
    'amsterdam': { lat: 52.3676, lng: 4.9041 },
    'brussels': { lat: 50.8503, lng: 4.3517 },
    'vienna': { lat: 48.2082, lng: 16.3738 },
    'prague': { lat: 50.0755, lng: 14.4378 },
    'warsaw': { lat: 52.2297, lng: 21.0122 },
    
    // Asian Cities
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'mumbai': { lat: 19.076, lng: 72.8777 },
    'delhi': { lat: 28.7041, lng: 77.1025 },
    'bangkok': { lat: 13.7563, lng: 100.5018 },
    'shanghai': { lat: 31.2304, lng: 121.4737 },
    'beijing': { lat: 39.9042, lng: 116.4074 },
    'seoul': { lat: 37.5665, lng: 126.978 },
    'manila': { lat: 14.5995, lng: 120.9842 },
    'jakarta': { lat: -6.2088, lng: 106.8456 },
    'karachi': { lat: 24.8607, lng: 67.0011 },
    'hongkong': { lat: 22.3193, lng: 114.1694 },
    
    // South American Cities
    'sao paulo': { lat: -23.5505, lng: -46.6333 },
    'buenos aires': { lat: -34.6037, lng: -58.3816 },
    'lima': { lat: -12.0464, lng: -77.0428 },
    'bogota': { lat: 4.7110, lng: -74.0721 },
    'santiago': { lat: -33.4489, lng: -70.6693 },
    'mexico city': { lat: 19.4326, lng: -99.1332 },
    
    // Oceania Cities
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'melbourne': { lat: -37.8136, lng: 144.9631 },
    'auckland': { lat: -37.0742, lng: 174.885 },
    
    // Special cases (remote/online)
    'remote': { lat: 20, lng: 0 },
    'online': { lat: 20, lng: 0 },
    'virtual': { lat: 20, lng: 0 },
    'global': { lat: 20, lng: 0 },
  };

  const locationLower = location.toLowerCase().trim();
  
  // Exact matches first (highest priority)
  if (locationCoords[locationLower]) {
    return locationCoords[locationLower];
  }
  
  // Check for countries (longer strings first to match full country names)
  const countryPatterns = [
    'united states', 'united kingdom', 'south africa', 'south korea', 'sri lanka',
    'democratic republic of congo', 'ivory coast', 'sierra leone', 'new zealand'
  ];
  
  for (const country of countryPatterns) {
    if (locationLower.includes(country) && locationCoords[country]) {
      return locationCoords[country];
    }
  }
  
  // Partial matches (checks if location contains any key) - skip regional matches
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (locationLower.includes(key) && !['africa', 'europe', 'asia', 'south america', 'caribbean'].includes(key)) {
      return coords;
    }
  }
  
  // Fallback to center of the world for unknown locations
  return { lat: 20, lng: 0 };
}

import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  FolderOpen, Clock, Target, Users, Plus,
  ChevronDown, AlertTriangle, CheckSquare, TrendingUp, 
  Lightbulb, MapPin, UserPlus, BarChart3
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { getSDGName, SDG_GOALS } from "@shared/sdg-goals";
import OrganizationHeader from "@/components/layout/organization-header";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

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
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }} data-testid="organization-dashboard">
      {/* Reusable Organization Header Component */}
      <OrganizationHeader activeTab="dashboard" onCreateClick={() => setShowCreateModal(true)} />

      {/* Main Content */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Filters Section */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
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

        {/* Key Metrics Section (Top 1/5) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <MetricCard
            icon={<FolderOpen size={24} />}
            label="Active Projects"
            value={metrics.activeProjects}
            color="#166534"
            testId="metric-active-projects"
            onClick={() => navigate('/projects')}
          />
          <MetricCard
            icon={<Clock size={24} />}
            label="Total Volunteer Hours"
            value={metrics.totalHours}
            color="#1e40af"
            testId="metric-total-hours"
            onClick={() => navigate('/impact-visualization')}
          />
          <MetricCard
            icon={<Target size={24} />}
            label="SDGs Addressed"
            value={metrics.sdgsAddressed}
            color="#7c3aed"
            testId="metric-sdgs"
            onClick={() => navigate('/sdg-mapping')}
          />
          <MetricCard
            icon={<Users size={24} />}
            label="Lives Touched"
            value={metrics.livesTouched}
            color="#dc2626"
            testId="metric-lives"
            onClick={() => navigate('/volunteers')}
          />
        </div>

        {/* Middle Section (2/5): SDG + Map | Alerts */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }} className="middle-section">
          {/* Left Column: SDG Distribution + Map */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* SDG Impact Distribution - Interactive Pie Chart */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>SDG Impact Distribution</h3>
              <div style={{ height: '280px' }}>
                {dashboardData?.sdgDistribution && dashboardData.sdgDistribution.length > 0 ? (
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
                        cy="45%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="hours"
                        nameKey="name"
                        label={({ goal, percent }) => percent > 0.05 ? `SDG ${goal}` : ''}
                        labelLine={false}
                      >
                        {dashboardData.sdgDistribution.map((entry) => (
                          <Cell 
                            key={`cell-${entry.goal}`} 
                            fill={SDG_GOALS[entry.goal]?.color || '#166534'}
                            stroke="white"
                            strokeWidth={2}
                            style={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const sdgInfo = SDG_GOALS[data.goal];
                            return (
                              <div style={{ 
                                backgroundColor: 'white', 
                                padding: '16px', 
                                borderRadius: '12px', 
                                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                border: `3px solid ${sdgInfo?.color || '#166534'}`,
                                maxWidth: '280px'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                  <div style={{ 
                                    width: '24px', 
                                    height: '24px', 
                                    borderRadius: '4px', 
                                    backgroundColor: sdgInfo?.color || '#166534',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                  }}>
                                    {data.goal}
                                  </div>
                                  <p style={{ fontWeight: '700', fontSize: '15px', color: '#111827' }}>
                                    {sdgInfo?.name || `SDG ${data.goal}`}
                                  </p>
                                </div>
                                <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px', lineHeight: '1.4' }}>
                                  {sdgInfo?.description}
                                </p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                                  <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: sdgInfo?.color || '#166534' }}>{data.hours}</p>
                                    <p style={{ fontSize: '11px', color: '#6b7280' }}>Hours</p>
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: sdgInfo?.color || '#166534' }}>{data.projects}</p>
                                    <p style={{ fontSize: '11px', color: '#6b7280' }}>Projects</p>
                                  </div>
                                  <div style={{ textAlign: 'center' }}>
                                    <p style={{ fontSize: '18px', fontWeight: 'bold', color: sdgInfo?.color || '#166534' }}>{data.volunteers || 0}</p>
                                    <p style={{ fontSize: '11px', color: '#6b7280' }}>Volunteers</p>
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
                        align="center"
                        wrapperStyle={{ paddingTop: '16px' }}
                        formatter={(value, entry: any) => (
                          <span style={{ color: '#374151', fontSize: '11px' }}>{value}</span>
                        )}
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

            {/* Project Locations Map */}
            <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px' }}>Project Locations</h3>
              <div style={{ height: '250px', borderRadius: '8px', overflow: 'hidden' }}>
                <MapContainer
                  center={[20, 0]}
                  zoom={2}
                  style={{ width: '100%', height: '100%' }}
                  data-testid="project-map"
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution="&copy; OpenStreetMap contributors, &copy; CartoDB"
                  />
                  {dashboardData?.projectLocations?.map((project) => {
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

        {/* Bottom Section (2/5): Impact Over Time | AI Insights */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }} className="bottom-section">
          {/* Left: Impact Over Time Chart */}
          <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={18} style={{ color: '#166534' }} />
              Impact Over Time
            </h3>
            <div style={{ height: '250px' }}>
              {dashboardData?.impactOverTime && dashboardData.impactOverTime.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dashboardData.impactOverTime}>
                    <defs>
                      <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#166534" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#166534" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="peopleGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1e40af" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#1e40af" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split('-')[1]} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div style={{ backgroundColor: 'white', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{label}</p>
                              <p style={{ fontSize: '13px', color: '#166534' }}>Hours: {payload[0]?.value}</p>
                              <p style={{ fontSize: '13px', color: '#1e40af' }}>People Impacted: {payload[1]?.value}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="hours" stroke="#166534" fill="url(#hoursGradient)" strokeWidth={2} name="Hours" />
                    <Area type="monotone" dataKey="peopleImpacted" stroke="#1e40af" fill="url(#peopleGradient)" strokeWidth={2} name="People Impacted" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                  No impact data available
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
      `}</style>
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
        padding: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        border: `2px solid ${color}20`,
        cursor: 'pointer',
        transition: 'transform 0.15s, box-shadow 0.15s',
        width: '100%',
        textAlign: 'left',
      }}
      data-testid={testId}
    >
      <div style={{ padding: '12px', backgroundColor: `${color}10`, borderRadius: '10px', color }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: '28px', fontWeight: 'bold', color }}>{value.toLocaleString()}</p>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>{label}</p>
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

function getCoordinatesFromLocation(location: string): { lat: number; lng: number } | null {
  const locationCoords: Record<string, { lat: number; lng: number }> = {
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
    'nairobi': { lat: -1.2921, lng: 36.8219 },
    'lagos': { lat: 6.5244, lng: 3.3792 },
    'cape town': { lat: -33.9249, lng: 18.4241 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'berlin': { lat: 52.52, lng: 13.405 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'mumbai': { lat: 19.076, lng: 72.8777 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'remote': { lat: 0, lng: 0 },
    'global': { lat: 0, lng: 0 },
  };

  const locationLower = location.toLowerCase();
  for (const [key, coords] of Object.entries(locationCoords)) {
    if (locationLower.includes(key)) {
      return coords;
    }
  }
  
  return { lat: 20 + Math.random() * 40, lng: -40 + Math.random() * 80 };
}

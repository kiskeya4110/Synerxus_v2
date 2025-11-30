import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Home, BarChart3, Users, Briefcase, FileText, Settings, ChevronRight, X, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { sdgGoals, getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";
import { useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import EmployeeEngagementTab from "./employee-engagement-tab";

interface SDGEmployee {
  name: string;
  email: string;
  hours: number;
  projectId: number;
  projectName: string;
}

interface SDGProject {
  id: number;
  name: string;
  hours: number;
}

interface SDGMetric {
  sdg: number;
  totalHours: number;
  uniqueEmployees: number;
  projectsContributed: number;
  employees?: SDGEmployee[];
  projects?: SDGProject[];
}

interface CSRDashboardData {
  totalPartners: number;
  activeEmployees: number;
  totalHours: number;
  totalImpact: number;
  projectsCompleted: number;
  sdgScoreDelta: number;
  sdgProgress: Record<number, { goal: number; name: string; color: string; progress: number; status?: string }>;
  sdgMetrics: SDGMetric[];
  partners: Array<{ id: number; companyName: string; employees: number; hours: number; roi: number }>;
  challenges: Array<{ id: number; title: string; sdgGoal: number; progress: number; target: number; status: string }>;
  leaderboard: Array<{ rank: number; employeeName: string; hours: number; points: number }>;
  pendingActions: Array<{ type: string; orgName: string; description: string }>;
  projectLocations: Array<{ id: number; name: string; lat: number; lng: number; region: string; employees: number; hours: number; status: string }>;
}

export default function CSRDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const userId = localStorage.getItem('currentUserId');
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);
  const [selectedAdminTab, setSelectedAdminTab] = useState<'reviews' | 'insights' | 'flagged'>('reviews');
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedFunnelStage, setSelectedFunnelStage] = useState<number | null>(null);
  const [showFunnelModal, setShowFunnelModal] = useState(false);
  const [selectedMainTab, setSelectedMainTab] = useState<'overview' | 'engagement'>('overview');

  const isAuthenticated = !!user && !!userId;

  const { data: csrData, isLoading, error } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error("Access denied - you don't have permission to view this dashboard");
        }
        throw new Error("Failed to fetch CSR dashboard");
      }
      return response.json();
    },
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
  });

  const { data: funnelData } = useQuery({
    queryKey: ["/api/csr/engagement-funnel", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/engagement-funnel?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch funnel");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: adminActionsData } = useQuery({
    queryKey: ["/api/csr/pending-actions", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/pending-actions?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch actions");
      return response.json();
    },
    enabled: isAuthenticated,
  });

  const { data: funnelStageData } = useQuery({
    queryKey: ["/api/csr/engagement-funnel-stage", userId, selectedFunnelStage],
    queryFn: async () => {
      const response = await fetch(`/api/csr/engagement-funnel-stage?userId=${userId}&stage=${selectedFunnelStage}`);
      if (!response.ok) throw new Error("Failed to fetch stage");
      return response.json();
    },
    enabled: isAuthenticated && selectedFunnelStage !== null,
  });

  // Loading state
  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <Skeleton className="h-8 w-48 mb-4" />
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <Card style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
          <CardHeader>
            <CardTitle style={{ color: '#1e3a8a' }}>Access Required</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              Please sign in to access the CSR Dashboard.
            </p>
            <button 
              onClick={() => navigate('/login')}
              style={{ 
                backgroundColor: '#1e3a8a', 
                color: 'white', 
                padding: '8px 24px', 
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
              data-testid="btn-login-redirect"
            >
              Sign In
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access denied error
  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <Card style={{ maxWidth: '400px', padding: '24px', textAlign: 'center' }}>
          <CardHeader>
            <CardTitle style={{ color: '#dc2626' }}>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p style={{ color: '#6b7280', marginBottom: '16px' }}>
              {error.message}
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              style={{ 
                backgroundColor: '#1e3a8a', 
                color: 'white', 
                padding: '8px 24px', 
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
              data-testid="btn-dashboard-redirect"
            >
              Go to Dashboard
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loading data
  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#ffffff' }}>
        <div style={{ height: '64px', backgroundColor: '#1e3a8a', flexShrink: 0 }} />
        <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)' }}>
          <div style={{ width: '20%', backgroundColor: '#1e3a8a', flexShrink: 0 }} />
          <div style={{ width: '80%', backgroundColor: '#f9fafb', padding: '32px', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 bg-slate-200" />)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
              <Skeleton className="h-96 bg-slate-200" />
              <Skeleton className="h-96 bg-slate-200" />
              <Skeleton className="h-48 bg-slate-200" />
              <Skeleton className="h-48 bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const companyName = csrData?.partners?.[0]?.companyName || "Innovate Corp";
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const adminName = user?.displayName || "Sarah Chen";

  // Calculate SDG percentages based on real employee contribution data
  const sdgMetrics = csrData?.sdgMetrics || [];
  const totalSDGHours = sdgMetrics.reduce((sum, metric) => sum + (metric.totalHours || 0), 0);

  // Build SDG chart data
  const sdgChartData = sdgMetrics
    .filter(metric => metric.totalHours > 0)
    .map(metric => {
      const percentage = totalSDGHours > 0 ? Math.round((metric.totalHours / totalSDGHours) * 100) : 0;
      return {
        name: getSDGName(metric.sdg),
        fullName: getSDGFullName(metric.sdg),
        value: Math.max(5, percentage),
        color: getSDGColor(metric.sdg),
        goal: metric.sdg,
        hours: metric.totalHours,
        employees: metric.uniqueEmployees,
        projects: metric.projectsContributed
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const defaultSdgData = [
    { name: getSDGName(4), fullName: getSDGFullName(4), value: 19, color: getSDGColor(4), goal: 4, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(13), fullName: getSDGFullName(13), value: 29, color: getSDGColor(13), goal: 13, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(15), fullName: getSDGFullName(15), value: 18, color: getSDGColor(15), goal: 15, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(3), fullName: getSDGFullName(3), value: 18, color: getSDGColor(3), goal: 3, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(1), fullName: getSDGFullName(1), value: 18, color: getSDGColor(1), goal: 1, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(10), fullName: getSDGFullName(10), value: 22, color: getSDGColor(10), goal: 10, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(5), fullName: getSDGFullName(5), value: 22, color: getSDGColor(5), goal: 5, hours: 0, employees: 0, projects: 0 },
  ];

  const chartData = sdgChartData.length > 0 ? sdgChartData : defaultSdgData;
  const pendingActions = csrData?.pendingActions || [];
  const activeChallenges = csrData?.challenges || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Top Header Bar */}
      <header style={{ 
        backgroundColor: '#1e3a8a', 
        color: 'white', 
        padding: '16px 32px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '64px'
      }}>
        {/* Logo and Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316' }}>✦</span>
          <span style={{ fontSize: '18px', fontWeight: '600', letterSpacing: '0.025em' }}>synerxus</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#e5e7eb' }}>CSR Dashboard</span>
          <span style={{ fontSize: '16px', color: '#9ca3af' }}>•</span>
          <Briefcase style={{ width: '18px', height: '18px', color: '#d1d5db' }} />
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#d1d5db' }}>{companyName}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{ fontSize: '14px', color: '#d1d5db' }}>{currentDate}</span>
          <div style={{ 
            width: '28px', 
            height: '28px', 
            backgroundColor: '#374151', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            fontSize: '16px'
          }}>
            👤
          </div>
          <span style={{ fontSize: '14px', color: '#d1d5db' }}>Admin {adminName}</span>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{ width: '20%', backgroundColor: '#1e3a8a', color: 'white', padding: '24px', flexShrink: 0 }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button 
              onClick={() => navigate('/csr-dashboard')}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                border: '1px solid rgba(59, 130, 246, 0.3)', 
                fontWeight: '500',
                cursor: 'pointer',
                textAlign: 'left' 
              }}
              data-testid="nav-dashboard"
            >
              <Home style={{ width: '20px', height: '20px' }} />
              <span>Dashboard</span>
            </button>
            <button 
              onClick={() => navigate('/csr-impact-reporting')}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                color: '#d1d5db', 
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left'
              }}
              data-testid="nav-impact-report"
            >
              <BarChart3 style={{ width: '20px', height: '20px' }} />
              <span>Impact Reporting</span>
            </button>
            <button 
              onClick={() => setSelectedMainTab('engagement')}
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                backgroundColor: selectedMainTab === 'engagement' ? '#374151' : 'transparent', 
                color: selectedMainTab === 'engagement' ? '#f97316' : '#d1d5db', 
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontWeight: selectedMainTab === 'engagement' ? '600' : '500'
              }}
              data-testid="nav-engagement"
            >
              <Users style={{ width: '20px', height: '20px' }} />
              <span>Employee Engagement</span>
            </button>
            <button 
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: '
                  center', 
                    gap: '12px', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    color: '#d1d5db', 
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  data-testid="nav-project-portfolio"
                  >
                  <Briefcase style={{ width: '20px', height: '20px' }} />
                  <span>Project Portfolio</span>
                  </button>
                  <button 
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    color: '#d1d5db', 
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  data-testid="nav-reports"
                  >
                  <FileText style={{ width: '20px', height: '20px' }} />
                  <span>Reports & Exports</span>
                  </button>
                  <button 
                  onClick={() => navigate('/corporate-partner-profile-settings')}
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px', 
                    padding: '12px 16px', 
                    borderRadius: '8px', 
                    color: '#d1d5db', 
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                  data-testid="nav-settings"
                  >
                  <Settings style={{ width: '20px', height: '20px' }} />
                  <span>Settings</span>
                  </button>
                  </nav>
                  </aside>

                  {/* Main Content */}
                  <main style={{ 
                  width: '80%', 
                  padding: '24px', 
                  backgroundColor: '#f9fafb', 
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '24px'
                  }}>
                  {selectedMainTab === 'engagement' && (
                  <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <Users style={{ width: '28px', height: '28px', color: '#1e3a8a' }} />
                    <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                      Employee Engagement Hub
                    </h1>
                  </div>
                  <EmployeeEngagementTab userId={userId} />
                  </>
                  )}
                  {selectedMainTab === 'overview' && (
                  <div>
                  {/* KPI Cards Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                    <div 
                      onClick={() => setSelectedKPI('hours')}
                      style={{ 
                        backgroundColor: '#1e3a8a', 
                        color: 'white', 
                        padding: '20px', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        cursor: 'pointer',
                        border: selectedKPI === 'hours' ? '2px solid #f97316' : 'none'
                      }} 
                      onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-4px)', e.currentTarget.style.boxShadow = '0 8px 12px -1px rgba(0, 0, 0, 0.2)')}
                      onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)')}
                      data-testid="kpi-total-hours"
                    >
                      <p style={{ fontSize: '12px', color: '#d1d5db', marginBottom: '8px', fontWeight: '500' }}>Total Hours Logged</p>
                      <p style={{ fontSize: '30px', fontWeight: 'bold' }}>{(csrData?.totalHours || 0).toLocaleString()}</p>
                    </div>

                    <div 
                      onClick={() => setSelectedKPI('employees')}
                      style={{ 
                        backgroundColor: '#1e3a8a', 
                        color: 'white', 
                        padding: '20px', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        cursor: 'pointer',
                        border: selectedKPI === 'employees' ? '2px solid #f97316' : 'none'
                      }} 
                      onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-4px)', e.currentTarget.style.boxShadow = '0 8px 12px -1px rgba(0, 0, 0, 0.2)')}
                      onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)')}
                      data-testid="kpi-employees"
                    >
                      <p style={{ fontSize: '12px', color: '#d1d5db', marginBottom: '8px', fontWeight: '500' }}>Employees Engaged</p>
                      <p style={{ fontSize: '30px', fontWeight: 'bold' }}>{csrData?.activeEmployees || 0}</p>
                    </div>

                    <div 
                      onClick={() => setSelectedKPI('projects')}
                      style={{ 
                        backgroundColor: '#1e3a8a', 
                        color: 'white', 
                        padding: '20px', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        cursor: 'pointer',
                        border: selectedKPI === 'projects' ? '2px solid #f97316' : 'none'
                      }} 
                      onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-4px)', e.currentTarget.style.boxShadow = '0 8px 12px -1px rgba(0, 0, 0, 0.2)')}
                      onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)')}
                      data-testid="kpi-projects"
                    >
                      <p style={{ fontSize: '12px', color: '#d1d5db', marginBottom: '8px', fontWeight: '500' }}>Projects Completed</p>
                      <p style={{ fontSize: '30px', fontWeight: 'bold' }}>{csrData?.projectsCompleted || 0}</p>
                    </div>

                    <div 
                      onClick={() => setSelectedKPI('sdg')}
                      style={{ 
                        backgroundColor: '#1e3a8a', 
                        color: 'white', 
                        padding: '20px', 
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        cursor: 'pointer',
                        border: selectedKPI === 'sdg' ? '2px solid #f97316' : 'none'
                      }} 
                      onMouseOver={(e) => (e.currentTarget.style.transform = 'translateY(-4px)', e.currentTarget.style.boxShadow = '0 8px 12px -1px rgba(0, 0, 0, 0.2)')}
                      onMouseOut={(e) => (e.currentTarget.style.transform = 'translateY(0)', e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)')}
                      data-testid="kpi-sdg-delta"
                    >
                      <p style={{ fontSize: '12px', color: '#d1d5db', marginBottom: '8px', fontWeight: '500' }}>SDG Score Delta</p>
                      <p style={{ fontSize: '30px', fontWeight: 'bold' }}>{(csrData?.sdgScoreDelta || 0) >= 0 ? '+' : ''}{csrData?.sdgScoreDelta || 0}% <span style={{ fontSize: '18px', fontWeight: 'normal', color: '#d1d5db' }}>Q3</span></p>
                    </div>
                  </div>

                  {/* SDG Detail Modal */}
                  {selectedSDG && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 50
                    }} onClick={() => setSelectedSDG(null)}>
                      <div 
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                          maxWidth: '600px',
                          width: '90%',
                          maxHeight: '80vh',
                          overflowY: 'auto',
                          padding: '32px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                            {getSDGFullName(selectedSDG)}
                          </h2>
                          <button 
                            onClick={() => setSelectedSDG(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                          </button>
                        </div>

                        <div style={{ color: '#374151' }}>
                          {(() => {
                            const sdgProgress = csrData?.sdgProgress?.[selectedSDG];
                            const progress = sdgProgress?.progress || 0;
                            return (
                              <>
                                <p style={{ fontSize: '32px', fontWeight: 'bold', color: getSDGColor(selectedSDG), marginBottom: '16px' }}>
                                  {Math.round(progress)}% Complete
                                </p>
                                <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                                  Progress on SDG Goal {selectedSDG}: {getSDGFullName(selectedSDG)} as part of your CSR initiatives.
                                </p>
                                <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Progress Bar:</p>
                                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ width: `${progress}%`, height: '100%', backgroundColor: getSDGColor(selectedSDG) }} />
                                  </div>
                                </div>
                                <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Goal Details:</p>
                                  <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                                    <li style={{ marginBottom: '8px' }}>✓ Status: {sdgProgress?.status === 'active' ? '🔴 Active' : '✅ Committed'}</li>
                                    <li style={{ marginBottom: '8px' }}>✓ Current Progress: {(sdgProgress as any)?.currentHours || 0} hours logged</li>
                                    <li style={{ marginBottom: '8px' }}>✓ Target Hours: {(sdgProgress as any)?.targetHours || 'Not set'}</li>
                                    <li>✓ Impact Level: {progress > 75 ? '🌟 Excellent' : progress > 50 ? '⭐ Good' : progress > 25 ? '⚡ On Track' : '⏳ Starting'}</li>
                                  </ul>
                                </div>
                                <div style={{ backgroundColor: '#eff6ff', padding: '16px', borderRadius: '8px', marginTop: '16px', border: '1px solid #bfdbfe' }}>
                                  <p style={{ fontSize: '12px', fontWeight: '600', color: '#1e40af', marginBottom: '8px' }}>📊 Contribution:</p>
                                  <p style={{ fontSize: '13px', color: '#1e40af', margin: 0 }}>
                                    Your CSR program is contributing {Math.round(progress)}% towards this UN Sustainable Development Goal, supported by employee volunteers and strategic initiatives.
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KPI Detail Modal */}
                  {selectedKPI && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 50
                    }} onClick={() => setSelectedKPI(null)}>
                      <div 
                        style={{
                          backgroundColor: 'white',
                          borderRadius: '12px',
                          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
                          maxWidth: '600px',
                          width: '90%',
                          maxHeight: '80vh',
                          overflowY: 'auto',
                          padding: '32px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                            {selectedKPI === 'hours' && 'Total Hours Logged'}
                            {selectedKPI === 'employees' && 'Employees Engaged'}
                            {selectedKPI === 'projects' && 'Projects Completed'}
                            {selectedKPI === 'sdg' && 'SDG Score Performance'}
                          </h2>
                          <button 
                            onClick={() => setSelectedKPI(null)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                          </button>
                        </div>

                        {/* Content for each KPI type */}
                        {selectedKPI === 'hours' && (
                          <div style={{ color: '#374151' }}>
                            <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
                              {((csrData as any)?.kpiBreakdown?.hours?.total || 0).toLocaleString()} hours
                            </p>
                            <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                              Total employee hours contributed to CSR-sponsored initiatives.
                            </p>
                            {/* Breakdown Summary */}
                            <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                              <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Employee Hours Summary:</p>
                              <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                                <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>✓ Average per employee:</span>
                                  <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.hours?.averagePerEmployee || 0)} hrs</span>
                                </li>
                                <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>✓ Weekly average:</span>
                                  <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.hours?.weeklyAverage || 0)} hrs/week</span>
                                </li>
                                <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>✓ Top project hours:</span>
                                  <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.hours?.topProjectHours || 0)} hrs</span>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                                  <span>💰 Economic value (@$35/hr):</span>
                                  <span style={{ fontWeight: '600', color: '#059669' }}>${(((csrData as any)?.kpiBreakdown?.hours?.economicValue || 0)).toLocaleString()}</span>
                                  import React, { useState } from 'react';
                                  import { Briefcase, FileText, Settings, Users, X } from 'react-feather';

                                  const Dashboard = ({ csrData, userId, navigate }) => {
                                    const [selectedMainTab, setSelectedMainTab] = useState('engagement');
                                    const [selectedKPI, setSelectedKPI] = useState(null);
                                    const [selectedSDG, setSelectedSDG] = useState(null);

                                    const getSDGFullName = (sdg) => {
                                      const sdgNames = {
                                        '1': 'No Poverty',
                                        '2': 'Zero Hunger',
                                        '3': 'Good Health and Well-being',
                                        // Add all SDG names here
                                      };
                                      return sdgNames[sdg] || 'Unknown SDG';
                                    };

                                    const getSDGColor = (sdg) => {
                                      const sdgColors = {
                                        '1': '#FF5733',
                                        // Specify colors for other SDGs
                                      };
                                      return sdgColors[sdg] || '#000000';
                                    };

                                    return (
                                      <div style={{ display: 'flex', height: '100vh' }}>
                                        <aside style={{ width: '20%', backgroundColor: '#1e293b', padding: '24px', color: '#fff' }}>
                                          <nav>
                                            <button 
                                              onClick={() => setSelectedMainTab('engagement')}
                                              style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                backgroundColor: selectedMainTab === 'engagement' ? '#374151' : 'transparent',
                                                color: '#d1d5db'
                                              }}
                                            >
                                              <Users style={{ width: '20px', height: '20px' }} />
                                              <span>Employee Engagement Hub</span>
                                            </button>
                                            <button 
                                              onClick={() => setSelectedMainTab('overview')}
                                              style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                backgroundColor: selectedMainTab === 'overview' ? '#374151' : 'transparent',
                                                color: '#d1d5db'
                                              }}
                                            >
                                              <Briefcase style={{ width: '20px', height: '20px' }} />
                                              <span>Project Portfolio</span>
                                            </button>
                                            <button 
                                              onClick={() => navigate('/reports')}
                                              style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                color: '#d1d5db'
                                              }}
                                            >
                                              <FileText style={{ width: '20px', height: '20px' }} />
                                              <span>Reports & Exports</span>
                                            </button>
                                            <button 
                                              onClick={() => navigate('/corporate-partner-profile-settings')}
                                              style={{
                                                width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                                padding: '12px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                                color: '#d1d5db'
                                              }}
                                            >
                                              <Settings style={{ width: '20px', height: '20px' }} />
                                              <span>Settings</span>
                                            </button>
                                          </nav>
                                        </aside>

                                        <main style={{ width: '80%', padding: '24px', backgroundColor: '#f9fafb', overflowY: 'auto' }}>
                                          {selectedMainTab === 'engagement' && (
                                            <div>
                                              <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
                                                Employee Engagement Hub
                                              </h1>
                                              {/* Employee Engagement Tab Component */}
                                            </div>
                                          )}
                                          {selectedMainTab === 'overview' && (
                                            <div>
                                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                                                <div 
                                                  onClick={() => setSelectedKPI('hours')}
                                                  style={{ cursor: 'pointer', padding: '20px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: 'white' }}
                                                  data-testid="kpi-total-hours"
                                                >
                                                  <p>Total Hours Logged</p>
                                                  <p>{(csrData?.totalHours || 0).toLocaleString()}</p>
                                                </div>
                                                <div 
                                                  onClick={() => setSelectedKPI('employees')}
                                                  style={{ cursor: 'pointer', padding: '20px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: 'white' }}
                                                  data-testid="kpi-employees"
                                                >
                                                  <p>Employees Engaged</p>
                                                  <p>{csrData?.activeEmployees || 0}</p>
                                                </div>
                                                <div 
                                                  onClick={() => setSelectedKPI('projects')}
                                                  style={{ cursor: 'pointer', padding: '20px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: 'white' }}
                                                  data-testid="kpi-projects"
                                                >
                                                  <p>Projects Completed</p>
                                                  <p>{csrData?.projectsCompleted || 0}</p>
                                                </div>
                                                <div 
                                                  onClick={() => setSelectedKPI('sdg')}
                                                  style={{ cursor: 'pointer', padding: '20px', borderRadius: '8px', backgroundColor: '#1e3a8a', color: 'white' }}
                                                  data-testid="kpi-sdg"
                                                >
                                                  <p>SDG Score Delta</p>
                                                  <p>{(csrData?.sdgScoreDelta || 0) >= 0 ? '+' : ''}{csrData?.sdgScoreDelta || 0}%</p>
                                                </div>
                                              </div>

                                              {selectedKPI && (
                                                <div style={{
                                                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                                  backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }} onClick={() => setSelectedKPI(null)}>
                                                  <div style={{
                                                    backgroundColor: 'white', borderRadius: '12px',
                                                    maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', padding: '32px'
                                                  }}>
                                                    <h2>{selectedKPI === 'hours' ? 'Total Hours Logged' : 'Other KPI'}</h2>
                                                    <button onClick={() => setSelectedKPI(null)}>
                                                      <X style={{ width: '24px', height: '24px' }} />
                                                    </button>
                                                    {/* KPI Detail Content Here */}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </main>
                                      </div>
                                    );
                                  };

                                  export default Dashboard;
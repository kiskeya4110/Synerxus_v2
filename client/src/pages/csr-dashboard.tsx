import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Home, BarChart3, Users, Briefcase, FileText, Settings, ChevronRight, X, MapPin  } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { sdgGoals, getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";
import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

  // Check for authentication
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

  // Show loading while checking auth
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

  // Redirect if not authenticated
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
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
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

  // Show error if access denied
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
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
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
  const totalSDGHours = sdgMetrics.reduce((sum: number, metric: any) => sum + (metric.totalHours || 0), 0);
  
  // Build SDG chart data from real metrics - only include SDGs with actual hours
  const sdgChartData = sdgMetrics
    .filter(metric => metric.totalHours > 0) // Only show SDGs with real hours
    .map(metric => {
      const percentage = totalSDGHours > 0 
        ? Math.round((metric.totalHours / totalSDGHours) * 100)
        : 0;
      return {
        name: getSDGName(metric.sdg),
        fullName: getSDGFullName(metric.sdg),
        value: Math.max(5, percentage), // Min 5% for visibility in pie chart
        color: getSDGColor(metric.sdg),
        goal: metric.sdg,
        hours: metric.totalHours,
        employees: metric.uniqueEmployees,
        projects: metric.projectsContributed
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Default SDG data if none exists - using proper shortNames
  const defaultSdgData = [
    { name: getSDGName(4), fullName: getSDGFullName(4), value: 19, color: getSDGColor(4), goal: 4, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(13), fullName: getSDGFullName(13), value: 29, color: getSDGColor(13), goal: 13, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(15), fullName: getSDGFullName(15), value: 18, color: getSDGColor(15), goal: 15, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(3), fullName: getSDGFullName(3), value: 18, color: getSDGColor(3), goal: 3, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(1), fullName: getSDGFullName(1), value: 18, color: getSDGColor(1), goal: 1, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(10), fullName: getSDGFullName(10), value: 22, color: getSDGColor(10), goal: 10, hours: 0, employees: 0, projects: 0 },
    { name: getSDGName(5), fullName: getSDGFullName(5), value: 22, color: getSDGColor(5), goal: 5, hours: 0, employees: 0, projects: 0 },
  ];

  // Only show chart data if there's real employee engagement, otherwise show placeholder
  const chartData = sdgChartData.length > 0 ? sdgChartData : defaultSdgData;

  // Pending admin actions - use real data from API
  const pendingActions = csrData?.pendingActions || [];

  // Active challenges from real data
  const activeChallenges = csrData?.challenges || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#ffffff' }}>
      {/* Top Header Bar - Dark Navy */}
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
        {/* Left: Synerxus Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316' }}>✦</span>
          <span style={{ fontSize: '18px', fontWeight: '600', letterSpacing: '0.025em' }}>synerxus</span>
        </div>

        {/* Center: CSR Dashboard Title with Company Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'center' }}>
          <span style={{ fontSize: '16px', fontWeight: '600', color: '#e5e7eb' }}>CSR Dashboard</span>
          <span style={{ fontSize: '16px', color: '#9ca3af' }}>•</span>
          <Briefcase style={{ width: '18px', height: '18px', color: '#d1d5db' }} />
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#d1d5db' }}>{companyName}</span>
        </div>

        {/* Right: Date and Admin User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', minWidth: 'fit-content' }}>
          <span style={{ fontSize: '14px', color: '#d1d5db' }}>{currentDate}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 64px)' }}>
        {/* Left Sidebar - 1/5 width (20%), Dark Navy */}
        <aside style={{ 
          width: '20%', 
          backgroundColor: '#1e3a8a', 
          color: 'white', 
          padding: '24px',
          flexShrink: 0
        }}>
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
                color: '#60a5fa', 
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
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                backgroundColor: 'transparent', 
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
              style={{ 
                width: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                backgroundColor: 'transparent', 
                color: '#d1d5db', 
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left'
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
                alignItems: 'center', 
                gap: '12px', 
                padding: '12px 16px', 
                borderRadius: '8px', 
                backgroundColor: 'transparent', 
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
                backgroundColor: 'transparent', 
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
                backgroundColor: 'transparent', 
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

        {/* Main Content - 4/5 width (80%) */}
        <main style={{ 
          width: '80%', 
          padding: '24px', 
          backgroundColor: '#f9fafb', 
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* KPI Cards Row - 4 cards in dark navy */}
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
                transition: 'all 0.3s ease',
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
                transition: 'all 0.3s ease',
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
                transition: 'all 0.3s ease',
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
                transition: 'all 0.3s ease',
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
                            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: getSDGColor(selectedSDG), transition: 'width 0.3s ease' }} />
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

                {selectedKPI === 'hours' && (
                  <div style={{ color: '#374151' }}>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
                      {((csrData as any)?.kpiBreakdown?.hours?.total || 0).toLocaleString()} hours
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      Total employee hours contributed to CSR-sponsored initiatives.
                    </p>
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
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedKPI === 'employees' && (
                  <div style={{ color: '#374151' }}>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
                      {((csrData as any)?.kpiBreakdown?.employees?.total || 0)} employees engaged
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      Company employees actively participating in CSR-sponsored initiatives.
                    </p>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Employee Engagement Metrics:</p>
                      <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Average hours per employee:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.employees?.averageHoursPerEmployee || 0)} hrs</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Engagement rate:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.employees?.engagementRate || 0)}% of workforce</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ New participants this month:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.employees?.newThisMonth || 0)}</span>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                          <span>🏆 Top performer:</span>
                          <span style={{ fontWeight: '600', color: '#059669' }}>{((csrData as any)?.kpiBreakdown?.employees?.topPerformer || 'N/A')} ({((csrData as any)?.kpiBreakdown?.employees?.topPerformerHours || 0)} hrs)</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedKPI === 'projects' && (
                  <div style={{ color: '#374151' }}>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
                      {((csrData as any)?.kpiBreakdown?.projects?.total || 0)} sponsored projects
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      CSR initiatives sponsored with employee participation and measured impact.
                    </p>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Employee Project Impact:</p>
                      <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Active with employee hours:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.projects?.activeProjects || 0)}</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Total employee hours:</span>
                          <span style={{ fontWeight: '600' }}>{(((csrData as any)?.kpiBreakdown?.projects?.totalHoursInvested || 0)).toLocaleString()} hrs</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Average hours per project:</span>
                          <span style={{ fontWeight: '600' }}>{(((csrData as any)?.kpiBreakdown?.projects?.averageHoursPerProject || 0)).toLocaleString()} hrs</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Geographic regions:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.projects?.regionsServed || 0)} regions</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Total ROI:</span>
                          <span style={{ fontWeight: '600' }}>{(((csrData as any)?.kpiBreakdown?.projects?.totalRoi || 0)).toFixed(1)}</span>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                          <span>👥 Beneficiaries reached:</span>
                          <span style={{ fontWeight: '600', color: '#059669' }}>{(((csrData as any)?.kpiBreakdown?.projects?.beneficiariesReached || 0)).toLocaleString()}</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedKPI === 'sdg' && (
                  <div style={{ color: '#374151' }}>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
                      +{((csrData as any)?.kpiBreakdown?.sdg?.scoreDelta || 0)}% SDG Performance
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      Progress across Sustainable Development Goals aligned with your CSR strategy.
                    </p>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>SDG Progress Metrics:</p>
                      <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Active SDG commitments:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.sdg?.activeCommitments || 0)}</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Average progress:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.sdg?.averageProgress || 0)}%</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Total SDG hours:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.sdg?.totalSdgHours || 0).toLocaleString()} hrs</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Active challenges:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.sdg?.challengesActive || 0)}</span>
                        </li>
                        <li style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>✓ Completed challenges:</span>
                          <span style={{ fontWeight: '600' }}>{((csrData as any)?.kpiBreakdown?.sdg?.challengesCompleted || 0)}</span>
                        </li>
                        <li style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
                          <span>🎯 Top SDG (Goal {((csrData as any)?.kpiBreakdown?.sdg?.topSdg || 0)}):</span>
                          <span style={{ fontWeight: '600', color: '#059669' }}>{((csrData as any)?.kpiBreakdown?.sdg?.topSdgHours || 0).toLocaleString()} hrs</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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
              zIndex: 1000
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
                  padding: '24px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {(() => {
                  const selectedMetric = sdgMetrics.find((m: SDGMetric) => m.sdg === selectedSDG);
                  const sdgColor = getSDGColor(selectedSDG);
                  
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '48px', 
                            height: '48px', 
                            borderRadius: '10px', 
                            backgroundColor: sdgColor, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: '20px',
                            fontWeight: 'bold'
                          }}>
                            {selectedSDG}
                          </div>
                          <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#111827', margin: 0 }}>
                              {getSDGName(selectedSDG)}
                            </h2>
                            <p style={{ fontSize: '14px', color: '#6b7280', margin: '2px 0 0 0' }}>
                              {getSDGFullName(selectedSDG)}
                            </p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setSelectedSDG(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                        >
                          <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                        </button>
                      </div>

                      {/* Summary Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534', margin: 0 }}>
                            {selectedMetric?.totalHours || 0}
                          </p>
                          <p style={{ fontSize: '11px', color: '#15803d', margin: '2px 0 0 0' }}>Total Hours</p>
                        </div>
                        <div style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>
                            {selectedMetric?.uniqueEmployees || 0}
                          </p>
                          <p style={{ fontSize: '11px', color: '#1d4ed8', margin: '2px 0 0 0' }}>Volunteers</p>
                        </div>
                        <div style={{ backgroundColor: '#fef3c7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e', margin: 0 }}>
                            {selectedMetric?.projectsContributed || 0}
                          </p>
                          <p style={{ fontSize: '11px', color: '#b45309', margin: '2px 0 0 0' }}>Projects</p>
                        </div>
                      </div>

                      {/* Employees Section */}
                      <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users style={{ width: '16px', height: '16px' }} />
                          Contributing Employees
                        </h3>
                        <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
                          {selectedMetric?.employees && selectedMetric.employees.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {selectedMetric.employees.map((emp, idx) => (
                                <div 
                                  key={emp.email} 
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    backgroundColor: 'white',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      borderRadius: '50%', 
                                      backgroundColor: sdgColor,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontSize: '12px',
                                      fontWeight: 'bold'
                                    }}>
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>{emp.name}</p>
                                      <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{emp.projectName}</p>
                                    </div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: sdgColor, margin: 0 }}>{emp.hours} hrs</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                              No employee data available
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Projects Section */}
                      <div>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Briefcase style={{ width: '16px', height: '16px' }} />
                          Contributing Projects
                        </h3>
                        <div style={{ backgroundColor: '#f9fafb', borderRadius: '8px', padding: '12px' }}>
                          {selectedMetric?.projects && selectedMetric.projects.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {selectedMetric.projects.map((proj) => (
                                <div 
                                  key={proj.id} 
                                  style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    backgroundColor: 'white',
                                    borderRadius: '6px',
                                    border: '1px solid #e5e7eb'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      borderRadius: '6px', 
                                      backgroundColor: '#f3f4f6',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}>
                                      <Briefcase style={{ width: '16px', height: '16px', color: '#6b7280' }} />
                                    </div>
                                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>{proj.name}</p>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#1e3a8a', margin: 0 }}>{proj.hours} hrs</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ fontSize: '13px', color: '#6b7280', textAlign: 'center', margin: 0 }}>
                              No project data available
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Economic Impact */}
                      <div style={{ 
                        marginTop: '20px', 
                        padding: '12px', 
                        backgroundColor: '#f0fdf4', 
                        borderRadius: '8px',
                        borderLeft: `4px solid ${sdgColor}`
                      }}>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#166534', margin: '0 0 4px 0' }}>
                          💰 Economic Impact
                        </p>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#166534', margin: 0 }}>
                          ${((selectedMetric?.totalHours || 0) * 35).toLocaleString()}
                        </p>
                        <p style={{ fontSize: '11px', color: '#15803d', margin: '2px 0 0 0' }}>
                          Based on $35/hour volunteer value
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Analytics Grid - 2x2 layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            {/* Row 1, Col 1: SDG Alignment Dashboard - Enhanced View */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              minHeight: '420px'
            }} data-testid="chart-sdg-alignment">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>SDG Alignment Dashboard</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6b7280' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#22c55e' }}></span>
                    Active
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }}></span>
                    Committed
                  </span>
                </div>
              </div>
              
              {/* Summary Stats Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
                <div style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534', margin: 0 }}>{sdgMetrics.length || 0}</p>
                  <p style={{ fontSize: '11px', color: '#15803d', margin: '2px 0 0 0' }}>Active SDGs</p>
                </div>
                <div style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af', margin: 0 }}>{totalSDGHours.toLocaleString()}</p>
                  <p style={{ fontSize: '11px', color: '#1d4ed8', margin: '2px 0 0 0' }}>Total Hours</p>
                </div>
                <div style={{ backgroundColor: '#fef3c7', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                  <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#92400e', margin: 0 }}>
                    {sdgMetrics.reduce((sum: number, m: any) => sum + (m.uniqueEmployees || 0), 0)}
                  </p>
                  <p style={{ fontSize: '11px', color: '#b45309', margin: '2px 0 0 0' }}>Volunteers</p>
                </div>
              </div>

              {/* SDG Progress Bars - Scrollable List */}
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '12px' }}>
                {chartData.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {chartData.map((sdg, idx) => (
                      <div 
                        key={sdg.goal} 
                        style={{ 
                          padding: '10px 12px', 
                          backgroundColor: selectedSDG === sdg.goal ? '#f8fafc' : 'white',
                          borderRadius: '8px',
                          border: selectedSDG === sdg.goal ? `2px solid ${sdg.color}` : '1px solid #e5e7eb',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onClick={() => setSelectedSDG(selectedSDG === sdg.goal ? null : sdg.goal)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ 
                              width: '28px', 
                              height: '28px', 
                              borderRadius: '6px', 
                              backgroundColor: sdg.color, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '12px',
                              fontWeight: 'bold'
                            }}>
                              {sdg.goal}
                            </div>
                            <div>
                              <p style={{ fontSize: '13px', fontWeight: '600', color: '#111827', margin: 0 }}>{sdg.name}</p>
                              <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{sdg.fullName}</p>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontSize: '14px', fontWeight: 'bold', color: sdg.color, margin: 0 }}>{sdg.value}%</p>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div style={{ height: '6px', backgroundColor: '#e5e7eb', borderRadius: '3px', overflow: 'hidden', marginBottom: '6px' }}>
                          <div style={{ 
                            height: '100%', 
                            width: `${Math.min(100, sdg.value)}%`, 
                            backgroundColor: sdg.color,
                            borderRadius: '3px',
                            transition: 'width 0.3s'
                          }}></div>
                        </div>
                        
                        {/* Stats Row */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280' }}>
                          <span>⏱️ {(sdg.hours || 0).toLocaleString()} hrs</span>
                          <span>👥 {sdg.employees || 0} volunteers</span>
                          <span>📁 {sdg.projects || 0} projects</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                    <p>No SDG data available yet</p>
                  </div>
                )}
              </div>

              {/* AI Insights Section */}
              <div style={{ padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px', borderLeft: '4px solid #3b82f6' }}>
                <p style={{ fontSize: '11px', fontWeight: '600', color: '#1e40af', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  ✨ AI Insight
                </p>
                <p style={{ fontSize: '12px', color: '#334155', lineHeight: '1.4', margin: 0 }}>
                  {(() => {
                    const totalHours = sdgMetrics.reduce((sum: number, m: any) => sum + (m.totalHours || 0), 0);
                    const totalVolunteers = sdgMetrics.reduce((sum: number, m: any) => sum + (m.uniqueEmployees || 0), 0);
                    const topSDG = sdgMetrics[0];

                    if (totalHours === 0) {
                      return "Start tracking contributions to unlock impact insights.";
                    }

                    if (topSDG) {
                      return `Leading with ${getSDGName(topSDG.sdg)} (${topSDG.totalHours} hrs). ${totalVolunteers} volunteers across ${sdgMetrics.length} SDGs.`;
                    }
                    return `${totalVolunteers} volunteers contributing ${totalHours} hours across global goals.`;
                  })()}
                </p>
              </div>
            </div>

            {/* Row 1, Col 2: Geographic Impact by Region - Interactive Map */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column'
            }} data-testid="chart-geographic-impact">
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin style={{ width: '16px', height: '16px' }} />
                Geographic Impact by Region
              </h3>
              <div style={{ flex: 1, borderRadius: '8px', overflow: 'hidden', position: 'relative', backgroundColor: '#f0f4f8', minHeight: '300px' }}>
                {(csrData?.projectLocations || []).length > 0 ? (
                  <MapContainer 
                    center={[20, 0]} 
                    zoom={2} 
                    style={{ width: '100%', height: '100%' }}
                    data-testid="geographic-map"
                  >
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution='&copy; OpenStreetMap contributors'
                    />
                    {csrData?.projectLocations?.map((project) => {
                      const statusColor = project.status === 'active' ? '#1e3a8a' : project.status === 'completed' ? '#22c55e' : '#f97316';
                      
                      // Create custom icon for each marker
                      const customIcon = L.divIcon({
                        html: `<div style="display: flex; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 50%; background-color: ${statusColor}; color: white; font-weight: bold; font-size: 14px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                          ${project.employees}
                        </div>`,
                        className: 'custom-marker',
                        iconSize: [40, 40],
                        iconAnchor: [20, 20],
                        popupAnchor: [0, -20]
                      });

                      return (
                        <Marker 
                          key={project.id} 
                          position={[project.lat, project.lng]}
                          icon={customIcon}
                          data-testid={`map-marker-${project.id}`}
                        >
                          <Popup>
                            <div style={{ fontSize: '12px', minWidth: '200px' }}>
                              <p style={{ fontWeight: '600', margin: '0 0 4px 0', color: '#111827' }}>{project.name}</p>
                              <p style={{ margin: '2px 0', color: '#6b7280' }}>📍 {project.region}</p>
                              <p style={{ margin: '2px 0', color: '#6b7280' }}>👥 {project.employees} employee{project.employees !== 1 ? 's' : ''}</p>
                              <p style={{ margin: '2px 0', color: '#6b7280' }}>⏱️ {project.hours.toLocaleString()} hours</p>
                              <p style={{ margin: '4px 0 0 0', padding: '4px 0 0 0', borderTop: '1px solid #e5e7eb', color: '#1e3a8a', fontWeight: '600', textTransform: 'capitalize' }}>
                                Status: {project.status}
                              </p>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '13px' }}>
                    No project locations mapped yet
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '12px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#1e3a8a' }}></div>
                  <span style={{ color: '#4b5563' }}>Active Projects</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div>
                  <span style={{ color: '#4b5563' }}>Completed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#f97316' }}></div>
                  <span style={{ color: '#4b5563' }}>Sponsored</span>
                </div>
              </div>
            </div>

            {/* Row 2, Col 1: Employee Engagement Funnel */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px'
            }} data-testid="chart-employee-funnel">
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Employee Engagement Funnel</h3>
              {funnelData?.funnel ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {funnelData.funnel.map((stage: any, idx: number) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                      {idx > 0 && <ChevronRight style={{ width: '14px', height: '14px', color: '#9ca3af' }} />}
                      <span style={{ fontWeight: idx === 0 ? '600' : '500', color: idx === 0 ? '#1e3a8a' : '#374151' }}>
                        {stage.stage}
                      </span>
                      <span style={{ fontWeight: '600', color: '#059669' }}>({stage.count})</span>
                      {idx > 0 && <span style={{ fontSize: '11px', color: '#6b7280' }}>-{stage.dropoff}%</span>}
                    </div>
                  ))}
                  <div style={{ marginTop: '8px', padding: '8px 0', borderTop: '1px solid #e5e7eb', fontSize: '12px', color: '#6b7280' }}>
                    Conversion to Active: {funnelData.conversion.toActive}% • Top Performers: {funnelData.conversion.toTopPerformers}%
                  </div>
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '13px' }}>Loading funnel data...</div>
              )}
            </div>

            {/* Row 2, Col 2: Pending Admin Actions */}
            <div 
              onClick={() => setShowAdminModal(true)}
              style={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
              data-testid="chart-pending-actions"
            >
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Pending Admin Actions</h3>
              {adminActionsData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc2626' }}>{adminActionsData.reviews.count}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>Reviews</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f59e0b' }}>{adminActionsData.insights.count}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>Insights</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316' }}>{adminActionsData.flagged.count}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>Flagged</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '8px 0', borderTop: '1px solid #e5e7eb' }}>
                    {adminActionsData.totalActions} total actions • Click to review
                  </div>
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: '13px' }}>Loading actions...</div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Admin Actions Modal */}
      {showAdminModal && (
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
        }} onClick={() => setShowAdminModal(false)}>
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
              maxWidth: '700px',
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '32px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>Admin Actions</h2>
              <button 
                onClick={() => setShowAdminModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
              >
                <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
              </button>
            </div>

            {/* Tab Navigation */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', borderBottom: '1px solid #e5e7eb', paddingBottom: '12px' }}>
              {['reviews', 'insights', 'flagged'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedAdminTab(tab as any)}
                  style={{
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: selectedAdminTab === tab ? '#1e3a8a' : '#6b7280',
                    fontWeight: selectedAdminTab === tab ? '600' : '500',
                    borderBottom: selectedAdminTab === tab ? '2px solid #1e3a8a' : 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({adminActionsData?.[tab]?.count || 0})
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ color: '#374151' }}>
              {selectedAdminTab === 'reviews' && (
                <div>
                  {adminActionsData?.reviews?.items && adminActionsData.reviews.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {adminActionsData.reviews.items.map((item: any, idx: number) => (
                        <div key={idx} style={{ padding: '12px', backgroundColor: '#fef2f2', borderRadius: '6px', borderLeft: '4px solid #dc2626' }}>
                          <div style={{ fontWeight: '600', color: '#dc2626', marginBottom: '4px' }}>{item.title}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{item.description}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Severity: {item.severity}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '14px' }}>No reviews needed ✓</div>
                  )}
                </div>
              )}

              {selectedAdminTab === 'insights' && (
                <div>
                  {adminActionsData?.insights?.items && adminActionsData.insights.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {adminActionsData.insights.items.map((item: any, idx: number) => (
                        <div key={idx} style={{ padding: '12px', backgroundColor: '#fffbeb', borderRadius: '6px', borderLeft: '4px solid #f59e0b' }}>
                          <div style={{ fontWeight: '600', color: '#f59e0b', marginBottom: '4px' }}>{item.title}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{item.description}</div>
                          <div style={{ fontSize: '12px', color: '#059669', marginBottom: '4px' }}>💡 {item.recommendation}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Severity: {item.severity}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '14px' }}>No insights available</div>
                  )}
                </div>
              )}

              {selectedAdminTab === 'flagged' && (
                <div>
                  {adminActionsData?.flagged?.items && adminActionsData.flagged.items.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {adminActionsData.flagged.items.map((item: any, idx: number) => (
                        <div key={idx} style={{ padding: '12px', backgroundColor: '#fff7ed', borderRadius: '6px', borderLeft: '4px solid #f97316' }}>
                          <div style={{ fontWeight: '600', color: '#f97316', marginBottom: '4px' }}>{item.title}</div>
                          <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{item.description}</div>
                          <div style={{ fontSize: '11px', color: '#9ca3af' }}>Severity: {item.severity}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: '14px' }}>No flagged items</div>
                  )}
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', padding: '16px 0', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAdminModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151'
                }}
              >
                Close
              </button>
              <button
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  backgroundColor: '#1e3a8a',
                  color: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Review All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

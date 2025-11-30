import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Home, BarChart3, Users, Briefcase, FileText, Settings, ChevronRight, X, MapPin  } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { sdgGoals, getSDGName, getSDGFullName, getSDGColor } from "@shared/sdg-goals";
import { useState } from "react";

interface CSRDashboardData {
  totalPartners: number;
  activeEmployees: number;
  totalHours: number;
  totalImpact: number;
  projectsCompleted: number;
  sdgScoreDelta: number;
  sdgProgress: Record<number, { goal: number; name: string; color: string; progress: number; status?: string }>;
  partners: Array<{ id: number; companyName: string; employees: number; hours: number; roi: number }>;
  challenges: Array<{ id: number; title: string; sdgGoal: number; progress: number; target: number; status: string }>;
  leaderboard: Array<{ rank: number; employeeName: string; hours: number; points: number }>;
  pendingActions: Array<{ type: string; orgName: string; description: string }>;
  projectLocations: Array<{ id: number; name: string; lat: number; lng: number; region: string; employees: number; hours: number; status: string }>;
}

export default function CSRDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const userId = localStorage.getItem('currentUserId');
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [selectedSDG, setSelectedSDG] = useState<number | null>(null);

  const { data: csrData, isLoading } = useQuery<CSRDashboardData>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch CSR dashboard");
      return response.json();
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
  });

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

  // SDG Chart Data with real SDG colors
  const sdgChartData = Object.values(csrData?.sdgProgress || {})
    .filter(sdg => sdg.status === 'committed' || sdg.status === 'active')
    .slice(0, 8)
    .map(sdg => {
      return {
        name: getSDGName(sdg.goal),
        fullName: getSDGFullName(sdg.goal),
        value: sdg.progress || 20,
        color: getSDGColor(sdg.goal),
        goal: sdg.goal
      };
    });

  // Default SDG data if none exists
  const defaultSdgData = [
    { name: "SDG 4", fullName: "Quality Education", value: 19, color: "#C5192D", goal: 4 },
    { name: "Climate Action", fullName: "Climate Action", value: 29, color: "#3F7E44", goal: 13 },
    { name: "SDG Ecore", fullName: "Life on Land", value: 18, color: "#56C02B", goal: 15 },
    { name: "SDG 13", fullName: "Climate Action", value: 18, color: "#3F7E44", goal: 13 },
    { name: "Climate Action", fullName: "Climate Action", value: 18, color: "#3F7E44", goal: 13 },
    { name: "SDG 4: Quality", fullName: "Quality Education", value: 22, color: "#C5192D", goal: 4 },
    { name: "SDG 13", fullName: "Climate Action", value: 22, color: "#3F7E44", goal: 13 },
  ];

  const chartData = sdgChartData.length > 0 ? sdgChartData : defaultSdgData;

  // Engagement funnel data
  const engagementFunnelData = [
    { stage: "+", count: "(15,900)", next: "Registered", nextCount: "" },
    { stage: "Eligible (1,500)", count: "", next: "(1,100)", nextCount: "Retained", final: "650" },
  ];

  // Pending admin actions
  const pendingActions = csrData?.pendingActions || [
    { type: "Review NGO", orgName: "Green Earth", description: "Pending approval" },
    { type: "Approve Impact", orgName: "Solarize Africa", description: "Awaiting review" },
    { type: "AI Flag", orgName: "Project Alpha", description: "Flagged for review" },
  ];

  // Region connection data for map
  const regionConnections = [
    { name: "Northie focpart", color: "#3B82F6" },
    { name: "Vrorsie neelto/soiken", color: "#3B82F6" },
    { name: "Hue qoysit", color: "#F97316" },
    { name: "Pot.upvsilla", color: "#22C55E" },
  ];

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
              <p style={{ fontSize: '30px', fontWeight: 'bold' }}>{csrData?.totalHours?.toLocaleString() || '12,450'}</p>
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
              <p style={{ fontSize: '30px', fontWeight: 'bold' }}>{csrData?.activeEmployees || '890'}</p>
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
              <p style={{ fontSize: '30px', fontWeight: 'bold' }}>{csrData?.projectsCompleted || '112'}</p>
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
              <p style={{ fontSize: '30px', fontWeight: 'bold' }}>+{csrData?.sdgScoreDelta || '15'}% <span style={{ fontSize: '18px', fontWeight: 'normal', color: '#d1d5db' }}>Q3</span></p>
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
                            <li style={{ marginBottom: '8px' }}>✓ Current Progress: {sdgProgress?.currentHours || 0} hours logged</li>
                            <li style={{ marginBottom: '8px' }}>✓ Target Hours: {sdgProgress?.targetHours || 'Not set'}</li>
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
                      {(csrData?.totalHours || 12450).toLocaleString()} hours
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      Total volunteer hours contributed across all employee participants in CSR initiatives.
                    </p>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Key Metrics:</p>
                      <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '8px' }}>✓ Average hours per employee: {csrData?.activeEmployees ? Math.round((csrData.totalHours || 12450) / csrData.activeEmployees) : 14} hours</li>
                        <li style={{ marginBottom: '8px' }}>✓ Active employee contributors: {csrData?.activeEmployees || 890}</li>
                        <li>✓ Total economic value: ${((csrData?.totalHours || 12450) * 35).toLocaleString()}</li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedKPI === 'employees' && (
                  <div style={{ color: '#374151' }}>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
                      {csrData?.activeEmployees || 890} employees
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      Unique employee participants engaged in volunteer activities through your CSR program.
                    </p>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Engagement Summary:</p>
                      <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '8px' }}>✓ Total hours logged: {(csrData?.totalHours || 12450).toLocaleString()}</li>
                        <li style={{ marginBottom: '8px' }}>✓ Projects supported: {csrData?.projectsCompleted || 112}</li>
                        <li>✓ Engagement rate: {csrData?.activeEmployees ? Math.round(((csrData.activeEmployees / 5000) * 100)) : 18}% of workforce</li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedKPI === 'projects' && (
                  <div style={{ color: '#374151' }}>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
                      {csrData?.projectsCompleted || 112} projects
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      Complete CSR projects with verified outcomes and impact tracking.
                    </p>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>Project Impact:</p>
                      <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '8px' }}>✓ Total ROI: ${(csrData?.totalImpact || 435750).toLocaleString()}</li>
                        <li style={{ marginBottom: '8px' }}>✓ Average ROI per project: ${(csrData?.totalImpact && csrData?.projectsCompleted ? Math.round((csrData.totalImpact / csrData.projectsCompleted)) : 3891).toLocaleString()}</li>
                        <li>✓ Employee hours invested: {(csrData?.totalHours || 12450).toLocaleString()}</li>
                      </ul>
                    </div>
                  </div>
                )}

                {selectedKPI === 'sdg' && (
                  <div style={{ color: '#374151' }}>
                    <p style={{ fontSize: '32px', fontWeight: 'bold', color: '#1e3a8a', marginBottom: '16px' }}>
                      +{csrData?.sdgScoreDelta || 15}% Q3 Performance
                    </p>
                    <p style={{ fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                      Quarter-over-quarter improvement in SDG goal alignment and progress across active initiatives.
                    </p>
                    <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>SDG Progress Metrics:</p>
                      <ul style={{ fontSize: '14px', listStyle: 'none', padding: 0, margin: 0 }}>
                        <li style={{ marginBottom: '8px' }}>✓ Active SDG commitments: {Object.keys(csrData?.sdgProgress || {}).length}</li>
                        <li style={{ marginBottom: '8px' }}>✓ Average SDG progress: {Math.round((Object.values(csrData?.sdgProgress || {}).reduce((sum: number, s: any) => sum + (s.progress || 0), 0) / Math.max(1, Object.keys(csrData?.sdgProgress || {}).length)))  }%</li>
                        <li>✓ Momentum: Strong growth trend in Q3 vs Q2</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Analytics Grid - 2x2 layout */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
            {/* Row 1, Col 1: SDG Alignment Dashboard - Partial Wheel */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px'
            }} data-testid="chart-sdg-alignment">
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>SDG Alignment Dashboard</h3>
              <div style={{ height: '300px', display: 'flex', flexDirection: 'column' }}>
                {/* Dynamic sizing based on projects and employees */}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        startAngle={180}
                        endAngle={-180}
                        innerRadius={Math.max(40, Math.min(60, (csrData?.projectsCompleted || 112) / 2))}
                        outerRadius={Math.max(70, Math.min(95, (csrData?.activeEmployees || 890) / 8))}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                        labelLine={true}
                        onClick={(data) => setSelectedSDG(data.goal)}
                      >
                        {chartData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.color}
                            style={{ cursor: 'pointer', opacity: selectedSDG === entry.goal ? 1 : 0.8 }}
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Progress']}
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: 'white' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#1e293b' }}>Avg Impact</p>
                    <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#f97316' }}>{Math.round((chartData.reduce((sum, d) => sum + d.value, 0) / chartData.length) || 20)}%</p>
                  </div>
                </div>
                
                {/* SDG Labels Legend - Interactive */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginTop: '12px', fontSize: '11px' }}>
                  {chartData.map((sdg, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setSelectedSDG(sdg.goal)}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '4px',
                        backgroundColor: selectedSDG === sdg.goal ? '#f0f4f8' : 'transparent',
                        border: selectedSDG === sdg.goal ? `1px solid ${sdg.color}` : '1px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', backgroundColor: sdg.color, flexShrink: 0 }} />
                      <span style={{ color: '#4b5563', fontWeight: '500' }}>{sdg.name}: {sdg.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Row 1, Col 2: Geographic Impact by Region - Project Map */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px'
            }} data-testid="chart-geographic-impact">
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin style={{ width: '16px', height: '16px' }} />
                Geographic Impact by Region
              </h3>
              <div style={{ height: '300px', borderRadius: '8px', overflow: 'hidden', position: 'relative', backgroundColor: '#f0f4f8' }}>
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
                  {(csrData?.projectLocations || []).length > 0 ? (
                    csrData.projectLocations.map((project) => {
                      const statusColor = project.status === 'active' ? '#1e3a8a' : project.status === 'completed' ? '#22c55e' : '#f97316';
                      return (
                        <div 
                        key={project.id}
                        onClick={() => setSelectedKPI(`project-${project.id}`)}
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '12px', 
                          backgroundColor: 'white', 
                          padding: '12px', 
                          borderRadius: '6px', 
                          border: `2px solid ${statusColor}`,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: selectedKPI === `project-${project.id}` ? 'scale(1.02)' : 'scale(1)',
                          boxShadow: selectedKPI === `project-${project.id}` ? '0 4px 12px rgba(0,0,0,0.1)' : 'none'
                        }}
                      >
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: statusColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '12px', flexShrink: 0 }}>
                            {project.employees}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '12px', fontWeight: '600', color: '#111827', margin: '0 0 4px 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{project.name}</p>
                            <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>{project.region}</p>
                          </div>
                          <div style={{ textAlign: 'right', fontSize: '11px', color: '#4b5563', flexShrink: 0 }}>
                            <div>{project.hours.toLocaleString()}h</div>
                            <div style={{ color: '#9ca3af' }}>{project.status}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontSize: '13px' }}>
                      No project locations mapped yet
                    </div>
                  )}
                </div>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '18px', fontWeight: 'bold' }}>+</span>
                <span style={{ color: '#6b7280' }}>(15,900)</span>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span>Registered</span>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span>1+ Project</span>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span style={{ fontWeight: '600' }}>890</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', marginTop: '12px', flexWrap: 'wrap' }}>
                <span>Eligible (1,500)</span>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span>(1,100)</span>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span>Retained</span>
                <ChevronRight style={{ width: '16px', height: '16px', color: '#9ca3af' }} />
                <span style={{ fontWeight: '600' }}>650</span>
              </div>
            </div>

            {/* Row 2, Col 2: Pending Admin Actions */}
            <div style={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb', 
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              padding: '16px'
            }} data-testid="chart-pending-actions">
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '12px' }}>Pending Admin Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingActions.map((action, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                    <ChevronRight style={{ width: '16px', height: '16px', color: '#2563eb' }} />
                    <span>{action.type}: {action.orgName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

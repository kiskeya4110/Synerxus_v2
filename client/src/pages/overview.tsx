import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Trophy, Target, TrendingUp, Users, Clock, FolderOpen, Award, ChevronRight, Check, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import OrganizationHeader from "@/components/layout/organization-header";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import Footer from "@/components/layout/footer";
import { SDG_GOALS } from "@shared/sdg-goals";
import type { User } from "@shared/schema";

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

const SDG_ICONS: Record<number, string> = {
  1: sdg1, 2: sdg2, 3: sdg3, 4: sdg4, 5: sdg5,
  6: sdg6, 7: sdg7, 8: sdg8, 9: sdg9, 10: sdg10,
  11: sdg11, 12: sdg12, 13: sdg13, 14: sdg14, 15: sdg15,
  16: sdg16, 17: sdg17,
};

export default function Overview() {
  const [, navigate] = useLocation();
  const userId = localStorage.getItem('currentUserId');

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) throw new Error("No user ID found");
      const response = await fetch(`/api/users/me?userId=${id}`);
      return response.json();
    },
    enabled: !!userId
  });

  const { data: dashboardData } = useQuery<any>({
    queryKey: ["/api/organization/dashboard", userId],
    queryFn: async () => {
      if (!userId) return null;
      const response = await fetch(`/api/organization/dashboard?userId=${userId}`);
      return response.ok ? response.json() : null;
    },
    enabled: !!userId
  });

  const { data: orgProfile } = useQuery<any>({
    queryKey: ["/api/intake/organization-profile", userId],
    enabled: !!userId && currentUser?.userType === 'organization'
  });

  const metrics = {
    totalHours: dashboardData?.keyMetrics?.totalHours || 0,
    volunteersEngaged: dashboardData?.keyMetrics?.activeVolunteers || 0,
    projectsCompleted: dashboardData?.projects?.filter((p: any) => p.status === 'Completed' || p.status?.toLowerCase() === 'completed').length || 0,
    activeProjects: dashboardData?.keyMetrics?.activeProjects || 0,
    sdgsAddressed: dashboardData?.keyMetrics?.sdgsAddressed || 0,
    livesTouched: dashboardData?.keyMetrics?.livesTouched || 0,
    completedProjects: dashboardData?.projects?.filter((p: any) => p.status === 'Completed' || p.status?.toLowerCase() === 'completed').length || 0,
  };

  const sdgContributions = dashboardData?.sdgDistribution || [];
  const organizationSDGs = orgProfile?.sdgGoals || [];

  const getCurrentQuarter = () => {
    const month = new Date().getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
  };

  const challengeProgress = Math.min(78, Math.round((metrics.totalHours / 500) * 100));

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <OrganizationHeader activeTab="overview" />
      
      <div className="md:hidden">
        <div
          style={{
            background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
            padding: '24px 16px 32px',
            borderBottomLeftRadius: '24px',
            borderBottomRightRadius: '24px',
          }}
        >
          <h1 style={{ color: 'white', fontSize: '24px', fontWeight: '700', marginBottom: '20px', textAlign: 'center' }}>
            Unlock Your Team's Potential
          </h1>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '16px',
                padding: '16px',
                color: 'white',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Target size={18} />
                <span style={{ fontSize: '12px', fontWeight: '600' }}>Monthly SDG Challenge:</span>
              </div>
              <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
                Tackle Climate Action!
              </p>
              
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    border: '4px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(255,255,255,0.1)',
                  }}
                >
                  <span style={{ fontSize: '24px', fontWeight: '700' }}>{challengeProgress}%</span>
                  <span style={{ fontSize: '10px' }}>Complete</span>
                </div>
              </div>
              
              <p style={{ fontSize: '12px', textAlign: 'center', marginBottom: '12px' }}>
                {metrics.totalHours} Volunteer Hours
              </p>
              
              <Button
                size="sm"
                onClick={() => navigate('/sdg-mapping')}
                style={{
                  width: '100%',
                  backgroundColor: 'white',
                  color: '#16a34a',
                  fontWeight: '600',
                  borderRadius: '8px',
                }}
                data-testid="button-view-challenge"
              >
                View Challenge
              </Button>
            </div>

            <div
              style={{
                background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
                borderRadius: '16px',
                padding: '16px',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600' }}>{getCurrentQuarter()} Impact Leaderboard:</span>
                <Trophy size={18} style={{ color: '#fbbf24' }} />
              </div>
              <p style={{ fontSize: '14px', fontWeight: '700', marginBottom: '12px' }}>
                Soar to the Top!
              </p>
              
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', marginBottom: '4px' }}>• Top Teams:</p>
                <p style={{ fontSize: '11px', paddingLeft: '12px' }}>1. Alpha Squad</p>
                <p style={{ fontSize: '11px', paddingLeft: '12px' }}>2. Impact Heroes</p>
              </div>
              
              <Button
                size="sm"
                onClick={() => navigate('/organization-leaderboard')}
                style={{
                  width: '100%',
                  backgroundColor: '#22c55e',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '8px',
                }}
                data-testid="button-view-leaderboard"
              >
                View Leaderboard
              </Button>
            </div>
          </div>
        </div>

        <div style={{ padding: '16px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '16px',
                padding: '16px',
                color: 'white',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>Total Volunteer Hours Logged</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <span style={{ fontSize: '32px', fontWeight: '700' }}>{metrics.totalHours.toLocaleString()}</span>
                <div>
                  <span style={{ fontSize: '24px', fontWeight: '700' }}>{metrics.volunteersEngaged}</span>
                  <p style={{ fontSize: '11px' }}>Employees Engaged</p>
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            >
              <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Projects</p>
              <span style={{ fontSize: '32px', fontWeight: '700', color: '#22c55e' }}>{metrics.activeProjects}</span>
              <p style={{ fontSize: '11px', color: '#6b7280' }}>Active</p>
            </div>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
              Your SDG Contributions
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '16px' }}>
              {Array.from({ length: 17 }, (_, i) => i + 1).map((sdgNum) => {
                const contribution = sdgContributions.find((c: any) => c.goal === sdgNum);
                const isActive = organizationSDGs.includes(sdgNum) || (contribution && contribution.hours > 0);
                const sdgInfo = SDG_GOALS[sdgNum];
                
                return (
                  <div
                    key={sdgNum}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        border: isActive ? `3px solid ${sdgInfo?.color || '#22c55e'}` : '2px solid #e5e7eb',
                        opacity: isActive ? 1 : 0.5,
                        position: 'relative',
                      }}
                    >
                      <img
                        src={SDG_ICONS[sdgNum]}
                        alt={`SDG ${sdgNum}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      {isActive && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-4px',
                            right: '-4px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#22c55e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={10} style={{ color: 'white' }} />
                        </div>
                      )}
                    </div>
                    {contribution && contribution.hours > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-4px',
                          right: '4px',
                          fontSize: '10px',
                          fontWeight: '600',
                          backgroundColor: sdgInfo?.color || '#22c55e',
                          color: 'white',
                          padding: '2px 4px',
                          borderRadius: '8px',
                        }}
                      >
                        {contribution.hours}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* SDG Metrics Compilation */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              marginBottom: '12px',
            }}>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>SDGs Addressed</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>{metrics.sdgsAddressed}</p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Active Contributors</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                  {sdgContributions.filter((c: any) => c.hours > 0).length}
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Top SDG Goal</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  {sdgContributions.length > 0 
                    ? `SDG ${sdgContributions.reduce((max: any, curr: any) => 
                        (curr.hours > max.hours ? curr : max)).goal}`
                    : 'N/A'
                  }
                </p>
              </div>
              <div>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Total SDG Hours</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                  {sdgContributions.reduce((sum: number, c: any) => sum + (c.hours || 0), 0)}
                </p>
              </div>
            </div>
            
            <Button
              onClick={() => navigate('/sdg-mapping')}
              className="w-full"
              style={{
                backgroundColor: '#22c55e',
                color: 'white',
                fontWeight: '600',
              }}
              data-testid="button-view-all-sdgs"
            >
              View All SDGs <ChevronRight size={16} />
            </Button>
          </div>

          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Button
              onClick={() => navigate('/impact-visualization')}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              style={{ borderColor: '#22c55e', color: '#16a34a' }}
              data-testid="button-view-impact"
            >
              <TrendingUp size={24} />
              <span>View Impact</span>
            </Button>
            
            <Button
              onClick={() => navigate('/volunteers')}
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              style={{ borderColor: '#3b82f6', color: '#2563eb' }}
              data-testid="button-manage-team"
            >
              <Users size={24} />
              <span>Manage Team</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="hidden md:block max-w-7xl mx-auto p-6 pb-24">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Team Overview</h1>
        
        {/* Key Metrics Grid - 4 Columns */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-sm border border-green-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock size={20} className="text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Total Hours</span>
            </div>
            <p className="text-4xl font-bold text-green-600 mb-1">{(metrics.totalHours || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-600">Volunteer hours logged</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 shadow-sm border border-blue-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users size={20} className="text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Team Members</span>
            </div>
            <p className="text-4xl font-bold text-blue-600 mb-1">{metrics.volunteersEngaged || 0}</p>
            <p className="text-xs text-gray-600">Active volunteers</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-sm border border-purple-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FolderOpen size={20} className="text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Active Projects</span>
            </div>
            <p className="text-4xl font-bold text-purple-600 mb-1">{metrics.activeProjects || 0}</p>
            <p className="text-xs text-gray-600">In progress</p>
          </div>
          
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 shadow-sm border border-amber-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Target size={20} className="text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">SDGs Addressed</span>
            </div>
            <p className="text-4xl font-bold text-amber-600 mb-1">{metrics.sdgsAddressed || 0}</p>
            <p className="text-xs text-gray-600">Sustainable goals</p>
          </div>
        </div>

        {/* Secondary Metrics Row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-6 shadow-sm border border-rose-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Award size={20} className="text-rose-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Lives Touched</span>
            </div>
            <p className="text-3xl font-bold text-rose-600">{(dashboardData?.keyMetrics?.livesTouched || 0).toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 shadow-sm border border-teal-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <CheckSquare size={20} className="text-teal-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Completed Projects</span>
            </div>
            <p className="text-3xl font-bold text-teal-600">{metrics.projectsCompleted || 0}</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 shadow-sm border border-indigo-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp size={20} className="text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Impact Trend</span>
            </div>
            <p className="text-3xl font-bold text-indigo-600">↑ {Math.round(((dashboardData?.keyMetrics?.totalVolunteerHours || 1) / Math.max(1, (dashboardData?.keyMetrics?.totalVolunteerHours || 1) - 100)) * 10)}%</p>
          </div>
        </div>

        {/* SDG Contributions Section */}
        <div className="bg-white rounded-xl p-8 shadow-sm border mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">SDG Contributions</h2>
          <div className="grid grid-cols-9 gap-4">
            {Array.from({ length: 17 }, (_, i) => i + 1).map((sdgNum) => {
              const contribution = sdgContributions.find((c: any) => c.goal === sdgNum);
              const isActive = organizationSDGs.includes(sdgNum) || (contribution && contribution.hours > 0);
              
              return (
                <div key={sdgNum} className="flex flex-col items-center">
                  <div
                    className={`w-16 h-16 rounded-full overflow-hidden transition-all ${isActive ? 'ring-3 ring-green-500 shadow-lg' : 'opacity-40 ring-2 ring-gray-300'}`}
                  >
                    <img src={SDG_ICONS[sdgNum]} alt={`SDG ${sdgNum}`} className="w-full h-full object-cover" />
                  </div>
                  {contribution && contribution.hours > 0 && (
                    <div className="mt-2 text-center">
                      <span className="text-sm font-bold text-gray-900">{contribution.hours}h</span>
                      {contribution.volunteers && <p className="text-xs text-gray-600">{contribution.volunteers} vol</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}

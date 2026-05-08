import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { Trophy, Target, TrendingUp, Users, Clock, FolderOpen, Award, ChevronRight, Check, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import OrganizationNav from "@/components/layout/organization-nav";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import Footer from "@/components/layout/footer";
import { SDG_GOALS } from "@shared/sdg-goals";
import { useViewportDetection } from "@/hooks/use-mobile";
import AIInsightsModal from "@/components/organization/AIInsightsModal";
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
  const { isMobile, isLoading: isViewportLoading } = useViewportDetection();
  const [showAIInsightsModal, setShowAIInsightsModal] = useState(false);

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
    queryKey: ["/api/intake/organization-profile", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return null;
      const response = await fetch(`/api/intake/organization-profile?organizationId=${currentUser.organizationId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!currentUser?.organizationId && currentUser?.userType === 'organization'
  });

  // Fetch real leaderboard data from the organization
  const { data: leaderboardData } = useQuery<any[]>({
    queryKey: ["/api/organization-leaderboard", currentUser?.organizationId],
    queryFn: async () => {
      if (!currentUser?.organizationId) return [];
      const response = await fetch(
        `/api/organization-leaderboard?organizationId=${currentUser.organizationId}&type=hours&limit=3`
      );
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!currentUser?.organizationId,
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
  const organizationSDGs = orgProfile?.primarySdgs || orgProfile?.sdgGoals || [];

  const getCurrentQuarter = () => {
    const month = new Date().getMonth();
    if (month < 3) return 'Q1';
    if (month < 6) return 'Q2';
    if (month < 9) return 'Q3';
    return 'Q4';
  };

  const challengeProgress = Math.min(78, Math.round((metrics.totalHours / 500) * 100));

  // Use localStorage as fallback for PWA layout detection during initial load
  const userType = localStorage.getItem('userType');
  const isOrganization = currentUser?.userType === 'organization' || userType === 'organization';

  // Wait for viewport detection before rendering layout
  if (isViewportLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#faf9f7]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  // Mobile PWA View - Organizations only
  if (isOrganization && isMobile) {
    return (
      <OrganizationPWALayout activeTab="home">
        <div style={{ margin: '0 16px', paddingTop: '16px' }}>
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
                onClick={() => setShowAIInsightsModal(true)}
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
                Top Volunteers
              </p>

              <div style={{ marginBottom: '12px' }}>
                {leaderboardData && leaderboardData.length > 0 ? (
                  <>
                    <p style={{ fontSize: '11px', marginBottom: '4px' }}>• Top Performers:</p>
                    {leaderboardData.slice(0, 2).map((volunteer: any, index: number) => (
                      <p key={volunteer.userId} style={{ fontSize: '11px', paddingLeft: '12px' }}>
                        {index + 1}. {volunteer.displayName || 'Volunteer'} ({volunteer.totalHours}h)
                      </p>
                    ))}
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '11px', marginBottom: '4px' }}>• No data yet</p>
                    <p style={{ fontSize: '11px', paddingLeft: '12px', opacity: 0.7 }}>
                      Log volunteer activities to see rankings
                    </p>
                  </>
                )}
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

        {/* AI Impact Insights - Enhanced Panel */}
        <div style={{ margin: '16px 24px 0' }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '16px',
            color: 'white',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                ✨
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>AI Impact Insights</h3>
                <p style={{ fontSize: '10px', opacity: 0.8 }}>Personalized recommendations</p>
              </div>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '12px',
              marginBottom: '12px'
            }}>
              {sdgContributions.length > 0 ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px' }}>📊</span>
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>Performance Analysis</p>
                  </div>
                  <p style={{ fontSize: '11px', lineHeight: '1.5', opacity: 0.95, marginBottom: '8px' }}>
                    Your team is excelling in SDG {sdgContributions.reduce((max: any, curr: any) => (curr.hours > max.hours ? curr : max)).goal} with {Math.round(sdgContributions.reduce((max: any, curr: any) => (curr.hours > max.hours ? curr : max)).hours)} hours contributed.
                    {metrics.volunteersEngaged > 5
                      ? ` With ${metrics.volunteersEngaged} active volunteers, you're building strong momentum.`
                      : ` Consider recruiting more volunteers to amplify your impact.`
                    }
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', marginTop: '12px' }}>
                    <span style={{ fontSize: '16px' }}>💡</span>
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>Suggestions</p>
                  </div>
                  <ul style={{ fontSize: '11px', lineHeight: '1.6', opacity: 0.95, paddingLeft: '20px', margin: 0 }}>
                    {metrics.totalHours < 100 && (
                      <li style={{ marginBottom: '4px' }}>Increase volunteer engagement to reach 100+ hours this quarter</li>
                    )}
                    {metrics.sdgsAddressed < 3 && (
                      <li style={{ marginBottom: '4px' }}>Expand focus to additional SDGs to diversify your impact</li>
                    )}
                    {metrics.completedProjects < metrics.activeProjects && (
                      <li style={{ marginBottom: '4px' }}>Prioritize completing {metrics.activeProjects - metrics.completedProjects} ongoing projects</li>
                    )}
                    <li>Consider logging impact metrics regularly for better tracking</li>
                  </ul>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🚀</span>
                    <p style={{ fontSize: '12px', fontWeight: '600' }}>Get Started</p>
                  </div>
                  <p style={{ fontSize: '11px', lineHeight: '1.5', opacity: 0.95 }}>
                    Start contributing to SDGs to unlock personalized insights about your team's performance and impact recommendations.
                  </p>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate('/impact-report')}
                style={{
                  flex: 1,
                  backgroundColor: 'white',
                  color: '#667eea',
                  fontWeight: '600',
                  borderRadius: '8px',
                  padding: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
                data-testid="button-view-analysis"
              >
                View Full Analysis <ChevronRight size={14} />
              </button>
              <button
                onClick={() => navigate('/volunteer-leaderboard/pwa')}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: '600',
                  borderRadius: '8px',
                  padding: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
                data-testid="button-team-rankings"
              >
                <Trophy size={14} /> Rankings
              </button>
            </div>
          </div>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <button
              onClick={() => navigate('/impact-visualization')}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                borderRadius: '16px',
                padding: '16px',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
              data-testid="button-total-hours"
            >
              <p style={{ fontSize: '12px', fontWeight: '500', marginBottom: '4px' }}>Total Volunteer Hours Logged</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                <span style={{ fontSize: '32px', fontWeight: '700' }}>{metrics.totalHours.toLocaleString()}</span>
                <div>
                  <span style={{ fontSize: '24px', fontWeight: '700' }}>{metrics.volunteersEngaged}</span>
                  <p style={{ fontSize: '11px' }}>Participants</p>
                </div>
              </div>
              <p style={{ fontSize: '10px', marginTop: '8px', opacity: 0.8 }}>Tap to view details →</p>
            </button>

            <button
              onClick={() => navigate('/projects')}
              style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
              data-testid="button-projects-card"
            >
              <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Projects</p>
              <span style={{ fontSize: '32px', fontWeight: '700', color: '#22c55e' }}>{metrics.activeProjects}</span>
              <p style={{ fontSize: '11px', color: '#6b7280' }}>Active</p>
              <p style={{ fontSize: '10px', color: '#22c55e', marginTop: '4px' }}>View all →</p>
            </button>
          </div>

          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937', marginBottom: '16px' }}>
              Your SDG Contributions
            </h2>
            
            {organizationSDGs.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(organizationSDGs.length, 5)}, 1fr)`, gap: '8px', marginBottom: '16px' }}>
                {organizationSDGs.map((sdgNum: number) => {
                  const contribution = sdgContributions.find((c: any) => c.goal === sdgNum);
                  const hasContribution = contribution && contribution.hours > 0;
                  const sdgInfo = SDG_GOALS[sdgNum];

                  return (
                    <button
                      key={sdgNum}
                      onClick={() => navigate(`/sdg-mapping?sdg=${sdgNum}`)}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '8px',
                        transition: 'transform 0.2s, background-color 0.2s',
                      }}
                      onTouchStart={(e) => {
                        e.currentTarget.style.transform = 'scale(0.95)';
                        e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)';
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      data-testid={`sdg-button-${sdgNum}`}
                    >
                      <div
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          border: `3px solid ${sdgInfo?.color || '#22c55e'}`,
                          position: 'relative',
                        }}
                      >
                        <img
                          src={SDG_ICONS[sdgNum]}
                          alt={`SDG ${sdgNum}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {hasContribution && (
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
                      {hasContribution && (
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
                          {contribution.hours}h
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                <Target size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <p style={{ fontSize: '14px' }}>No SDGs committed yet</p>
                <button
                  onClick={() => navigate('/organization-profile-settings')}
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#22c55e',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  Set your SDG commitments →
                </button>
              </div>
            )}

            {/* SDG Metrics Compilation - Interactive */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              marginBottom: '12px',
            }}>
              <button
                onClick={() => navigate('/sdg-mapping')}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
                data-testid="button-sdgs-addressed"
              >
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>SDGs Addressed</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#22c55e' }}>{metrics.sdgsAddressed}</p>
              </button>
              <button
                onClick={() => navigate('/volunteers')}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
                data-testid="button-active-contributors"
              >
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Active Contributors</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6' }}>
                  {sdgContributions.filter((c: any) => c.hours > 0).length}
                </p>
              </button>
              <button
                onClick={() => {
                  const topSDG = sdgContributions.length > 0
                    ? sdgContributions.reduce((max: any, curr: any) => (curr.hours > max.hours ? curr : max)).goal
                    : 1;
                  navigate(`/sdg-mapping?sdg=${topSDG}`);
                }}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
                data-testid="button-top-sdg"
              >
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Top SDG Goal</p>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                  {sdgContributions.length > 0
                    ? `SDG ${sdgContributions.reduce((max: any, curr: any) =>
                        (curr.hours > max.hours ? curr : max)).goal}`
                    : 'N/A'
                  }
                </p>
              </button>
              <button
                onClick={() => navigate('/impact-visualization')}
                style={{
                  background: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
                onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
                data-testid="button-total-sdg-hours"
              >
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>Total SDG Hours</p>
                <p style={{ fontSize: '24px', fontWeight: '700', color: '#f59e0b' }}>
                  {sdgContributions.reduce((sum: number, c: any) => sum + (c.hours || 0), 0)}
                </p>
              </button>
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

          {/* Quick Action Buttons */}
          <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <button
              onClick={() => navigate('/impact-visualization')}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '14px 8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
              data-testid="button-view-impact"
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TrendingUp size={18} style={{ color: 'white' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>View Impact</span>
            </button>

            <button
              onClick={() => navigate('/volunteer-leaderboard/pwa')}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '14px 8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
              data-testid="button-leaderboard"
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Trophy size={18} style={{ color: 'white' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>Leaderboard</span>
            </button>

            <button
              onClick={() => navigate('/volunteers')}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '14px 8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = 'scale(1)'}
              data-testid="button-manage-team"
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Users size={18} style={{ color: 'white' }} />
              </div>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#374151' }}>Manage Team</span>
            </button>
          </div>
        </div>
        </div>

        {/* AI Insights Modal */}
        <AIInsightsModal
          isOpen={showAIInsightsModal}
          onClose={() => setShowAIInsightsModal(false)}
          organizationId={currentUser?.organizationId || 0}
          userId={currentUser?.id}
          dashboardData={dashboardData}
          orgProfile={orgProfile}
        />
      </OrganizationPWALayout>
    );
  }

  // Desktop View
  return (
    <div className="h-screen overflow-y-auto bg-slate-100" style={{ paddingBottom: '180px' }}>
      <OrganizationNav />

      <div className="max-w-7xl mx-auto p-6 pb-24">
        {/* Top Navigation Button */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => navigate('/my-work')}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
            style={{
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #d1d5db',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            data-testid="button-projects"
          >
            Projects
          </button>
        </div>
        
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Team Overview</h1>
        
        {/* Key Metrics Grid - 4 Columns - Interactive */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <button
            onClick={() => navigate('/impact-visualization')}
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 shadow-sm border border-green-200 text-left hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            data-testid="desktop-total-hours"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock size={20} className="text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Verified Hours</span>
            </div>
            <p className="text-4xl font-bold text-green-600 mb-1">{(metrics.totalHours || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-600">Volunteer hours logged</p>
          </button>

          <button
            onClick={() => navigate('/volunteers')}
            className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-6 shadow-sm border border-blue-200 text-left hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            data-testid="desktop-team-members"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users size={20} className="text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Team Members</span>
            </div>
            <p className="text-4xl font-bold text-blue-600 mb-1">{metrics.volunteersEngaged || 0}</p>
            <p className="text-xs text-gray-600">Active volunteers</p>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 shadow-sm border border-purple-200 text-left hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            data-testid="desktop-active-projects"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FolderOpen size={20} className="text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Active Projects</span>
            </div>
            <p className="text-4xl font-bold text-purple-600 mb-1">{metrics.activeProjects || 0}</p>
            <p className="text-xs text-gray-600">In progress</p>
          </button>

          <button
            onClick={() => navigate('/sdg-mapping')}
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 shadow-sm border border-amber-200 text-left hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            data-testid="desktop-sdgs-addressed"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Target size={20} className="text-amber-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">SDGs Addressed</span>
            </div>
            <p className="text-4xl font-bold text-amber-600 mb-1">{metrics.sdgsAddressed || 0}</p>
            <p className="text-xs text-gray-600">Sustainable goals</p>
          </button>
        </div>

        {/* Secondary Metrics Row - Interactive */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <button
            onClick={() => navigate('/impact-visualization')}
            className="bg-gradient-to-br from-rose-50 to-red-50 rounded-xl p-6 shadow-sm border border-rose-200 text-left hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            data-testid="desktop-aius-earned"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-rose-100 rounded-lg">
                <Award size={20} className="text-rose-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Impact Score</span>
            </div>
            <p className="text-3xl font-bold text-rose-600">{(dashboardData?.keyMetrics?.aiuEarned || dashboardData?.keyMetrics?.livesTouched || 0).toLocaleString()}</p>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-6 shadow-sm border border-teal-200 text-left hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            data-testid="desktop-completed-projects"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-teal-100 rounded-lg">
                <CheckSquare size={20} className="text-teal-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Completed Projects</span>
            </div>
            <p className="text-3xl font-bold text-teal-600">{metrics.projectsCompleted || 0}</p>
          </button>

          <button
            onClick={() => navigate('/impact-visualization')}
            className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 shadow-sm border border-indigo-200 text-left hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer"
            data-testid="desktop-impact-trend"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp size={20} className="text-indigo-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">Impact Trend</span>
            </div>
            <p className="text-3xl font-bold text-indigo-600">↑ {Math.round(((dashboardData?.keyMetrics?.totalVolunteerHours || 1) / Math.max(1, (dashboardData?.keyMetrics?.totalVolunteerHours || 1) - 100)) * 10)}%</p>
          </button>
        </div>

        {/* SDG Contributions Section - Interactive */}
        <div className="bg-white rounded-xl p-8 shadow-sm border mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">SDG Contributions</h2>
            <Button
              onClick={() => navigate('/sdg-mapping')}
              variant="outline"
              size="sm"
              className="text-green-600 border-green-600 hover:bg-green-50"
            >
              View All SDGs <ChevronRight size={16} />
            </Button>
          </div>
          {organizationSDGs.length > 0 ? (
            <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${Math.min(organizationSDGs.length, 9)}, 1fr)` }}>
              {organizationSDGs.map((sdgNum: number) => {
                const contribution = sdgContributions.find((c: any) => c.goal === sdgNum);
                const hasContribution = contribution && contribution.hours > 0;

                return (
                  <button
                    key={sdgNum}
                    onClick={() => navigate(`/sdg-mapping?sdg=${sdgNum}`)}
                    className="flex flex-col items-center cursor-pointer hover:scale-105 transition-transform"
                    data-testid={`desktop-sdg-${sdgNum}`}
                  >
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden transition-all ring-3 ring-green-500 shadow-lg"
                    >
                      <img src={SDG_ICONS[sdgNum]} alt={`SDG ${sdgNum}`} className="w-full h-full object-cover" />
                    </div>
                    {hasContribution && (
                      <div className="mt-2 text-center">
                        <span className="text-sm font-bold text-gray-900">{contribution.hours}h</span>
                        {contribution.volunteers && <p className="text-xs text-gray-600">{contribution.volunteers} vol</p>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No SDGs committed yet</p>
              <p className="text-sm text-gray-400 mt-1">Set your organization's SDG commitments to track your impact</p>
              <Button
                onClick={() => navigate('/organization-profile-settings')}
                variant="outline"
                size="sm"
                className="mt-4 text-green-600 border-green-600 hover:bg-green-50"
              >
                Set SDG Commitments
              </Button>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* AI Insights Modal */}
      <AIInsightsModal
        isOpen={showAIInsightsModal}
        onClose={() => setShowAIInsightsModal(false)}
        organizationId={currentUser?.organizationId || 0}
        userId={currentUser?.id}
        dashboardData={dashboardData}
        orgProfile={orgProfile}
      />
    </div>
  );
}

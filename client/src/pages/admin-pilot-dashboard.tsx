import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck, RefreshCw, ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/queryClient";
import Logo from "@/components/ui/logo";
import Footer from "@/components/layout/footer";

// ============================================
// TYPES
// ============================================

interface VerificationCountry {
  country: string;
  rate: number;
  outcomes: number;
  pending: number;
  hours: number;
  silentNGOs: number;
  orgCount: number;
}

interface RecentVerification {
  id: number;
  ngo: string;
  country: string;
  outcome: string;
  hours: number;
  volunteer: string;
  time: string;
  method: "app" | "sms";
}

interface CorporatePilot {
  id: number;
  name: string;
  outcomes: number;
  hours: number;
  countries: number;
  employees: number;
  status: "active" | "pilot" | "onboarding";
  health: "good" | "warning" | "new";
}

interface AuditMetric {
  label: string;
  value: number;
  target: number;
}

interface DashboardStats {
  totalVerifiedOutcomes: number;
  totalVerifiedHours: number;
  silentNGOs: number;
  totalPending: number;
  avgVerificationRate: number;
  totalVolunteers: number;
  totalOrganizations: number;
  totalActivities: number;
}

interface PilotDashboardData {
  stats: DashboardStats;
  verificationHealth: VerificationCountry[];
  recentVerifications: RecentVerification[];
  corporatePilots: CorporatePilot[];
  auditMetrics: AuditMetric[];
}

// ============================================
// LOCAL COMPONENTS
// ============================================

function ProgressRing({ value, target = 80, size = 100 }: { value: number; target?: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / 100, 1);
  const offset = circumference - progress * circumference;
  const color = value >= target ? '#10b981' : value >= 70 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center flex-shrink-0">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-white">{value}%</span>
        <span className="text-xs text-cyan-100">overall</span>
      </div>
    </div>
  );
}

type StatColor = "cyan" | "emerald" | "amber" | "violet";

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  sublabel?: string;
  trend?: number;
  color?: StatColor;
}

function StatCard({ icon, value, label, sublabel, trend, color = "cyan" }: StatCardProps) {
  const colorMap: Record<StatColor, string> = {
    cyan: "bg-cyan-50 text-cyan-600 border border-cyan-200",
    emerald: "bg-emerald-50 text-emerald-600 border border-emerald-200",
    amber: "bg-amber-50 text-amber-600 border border-amber-200",
    violet: "bg-violet-50 text-violet-600 border border-violet-200",
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colorMap[color]}`}>
          {icon}
        </div>
        {trend !== undefined && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className="text-3xl font-bold text-slate-800">{value}</div>
        <div className="text-sm text-slate-600 mt-1">{label}</div>
        {sublabel && <div className="text-xs text-slate-400 mt-0.5">{sublabel}</div>}
      </div>
    </div>
  );
}

function VerificationFeed({ items }: { items: RecentVerification[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-sm">No verifications yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
            item.method === 'sms' ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'
          }`}>
            {item.method === 'sms' ? '📱' : '✓'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-800 truncate text-sm">{item.ngo}</span>
              <span className="text-xs text-slate-400 flex-shrink-0">{item.country}</span>
            </div>
            <div className="text-sm text-slate-600 truncate">{item.outcome}</div>
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 inline-block"></span>
                {item.hours}h verified
              </span>
              <span>{item.volunteer}</span>
              <span>{item.time}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CountryRow({ data }: { data: VerificationCountry }) {
  const getStatusStyle = (rate: number) => {
    if (rate >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (rate >= 70) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  };

  const style = getStatusStyle(data.rate);

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${style.border} ${style.bg} hover:shadow-sm transition-all`}>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm">{data.country}</div>
        <div className="text-xs text-slate-500">
          {data.orgCount > 0 ? `${data.orgCount} NGO${data.orgCount !== 1 ? 's' : ''}` : ''}
          {data.silentNGOs > 0 ? ` · ${data.silentNGOs} silent` : ''}
        </div>
      </div>
      <div className="text-center px-3 flex-shrink-0">
        <div className={`text-xl font-bold ${style.text}`}>{data.rate}%</div>
        <div className="text-xs text-slate-500">verified</div>
      </div>
      <div className="text-center px-3 border-l border-slate-200 flex-shrink-0">
        <div className="text-lg font-semibold text-emerald-700">{data.outcomes}</div>
        <div className="text-xs text-slate-500">approved</div>
      </div>
      {data.pending > 0 && (
        <div className="text-center px-3 border-l border-slate-200 flex-shrink-0">
          <div className="text-lg font-semibold text-violet-600">{data.pending}</div>
          <div className="text-xs text-slate-500">pending</div>
        </div>
      )}
      <div className="text-center px-3 border-l border-slate-200 flex-shrink-0">
        <div className="text-lg font-semibold text-slate-700">{data.hours}h</div>
        <div className="text-xs text-slate-500">hours</div>
      </div>
    </div>
  );
}

type PilotHealth = "good" | "warning" | "new";
type PilotStatus = "active" | "pilot" | "onboarding";

function PilotCard({ pilot }: { pilot: CorporatePilot }) {
  const healthStyles: Record<PilotHealth, string> = {
    good: 'border-emerald-200 bg-emerald-50',
    warning: 'border-amber-200 bg-amber-50',
    new: 'border-slate-200 bg-slate-50',
  };

  const statusBadgeStyles: Record<PilotStatus, string> = {
    active: 'bg-emerald-100 text-emerald-700',
    pilot: 'bg-amber-100 text-amber-700',
    onboarding: 'bg-slate-200 text-slate-600',
  };

  return (
    <div className={`p-4 rounded-xl border-2 ${healthStyles[pilot.health]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="font-semibold text-slate-800 text-sm truncate mr-2">{pilot.name}</span>
        <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${statusBadgeStyles[pilot.status]}`}>
          {pilot.status}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xl font-bold text-slate-800">{pilot.outcomes}</div>
          <div className="text-xs text-slate-500">outcomes</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-800">{pilot.hours}h</div>
          <div className="text-xs text-slate-500">hours</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-800">{pilot.employees}</div>
          <div className="text-xs text-slate-500">employees</div>
        </div>
      </div>
      {pilot.outcomes > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 inline-block"></span>
          Outputs and hours partner-confirmed for review
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 animate-pulse">
      <div className="h-10 w-10 bg-slate-200 rounded-xl mb-4" />
      <div className="h-8 w-24 bg-slate-200 rounded mb-2" />
      <div className="h-4 w-32 bg-slate-100 rounded" />
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function AdminPilotDashboard() {
  const [, navigate] = useLocation();
  const { dbUser, loading: authLoading } = useAuth();

  const { data, isLoading, isError, refetch, dataUpdatedAt } = useQuery<PilotDashboardData>({
    queryKey: ["/api/pilot-dashboard"],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      headers["Content-Type"] = "application/json";
      const res = await fetch("/api/pilot-dashboard", { headers });
      if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`);
      return res.json();
    },
    enabled: !authLoading && !!dbUser && !!dbUser.isAdmin,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (dbUser && !dbUser.isAdmin) {
    navigate("/dashboard");
    return null;
  }

  const stats = data?.stats;
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <button
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Back to dashboard"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                </button>
              </Link>
              <Logo size="sm" variant="full" />
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <div className="w-7 h-7 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm font-semibold text-cyan-700">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-500">Last updated</div>
                <div className="text-sm font-medium text-slate-700">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
                </div>
              </div>
              <button
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => refetch()}
                aria-label="Refresh"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {isError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            Failed to load dashboard data. <button onClick={() => refetch()} className="underline">Retry</button>
          </div>
        )}

        {/* Target Banner */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-2xl p-6 mb-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-cyan-100 text-sm font-medium mb-1 tracking-wide uppercase">
                Make-or-Break Metric
              </div>
              <div className="text-xl font-bold">Partner confirmation rate ≥80% within 72 hours</div>
              <div className="text-cyan-100 text-sm mt-2">
                Outputs and supporting hours are partner-confirmed as structured evidence for ESG reporting preparation
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-cyan-100">
                <span><span className="font-bold text-white">{stats?.totalActivities ?? 0}</span> total activities</span>
                <span>·</span>
                <span><span className="font-bold text-white">{stats?.totalVolunteers ?? 0}</span> volunteers</span>
                <span>·</span>
                <span><span className="font-bold text-white">{stats?.totalOrganizations ?? 0}</span> NGOs</span>
              </div>
            </div>
            <ProgressRing value={stats?.avgVerificationRate ?? 0} target={80} size={100} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <StatCard
                icon="✓"
                value={stats?.totalVerifiedOutcomes ?? 0}
                label="Verified Outputs"
                sublabel="partner-confirmed"
                color="emerald"
              />
              <StatCard
                icon="⏱"
                value={`${stats?.totalVerifiedHours ?? 0}h`}
                label="Confirmed Hours"
                sublabel="partner-confirmed (from self-reported)"
                color="cyan"
              />
              <StatCard
                icon="📋"
                value={stats?.totalPending ?? 0}
                label="Pending Verification"
                sublabel="Awaiting partner confirmation"
                color="violet"
              />
              <StatCard
                icon="⚠️"
                value={stats?.silentNGOs ?? 0}
                label="Silent NGOs"
                sublabel="No verification in 14+ days"
                color="amber"
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Country Health + Live Verifications */}
          <div className="lg:col-span-2 space-y-6">

            {/* Verification Health by Country */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Verification Health</h2>
                  <p className="text-sm text-slate-500">By country · outcomes + hours shown together</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>≥80%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>70–79%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>&lt;70%
                  </span>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (data?.verificationHealth?.length ?? 0) === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-sm">No activity data yet</p>
                  <p className="text-xs mt-1">Verification health will appear once volunteers log activities</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data!.verificationHealth.map((country, i) => (
                    <CountryRow key={i} data={country} />
                  ))}
                </div>
              )}
            </div>

            {/* Live Verification Feed */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Live Verifications</h2>
                  <p className="text-sm text-slate-500">Real-time partner confirmations</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-600 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                  Live
                </span>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (
                <VerificationFeed items={data?.recentVerifications ?? []} />
              )}
            </div>
          </div>

          {/* Right Column: Corporate Pilots + Audit */}
          <div className="space-y-6">

            {/* Corporate Pilots */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Corporate Pilots</h2>
                <p className="text-sm text-slate-500">Path to $8K–$40K/year</p>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : (data?.corporatePilots?.length ?? 0) === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <p className="text-sm">No corporate pilots yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data!.corporatePilots.map((pilot) => (
                    <PilotCard key={pilot.id} pilot={pilot} />
                  ))}
                </div>
              )}
            </div>

            {/* Audit Trail Integrity */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Audit Trail Integrity</h2>
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-6 bg-slate-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(data?.auditMetrics ?? []).map((metric, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-slate-600 flex-1">{metric.label}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${metric.value >= metric.target ? 'bg-emerald-500' : 'bg-amber-500'}`}
                            style={{ width: `${metric.value}%` }}
                          />
                        </div>
                        <span className={`text-sm font-medium w-10 text-right ${
                          metric.value >= metric.target ? 'text-emerald-600' : 'text-amber-600'
                        }`}>
                          {metric.value}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                <strong>Evidence record:</strong> Outcome text + hours + authorized verifier + timestamp + region
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-slate-400 pb-4">
          <p>Every element either diagnoses <em>why verification is low</em> or proves <em>value to corporate pilots</em>.</p>
          <p className="mt-1 text-xs">
            Hours are <strong>partner-confirmed</strong> alongside outputs, not self-reported. Both are structured for review.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}

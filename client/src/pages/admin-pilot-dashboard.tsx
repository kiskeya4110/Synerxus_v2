import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShieldCheck, RefreshCw, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

// ============================================
// TYPES
// ============================================

interface VerificationCountry {
  country: string;
  code: string;
  flag: string;
  rate: number;
  outcomes: number;
  hours: number;
  silentNGOs: number;
  smsSuccess: number;
  pdfDownloads: number;
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

interface ActionItem {
  id: number;
  ngo: string;
  country: string;
  barrier: string;
  action: string;
  priority: "high" | "medium" | "low";
  type: "nudge" | "technical" | "onboard" | "remind";
}

interface CorporatePilot {
  name: string;
  outcomes: number;
  hours: number;
  countries: number;
  beneficiaries: number;
  status: "active" | "pilot" | "onboarding";
  health: "good" | "warning" | "new";
}

// ============================================
// SAMPLE DATA - Replace with API calls
// ============================================

const verificationData: VerificationCountry[] = [
  { country: "Zambia", code: "ZM", flag: "🇿🇲", rate: 82, outcomes: 47, hours: 312, silentNGOs: 2, smsSuccess: 94, pdfDownloads: 28 },
  { country: "Philippines", code: "PH", flag: "🇵🇭", rate: 76, outcomes: 34, hours: 198, silentNGOs: 4, smsSuccess: 88, pdfDownloads: 19 },
  { country: "Zimbabwe", code: "ZW", flag: "🇿🇼", rate: 58, outcomes: 12, hours: 67, silentNGOs: 7, smsSuccess: 71, pdfDownloads: 5 },
  { country: "Mexico", code: "MX", flag: "🇲🇽", rate: 89, outcomes: 56, hours: 389, silentNGOs: 1, smsSuccess: 96, pdfDownloads: 41 },
  { country: "Haiti", code: "HT", flag: "🇭🇹", rate: 42, outcomes: 8, hours: 43, silentNGOs: 8, smsSuccess: 63, pdfDownloads: 2 },
];

const recentVerifications: RecentVerification[] = [
  { id: 1, ngo: "Lusaka Youth Initiative", country: "ZM", outcome: "Built donor reporting dashboard", hours: 6, volunteer: "M. Santos", time: "2 min ago", method: "app" },
  { id: 2, ngo: "Manila Health Collective", country: "PH", outcome: "Designed vaccination tracking system", hours: 12, volunteer: "J. Rivera", time: "8 min ago", method: "sms" },
  { id: 3, ngo: "Hope Foundation", country: "ZM", outcome: "Financial literacy curriculum", hours: 8, volunteer: "A. Mensah", time: "23 min ago", method: "app" },
  { id: 4, ngo: "Oaxaca Education", country: "MX", outcome: "Grant proposal for USAID", hours: 15, volunteer: "C. Delgado", time: "41 min ago", method: "app" },
  { id: 5, ngo: "Port-au-Prince Tech", country: "HT", outcome: "Website redesign", hours: 20, volunteer: "P. Jean", time: "1h ago", method: "sms" },
];

const initialActionQueue: ActionItem[] = [
  { id: 1, ngo: "Harare Education Trust", country: "ZW", barrier: "No verification in 14 days", action: "Send Value Flip reminder", priority: "high", type: "nudge" },
  { id: 2, ngo: "Rural Tech PH", country: "PH", barrier: "SMS delivery failing", action: "Switch to WhatsApp", priority: "high", type: "technical" },
  { id: 3, ngo: "Cap-Haïtien Youth", country: "HT", barrier: "Never posted project need", action: "Draft + send project template", priority: "medium", type: "onboard" },
  { id: 4, ngo: "Copperbelt Women", country: "ZM", barrier: "Volunteer completed, awaiting verify", action: "Auto-SMS reminder", priority: "low", type: "remind" },
];

const corporatePilots: CorporatePilot[] = [
  { name: "TechCorp (B Corp)", outcomes: 24, hours: 156, countries: 4, beneficiaries: 1240, status: "active", health: "good" },
  { name: "GreenEnergy Inc", outcomes: 12, hours: 78, countries: 2, beneficiaries: 580, status: "active", health: "good" },
  { name: "HealthFirst", outcomes: 3, hours: 18, countries: 1, beneficiaries: 120, status: "pilot", health: "warning" },
  { name: "SMUD (via SHINE)", outcomes: 0, hours: 0, countries: 0, beneficiaries: 0, status: "onboarding", health: "new" },
];

const auditMetrics = [
  { label: "Full audit trail (outcome + hours)", value: 98, target: 100 },
  { label: "Timestamp accuracy (±5 min)", value: 100, target: 100 },
  { label: "SDG auto-mapping", value: 94, target: 100 },
  { label: "NGO identity verified", value: 100, target: 100 },
];

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
        <span className="text-xs text-cyan-100">avg rate</span>
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

function CountryRow({ data, onAction }: { data: VerificationCountry; onAction: (d: VerificationCountry) => void }) {
  const getStatusStyle = (rate: number) => {
    if (rate >= 80) return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    if (rate >= 70) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  };

  const style = getStatusStyle(data.rate);

  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${style.border} ${style.bg} hover:shadow-sm transition-all`}>
      <div className="text-2xl flex-shrink-0">{data.flag}</div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-800 text-sm">{data.country}</div>
        <div className="text-xs text-slate-500">{data.silentNGOs} silent NGO{data.silentNGOs !== 1 ? 's' : ''}</div>
      </div>
      <div className="text-center px-3 flex-shrink-0">
        <div className={`text-xl font-bold ${style.text}`}>{data.rate}%</div>
        <div className="text-xs text-slate-500">verify rate</div>
      </div>
      <div className="text-center px-3 border-l border-slate-200 flex-shrink-0">
        <div className="text-lg font-semibold text-slate-700">{data.outcomes}</div>
        <div className="text-xs text-slate-500">outcomes</div>
      </div>
      <div className="text-center px-3 border-l border-slate-200 flex-shrink-0">
        <div className="text-lg font-semibold text-slate-700">{data.hours}h</div>
        <div className="text-xs text-slate-500">hours</div>
      </div>
      <div className="text-center px-3 border-l border-slate-200 flex-shrink-0">
        <div className="text-lg font-semibold text-violet-600">{data.pdfDownloads}</div>
        <div className="text-xs text-slate-500">PDFs ↓</div>
      </div>
      {data.rate < 70 && (
        <button
          onClick={() => onAction(data)}
          className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors flex-shrink-0"
        >
          Fix Now
        </button>
      )}
    </div>
  );
}

type PriorityLevel = "high" | "medium" | "low";
type ActionType = "nudge" | "technical" | "onboard" | "remind";

function ActionCard({ item, onComplete }: { item: ActionItem; onComplete: (id: number) => void }) {
  const priorityStyles: Record<PriorityLevel, string> = {
    high: 'border-l-red-500 bg-red-50',
    medium: 'border-l-amber-500 bg-amber-50',
    low: 'border-l-slate-300 bg-slate-50',
  };

  const typeIcons: Record<ActionType, string> = {
    nudge: '📨',
    technical: '🔧',
    onboard: '📋',
    remind: '⏰',
  };

  const priorityBadgeStyles: Record<PriorityLevel, string> = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-200 text-slate-600',
  };

  return (
    <div className={`border-l-4 ${priorityStyles[item.priority]} p-4 rounded-r-xl`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg flex-shrink-0">{typeIcons[item.type]}</span>
          <div className="min-w-0">
            <div className="font-medium text-slate-800 text-sm">{item.ngo}</div>
            <div className="text-xs text-slate-500 truncate">{item.country} • {item.barrier}</div>
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${priorityBadgeStyles[item.priority]}`}>
          {item.priority}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-sm text-cyan-700 font-medium truncate">→ {item.action}</span>
        <button
          onClick={() => onComplete(item.id)}
          className="px-3 py-1.5 bg-cyan-600 text-white text-xs font-medium rounded-lg hover:bg-cyan-700 transition-colors flex-shrink-0"
        >
          Do It
        </button>
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
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-xl font-bold text-slate-800">{pilot.outcomes}</div>
          <div className="text-xs text-slate-500">outcomes</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-800">{pilot.hours}h</div>
          <div className="text-xs text-slate-500">hours</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-800">{pilot.countries}</div>
          <div className="text-xs text-slate-500">countries</div>
        </div>
        <div>
          <div className="text-xl font-bold text-slate-800">{pilot.beneficiaries.toLocaleString()}</div>
          <div className="text-xs text-slate-500">beneficiaries</div>
        </div>
      </div>
      {pilot.outcomes > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-500 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 inline-block"></span>
          Both outcomes + hours NGO-verified (audit-ready)
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN DASHBOARD
// ============================================

export default function AdminPilotDashboard() {
  const [, navigate] = useLocation();
  const { dbUser, loading: authLoading } = useAuth();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [actions, setActions] = useState<ActionItem[]>(initialActionQueue);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && dbUser && !(dbUser as any).isAdmin) {
      navigate("/dashboard");
    }
  }, [authLoading, dbUser, navigate]);

  // Auto-refresh timestamp every minute
  useEffect(() => {
    const interval = setInterval(() => setLastUpdated(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Aggregated stats
  const totalOutcomes = verificationData.reduce((sum, d) => sum + d.outcomes, 0);
  const totalHours = verificationData.reduce((sum, d) => sum + d.hours, 0);
  const totalPDFs = verificationData.reduce((sum, d) => sum + d.pdfDownloads, 0);
  const avgRate = Math.round(verificationData.reduce((sum, d) => sum + d.rate, 0) / verificationData.length);
  const totalSilent = verificationData.reduce((sum, d) => sum + d.silentNGOs, 0);

  const handleCompleteAction = (id: number) => {
    setActions(prev => prev.filter(a => a.id !== id));
  };

  const handleCountryAction = (country: VerificationCountry) => {
    // TODO: Wire to intervention flow API
    console.log("Opening fix flow for", country.country);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600" />
      </div>
    );
  }

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
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">Synerxus Admin</h1>
                <p className="text-xs text-slate-500">MVP Pilot Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-slate-500">Last updated</div>
                <div className="text-sm font-medium text-slate-700">{lastUpdated.toLocaleTimeString()}</div>
              </div>
              <button
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => setLastUpdated(new Date())}
                aria-label="Refresh"
              >
                <RefreshCw className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Target Banner */}
        <div className="bg-gradient-to-r from-cyan-600 to-cyan-700 rounded-2xl p-6 mb-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-cyan-100 text-sm font-medium mb-1 tracking-wide uppercase">
                Make-or-Break Metric
              </div>
              <div className="text-xl font-bold">NGO verification rate ≥80% within 72 hours</div>
              <div className="text-cyan-100 text-sm mt-2">
                Both outcomes AND hours are NGO-verified in a single tap — audit-ready for ESG reporting
              </div>
            </div>
            <ProgressRing value={avgRate} target={80} size={100} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon="✓"
            value={totalOutcomes}
            label="Verified Outcomes"
            sublabel="NGO-confirmed"
            trend={12}
            color="emerald"
          />
          <StatCard
            icon="⏱"
            value={`${totalHours}h`}
            label="Verified Hours"
            sublabel="NGO-confirmed (not self-reported)"
            trend={8}
            color="cyan"
          />
          <StatCard
            icon="📄"
            value={totalPDFs}
            label="Value Flip PDFs"
            sublabel="Downloaded by NGOs"
            trend={24}
            color="violet"
          />
          <StatCard
            icon="⚠️"
            value={totalSilent}
            label="Silent NGOs"
            sublabel="No verification in 14+ days"
            trend={-3}
            color="amber"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Country Health + Action Queue */}
          <div className="lg:col-span-2 space-y-6">

            {/* Verification Health by Country */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Verification Health</h2>
                  <p className="text-sm text-slate-500">By country • Outcomes + hours shown together</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>≥80%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>70-79%
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>&lt;70%
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                {[...verificationData]
                  .sort((a, b) => a.rate - b.rate)
                  .map((country, i) => (
                    <CountryRow key={i} data={country} onAction={handleCountryAction} />
                  ))}
              </div>
            </div>

            {/* Action Queue */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Your Action Queue</h2>
                  <p className="text-sm text-slate-500">Friction removal tasks — YOU fix it, not the NGO</p>
                </div>
                <span className="bg-cyan-100 text-cyan-700 text-sm font-medium px-3 py-1 rounded-full flex-shrink-0">
                  {actions.length} pending
                </span>
              </div>
              {actions.length > 0 ? (
                <div className="space-y-3">
                  {actions.map((item) => (
                    <ActionCard key={item.id} item={item} onComplete={handleCompleteAction} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400">
                  <span className="text-4xl">🎉</span>
                  <p className="mt-2">All actions complete!</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Feed + Pilots + Audit */}
          <div className="space-y-6">

            {/* Live Verification Feed */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800">Live Verifications</h2>
                  <p className="text-sm text-slate-500">Real-time NGO confirmations</p>
                </div>
                <span className="flex items-center gap-1 text-xs text-emerald-600 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                  Live
                </span>
              </div>
              <VerificationFeed items={recentVerifications} />
            </div>

            {/* Corporate Pilots */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Corporate Pilots</h2>
                <p className="text-sm text-slate-500">Path to $8K–$40K/year</p>
              </div>
              <div className="space-y-3">
                {corporatePilots.map((pilot, i) => (
                  <PilotCard key={i} pilot={pilot} />
                ))}
              </div>
            </div>

            {/* Audit Trail Integrity */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">Audit Trail Integrity</h2>
              <div className="space-y-3">
                {auditMetrics.map((metric, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="text-sm text-slate-600 flex-1">{metric.label}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-20 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${metric.value >= metric.target ? 'bg-emerald-500' : 'bg-amber-500'}`}
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
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-500">
                <strong>Full audit trail:</strong> Outcome text + hours + NGO name + timestamp + device ID + geolocation
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-slate-400 pb-4">
          <p>Every element either diagnoses <em>why verification is low</em> or proves <em>value to corporate pilots</em>.</p>
          <p className="mt-1 text-xs">
            Hours are <strong>NGO-verified</strong> alongside outcomes — not self-reported. Both are audit-ready.
          </p>
        </div>
      </main>
    </div>
  );
}

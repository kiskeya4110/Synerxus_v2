import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  RefreshCw, LogOut, Download, Filter,
  CheckCircle, Globe, Calendar, ChevronDown, ChevronUp,
  MapPin, Image as ImageIcon, X
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Logo from "@/components/ui/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { format } from "date-fns";

interface VerifiedOutcome {
  id: number;
  outcomeText: string | null;
  outcomeType: string | null;
  outcomeQuantity: number | null;
  sdgTags: number[];
  hours: number | null;
  date: string;
  verifiedAt: string | null;
  ngoName: string;
  verifierName: string | null;
  volunteerName: string;
  projectName: string;
  projectId: number | null;
  evidenceUrls: string[] | null;
  geolocation: any | null;
}

interface VerifiedOutcomesResponse {
  summary: {
    totalVerifiedOutcomes: number;
    sdgsCovered: number[];
    dateRange: {
      earliest: string | null;
      latest: string | null;
    };
  };
  logs: VerifiedOutcome[];
}

export default function CSRDashboardPWA() {
  const [, navigate] = useLocation();
  const { user: firebaseUser, signOut } = useAuth();

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterSdg, setFilterSdg] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterOutcomeType, setFilterOutcomeType] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  const userId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const url = userId ? `/api/users/me?userId=${userId}` : '/api/users/me';
      const res = await fetch(url);
      return res.ok ? res.json() : null;
    },
  });

  // Build query string for filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (userId) params.set("corporate_id", userId);
    if (filterSdg) params.set("sdg", filterSdg);
    if (filterProject) params.set("project_id", filterProject);
    if (filterOutcomeType) params.set("outcome_type", filterOutcomeType);
    if (filterStartDate) params.set("start_date", filterStartDate);
    if (filterEndDate) params.set("end_date", filterEndDate);
    return params.toString();
  }, [userId, filterSdg, filterProject, filterOutcomeType, filterStartDate, filterEndDate]);

  // Fetch confirmed activity records
  const { data: outcomesData, isLoading, refetch } = useQuery<VerifiedOutcomesResponse>({
    queryKey: ["/api/logs/corporate-verified", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/logs/corporate-verified?${queryParams}`);
      if (!res.ok) {
        // Fallback: try the generic logs endpoint with corporate filter
        const fallbackRes = await fetch(`/api/logs?corporate_id=${userId}&status=approved`);
        if (!fallbackRes.ok) return { summary: { totalVerifiedOutcomes: 0, sdgsCovered: [], dateRange: { earliest: null, latest: null } }, logs: [] };
        const logs = await fallbackRes.json();
        return {
          summary: {
            totalVerifiedOutcomes: Array.isArray(logs) ? logs.length : 0,
            sdgsCovered: [],
            dateRange: { earliest: null, latest: null }
          },
          logs: Array.isArray(logs) ? logs : []
        };
      }
      return res.json();
    },
    enabled: !!userId,
    refetchInterval: 60000,
  });

  const outcomes = outcomesData?.logs || [];
  const summary = outcomesData?.summary || { totalVerifiedOutcomes: 0, sdgsCovered: [], dateRange: { earliest: null, latest: null } };

  // Get unique projects and outcome types for filter dropdowns
  const uniqueProjects = useMemo(() => {
    const map = new Map<number, string>();
    outcomes.forEach(o => { if (o.projectId && o.projectName) map.set(o.projectId, o.projectName); });
    return Array.from(map.entries());
  }, [outcomes]);

  const uniqueOutcomeTypes = useMemo(() => {
    const set = new Set<string>();
    outcomes.forEach(o => { if (o.outcomeType) set.add(o.outcomeType); });
    return Array.from(set);
  }, [outcomes]);

  const activeFilterCount = [filterSdg, filterProject, filterOutcomeType, filterStartDate, filterEndDate].filter(Boolean).length;

  const clearFilters = () => {
    setFilterSdg(""); setFilterProject(""); setFilterOutcomeType("");
    setFilterStartDate(""); setFilterEndDate("");
  };

  // CSV Export
  const handleExportCSV = () => {
    if (outcomes.length === 0) return;

    const headers = ["Date", "Record", "Type", "Quantity", "SDGs", "NGO", "Volunteer", "Project", "Confirmed At", "Hours"];
    const rows = outcomes.map(o => [
      o.date ? format(new Date(o.date), "yyyy-MM-dd") : "",
      (o.outcomeText || "").replace(/"/g, '""'),
      o.outcomeType || "",
      String(o.outcomeQuantity || ""),
      (o.sdgTags || []).map(s => `SDG ${s}`).join("; "),
      o.ngoName || "",
      o.volunteerName || "",
      o.projectName || "",
      o.verifiedAt ? format(new Date(o.verifiedAt), "yyyy-MM-dd") : "",
      String(o.hours || ""),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `confirmed-records-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-slate-50 max-w-[600px] mx-auto">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-slate-200">
        <div className="pt-[max(0.5rem,env(safe-area-inset-top))]" />
        <div className="flex items-center justify-between px-5 py-3.5">
          {/* Logo — 40% */}
          <div className="flex-shrink-0" style={{ width: '40%' }}>
            <Logo size="xs" className="flex-shrink-0" />
          </div>
          {/* Type label — 30% */}
          <div className="flex-shrink-0 flex justify-center" style={{ width: '30%' }}>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">ESG Console</span>
          </div>
          {/* Actions — 20% */}
          <div className="flex-shrink-0 flex justify-end items-center gap-2" style={{ width: '20%' }}>
            <button
              onClick={() => refetch()}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors touch-manipulation active:scale-95"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors touch-manipulation active:scale-95"
            >
              <LogOut className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 space-y-4">
        {/* Summary Bar */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900 mb-3">Confirmed Activity Records</h1>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">{summary.totalVerifiedOutcomes}</div>
              <div className="text-[10px] text-slate-500 uppercase font-medium">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{summary.sdgsCovered.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-medium">SDGs</div>
            </div>
            <div className="text-center">
              <div className="text-xs font-medium text-slate-700">
                {summary.dateRange.earliest ? format(new Date(summary.dateRange.earliest), "MMM d") : "--"}
                {" - "}
                {summary.dateRange.latest ? format(new Date(summary.dateRange.latest), "MMM d") : "--"}
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-medium mt-1">Date Range</div>
            </div>
          </div>
          {/* SDG coverage chips */}
          {summary.sdgsCovered.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
              {summary.sdgsCovered.map(sdg => (
                <span
                  key={sdg}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                  style={{ backgroundColor: getSDGColor(sdg) }}
                >
                  SDG {sdg}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Filters + Export */}
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              activeFilterCount > 0
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
            {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={outcomes.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Filter Records</span>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} className="text-xs text-blue-600 hover:underline">
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-medium">SDG</label>
                <select
                  value={filterSdg}
                  onChange={e => setFilterSdg(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">All SDGs</option>
                  {Array.from({ length: 17 }, (_, i) => i + 1).map(sdg => (
                    <option key={sdg} value={sdg}>SDG {sdg}: {getSDGName(sdg)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-medium">Project</label>
                <select
                  value={filterProject}
                  onChange={e => setFilterProject(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">All Projects</option>
                  {uniqueProjects.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-medium">Record Type</label>
                <select
                  value={filterOutcomeType}
                  onChange={e => setFilterOutcomeType(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">All Record Types</option>
                  {uniqueOutcomeTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase font-medium">Start Date</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase font-medium">End Date</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* Record list */}
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading confirmed records...</p>
          </div>
        ) : outcomes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-700 font-medium mb-1">No confirmed records yet</h3>
            <p className="text-slate-500 text-sm">
              {activeFilterCount > 0 ? "Try adjusting your filters." : "Records will appear here once partners confirm activity submissions."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {outcomes.map((outcome) => (
              <div key={outcome.id} className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
                {/* Record text */}
                {outcome.outcomeText && (
                  <p className="text-sm font-medium text-slate-800 mb-2">
                    {outcome.outcomeText}
                  </p>
                )}

                {/* Type + Quantity + SDGs row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {outcome.outcomeQuantity && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {outcome.outcomeQuantity} {outcome.outcomeType || 'units'}
                    </span>
                  )}
                  {outcome.sdgTags && outcome.sdgTags.map(sdg => (
                    <span
                      key={sdg}
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                      style={{ backgroundColor: getSDGColor(sdg) }}
                    >
                      SDG {sdg}
                    </span>
                  ))}
                  {outcome.geolocation && (
                    <MapPin className="w-3 h-3 text-blue-500" />
                  )}
                  {outcome.evidenceUrls && outcome.evidenceUrls.length > 0 && (
                    <span className="flex items-center gap-0.5 text-[10px] text-blue-500">
                      <ImageIcon className="w-3 h-3" /> {outcome.evidenceUrls.length}
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-600">{outcome.ngoName}</span>
                    <span>|</span>
                    <span>{outcome.volunteerName}</span>
                    <span>|</span>
                    <span>{outcome.projectName}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    {outcome.verifiedAt
                      ? format(new Date(outcome.verifiedAt), "MMM d")
                      : outcome.date
                        ? format(new Date(outcome.date), "MMM d")
                        : ""
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

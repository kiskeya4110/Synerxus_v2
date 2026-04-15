import { useState, useMemo, memo, useEffect } from "react";
import DOMPurify from "dompurify";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  RefreshCw, Download, Filter,
  CheckCircle, Globe, ChevronDown, ChevronUp, ChevronRight, ChevronLeft,
  MapPin, Image as ImageIcon, Clock, Target, FileText,
} from "lucide-react";
import { getSDGName, getSDGColor } from "@shared/sdg-goals";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// ── Corporate tab configuration ───────────────────────────────────────────────
// To add a new tab: append one entry here + add a matching conditional block.
type CorporateTab = 'outcomes' | 'reports';

const CORPORATE_TABS: { id: CorporateTab; label: string }[] = [
  { id: 'outcomes', label: 'Verified Outcomes' },
  { id: 'reports',  label: 'ESG Reports' },
];

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

interface CorporateViewProps {
  userId: string;
  isMobile: boolean;
  activeUser: any;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const CorporateView = memo(function CorporateView({
  userId,
  isMobile,
  activeUser,
  onRefresh,
  isRefreshing = false,
}: CorporateViewProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Desktop tab navigation (mobile is unaffected)
  const [activeCorpTab, setActiveCorpTab] = useState<CorporateTab>('outcomes');

  // Report state
  const [reportGenerating, setReportGenerating] = useState(false);
  const [reportContent, setReportContent] = useState<{ rawHtml: string; styles: string; body: string } | null>(null);
  const [reportTimePeriod, setReportTimePeriod] = useState("all");

  // ESG report entity filter state
  const [selectedEmployeeNames, setSelectedEmployeeNames] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [selectedNgoNames, setSelectedNgoNames] = useState<string[]>([]);
  const [reportFilterPanel, setReportFilterPanel] = useState<string | null>(null);

  useEffect(() => {
    if (!reportFilterPanel) return;
    const close = () => setReportFilterPanel(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [reportFilterPanel]);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [filterSdg, setFilterSdg] = useState<string>("");
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterOutcomeType, setFilterOutcomeType] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");

  // Selected outcome for detail expansion
  const [selectedOutcomeId, setSelectedOutcomeId] = useState<number | null>(null);

  const toggleOutcomeDetail = (outcomeId: number) => {
    setSelectedOutcomeId(prev => prev === outcomeId ? null : outcomeId);
  };

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

  // Fetch verified outcomes
  const { data: outcomesData, isLoading, refetch } = useQuery<VerifiedOutcomesResponse>({
    queryKey: ["/api/logs/corporate-verified", queryParams],
    queryFn: async () => {
      const res = await fetch(`/api/logs/corporate-verified?${queryParams}`);
      if (!res.ok) {
        // Fallback
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
    staleTime: 30_000,
    gcTime: 5 * 60_000,
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

  // Options for ESG report entity filters — derived from outcomes already in memory
  const reportEmployeeOptions = useMemo(() => {
    const names = new Set<string>();
    outcomes.forEach(o => { if (o.volunteerName && o.volunteerName !== 'Volunteer') names.add(o.volunteerName); });
    return Array.from(names).sort();
  }, [outcomes]);

  const reportProjectOptions = uniqueProjects; // already [projectId, projectName][]

  const reportNgoOptions = useMemo(() => {
    const names = new Set<string>();
    outcomes.forEach(o => { if (o.ngoName && o.ngoName !== 'NGO') names.add(o.ngoName); });
    return Array.from(names).sort();
  }, [outcomes]);

  const activeFilterCount = [filterSdg, filterProject, filterOutcomeType, filterStartDate, filterEndDate].filter(Boolean).length;

  const clearFilters = () => {
    setFilterSdg(""); setFilterProject(""); setFilterOutcomeType("");
    setFilterStartDate(""); setFilterEndDate("");
  };

  // CSV Export
  const handleExportCSV = () => {
    if (outcomes.length === 0) return;

    const headers = ["Date", "Outcome", "Type", "Quantity", "SDGs", "NGO", "Volunteer", "Project", "Verified At", "Hours"];
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
    link.setAttribute("download", `verified-outcomes-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRefresh = async () => {
    await refetch();
    onRefresh?.();
  };

  const generateReport = async () => {
    setReportGenerating(true);
    try {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (reportTimePeriod !== 'all') params.set('timePeriod', reportTimePeriod);
      params.set('corporateId', userId);
      if (selectedEmployeeNames.length) params.set('employeeNames', selectedEmployeeNames.join('|||'));
      if (selectedProjectIds.length) params.set('projectIds', selectedProjectIds.join(','));
      if (selectedNgoNames.length) params.set('ngoNames', selectedNgoNames.join('|||'));
      const url = `/api/reports/corporate-esg-summary?${params.toString()}`;
      const response = await fetch(url, { headers, credentials: "include", cache: "no-store" });
      if (!response.ok) throw new Error(`${response.status}: ${await response.text()}`);
      const rawHtml = await response.text();
      const parser = new DOMParser();
      const parsedDoc = parser.parseFromString(rawHtml, 'text/html');
      const styles = Array.from(parsedDoc.querySelectorAll('style')).map(s => s.textContent || '').join('\n');
      const body = parsedDoc.body.innerHTML;
      setReportContent({ rawHtml, styles, body });
    } catch (err) {
      console.error("Report generation failed:", err);
      toast({ title: "Report failed", description: "Could not generate the ESG report. Please try again.", variant: "destructive" });
    } finally {
      setReportGenerating(false);
    }
  };

  const closeReport = () => setReportContent(null);

  const printReport = () => {
    if (!reportContent) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(DOMPurify.sanitize(reportContent.rawHtml, { FORCE_BODY: true, ADD_TAGS: ['style', 'link', 'meta'], ADD_ATTR: ['style', 'class', 'id', 'href', 'rel', 'charset', 'content', 'name'] }));
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const downloadReport = () => {
    if (!reportContent) return;
    const blob = new Blob([reportContent.rawHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `corporate-esg-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // Mobile PWA View
  if (isMobile) {
    return (
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ paddingBottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}>

        {/* Report overlay */}
        {reportContent && (
          <div id="synerxus-report-overlay" className="fixed inset-0 z-[300] bg-white flex flex-col">
            <style dangerouslySetInnerHTML={{ __html: reportContent.styles + `
              @media print {
                body > *:not(#synerxus-report-overlay) { display: none !important; }
                #synerxus-report-overlay { position: static !important; height: auto !important; overflow: visible !important; z-index: auto !important; }
                #synerxus-report-overlay .report-header-bar { display: none !important; }
              }
            `}} />
            <div className="report-header-bar flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0 print:hidden">
              <button
                onClick={closeReport}
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <ChevronLeft className="h-4 w-4" />
                Close
              </button>
              <span className="text-sm font-semibold text-gray-900">ESG Report</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadReport}
                  className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-2 py-1"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                <button
                  onClick={printReport}
                  className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 rounded-lg px-2 py-1"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Print / PDF
                </button>
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportContent.body, { ADD_ATTR: ['style', 'class', 'id'], FORCE_BODY: true }) }}
            />
          </div>
        )}

        {/* ESG Report generation card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Corporate ESG Report</h3>
              <p className="text-xs text-gray-500">Global sustainability framework-aligned impact summary</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <label className="text-xs font-medium text-gray-500">Period</label>
            <Select value={reportTimePeriod} onValueChange={(v) => { setReportTimePeriod(v); setReportContent(null); }}>
              <SelectTrigger className="flex-1 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {reportGenerating ? (
            <div className="flex items-center justify-center gap-2 text-indigo-600 py-1">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">Generating report…</span>
            </div>
          ) : (
            <button
              onClick={generateReport}
              className="w-full py-2.5 px-4 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Download className="h-4 w-4" />
              Generate ESG Report
            </button>
          )}
        </div>

        {/* Summary Bar - Interactive */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-bold text-slate-900">Verified Outcomes</h1>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => { setShowFilters(false); }}
              className="text-center p-2 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              <div className="text-2xl font-bold text-emerald-600">{summary.totalVerifiedOutcomes}</div>
              <div className="text-[10px] text-slate-500 uppercase font-medium">Verified</div>
            </button>
            <button
              onClick={() => { setShowFilters(true); }}
              className="text-center p-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <div className="text-2xl font-bold text-blue-600">{summary.sdgsCovered.length}</div>
              <div className="text-[10px] text-slate-500 uppercase font-medium">SDGs</div>
            </button>
            <button
              onClick={() => { setShowFilters(true); }}
              className="text-center p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="text-xs font-medium text-slate-700">
                {summary.dateRange.earliest ? format(new Date(summary.dateRange.earliest), "MMM d") : "--"}
                {" - "}
                {summary.dateRange.latest ? format(new Date(summary.dateRange.latest), "MMM d") : "--"}
              </div>
              <div className="text-[10px] text-slate-500 uppercase font-medium mt-1">Date Range</div>
            </button>
          </div>
          {/* SDG coverage chips - Interactive */}
          {summary.sdgsCovered.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t border-slate-100">
              {summary.sdgsCovered.map(sdg => (
                <button
                  key={sdg}
                  onClick={() => { setFilterSdg(String(sdg)); setShowFilters(true); }}
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: getSDGColor(sdg) }}
                >
                  SDG {sdg}
                </button>
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
              <span className="text-sm font-medium text-slate-700">Filter Outcomes</span>
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
                <label className="text-[10px] text-slate-500 uppercase font-medium">Outcome Type</label>
                <select
                  value={filterOutcomeType}
                  onChange={e => setFilterOutcomeType(e.target.value)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="">All Types</option>
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

        {/* Outcome List */}
        {isLoading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-500 text-sm">Loading verified outcomes...</p>
          </div>
        ) : outcomes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-700 font-medium mb-1">No verified outcomes yet</h3>
            <p className="text-slate-500 text-sm">
              {activeFilterCount > 0 ? "Try adjusting your filters." : "Outcomes will appear here once NGOs verify volunteer submissions."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {outcomes.map((outcome) => {
              const isExpanded = selectedOutcomeId === outcome.id;
              return (
                <button
                  key={outcome.id}
                  onClick={() => toggleOutcomeDetail(outcome.id)}
                  className={`w-full bg-white rounded-xl p-3 border shadow-sm text-left transition-all active:scale-[0.99] cursor-pointer ${
                    isExpanded ? 'border-blue-300 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {/* Summary row */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {outcome.outcomeText || outcome.outcomeType || 'Impact recorded'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        <span className="font-medium text-slate-600">{outcome.ngoName}</span>
                        <span>|</span>
                        <span>{outcome.projectName}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {outcome.outcomeQuantity && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {outcome.outcomeQuantity} {outcome.outcomeType || 'units'}
                        </span>
                      )}
                      <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                      {/* Full outcome text */}
                      {outcome.outcomeText && outcome.outcomeText !== (outcome.outcomeType || 'Impact recorded') && (
                        <p className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{outcome.outcomeText}</p>
                      )}

                      {/* Volunteer & date */}
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Clock className="h-3 w-3" />
                        <span>
                          {outcome.date ? format(new Date(outcome.date), "EEEE, MMMM d, yyyy") : 'Unknown date'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600">
                        <Target className="h-3 w-3 text-emerald-600" />
                        <span>Volunteer: {outcome.volunteerName}</span>
                        {outcome.hours && <span className="font-medium">({outcome.hours}h)</span>}
                      </div>

                      {/* Verification info */}
                      {outcome.verifiedAt && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Verified on {format(new Date(outcome.verifiedAt), "MMM d, yyyy")}</span>
                          {outcome.verifierName && <span>by {outcome.verifierName}</span>}
                        </div>
                      )}

                      {/* SDG tags with labels */}
                      {outcome.sdgTags && outcome.sdgTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {outcome.sdgTags.map(sdg => (
                            <span
                              key={sdg}
                              className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                              style={{ backgroundColor: getSDGColor(sdg) }}
                            >
                              SDG {sdg}: {getSDGName(sdg)}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Evidence */}
                      <div className="flex items-center gap-3">
                        {outcome.geolocation && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-500">
                            <MapPin className="w-3 h-3" /> Location verified
                          </span>
                        )}
                        {outcome.evidenceUrls && outcome.evidenceUrls.length > 0 && (
                          <span className="flex items-center gap-1 text-[10px] text-blue-500">
                            <ImageIcon className="w-3 h-3" /> {outcome.evidenceUrls.length} photo{outcome.evidenceUrls.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    );
  }

  // Desktop View
  return (
    <main className="container max-w-6xl mx-auto px-4 py-8 space-y-6">

      {/* Report overlay */}
      {reportContent && (
        <div id="synerxus-report-overlay" className="fixed inset-0 z-[300] bg-white flex flex-col">
          <style dangerouslySetInnerHTML={{ __html: reportContent.styles + `
            @media print {
              body > *:not(#synerxus-report-overlay) { display: none !important; }
              #synerxus-report-overlay { position: static !important; height: auto !important; overflow: visible !important; z-index: auto !important; }
              #synerxus-report-overlay .report-header-bar { display: none !important; }
            }
          `}} />
          <div className="report-header-bar flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white shadow-sm flex-shrink-0 print:hidden">
            <button
              onClick={closeReport}
              className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="h-4 w-4" />
              Close Report
            </button>
            <span className="text-sm font-semibold text-gray-900">Corporate ESG Report</span>
            <div className="flex items-center gap-2">
              <button
                onClick={downloadReport}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-1.5"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={printReport}
                className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 rounded-lg px-3 py-1.5"
              >
                <FileText className="h-4 w-4" />
                Print / PDF
              </button>
            </div>
          </div>
          <div
            className="flex-1 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportContent.body, { ADD_ATTR: ['style', 'class', 'id'], FORCE_BODY: true }) }}
          />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ESG Console</h1>
          <p className="text-slate-600 mt-1">View verified impact outcomes from your partner organizations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {activeCorpTab === 'outcomes' && (
            <button
              onClick={handleExportCSV}
              disabled={outcomes.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
          {activeCorpTab === 'reports' && (
            <button
              onClick={() => setActiveCorpTab('outcomes')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              View Outcomes
            </button>
          )}
        </div>
      </div>

      {/* ── Desktop Tab Bar ────────────────────────────────────────────────── */}
      <div className="border-b border-slate-200 -mb-2">
        <nav className="flex gap-1">
          {CORPORATE_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveCorpTab(id)}
              className={cn(
                "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                activeCorpTab === id
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              )}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Verified Outcomes Tab ────────────────────────────────────────── */}
      {activeCorpTab === 'outcomes' && (<>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-medium text-slate-500 uppercase">Verified Outcomes</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{summary.totalVerifiedOutcomes}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-slate-500 uppercase">SDGs Covered</span>
          </div>
          <p className="text-3xl font-bold text-slate-900">{summary.sdgsCovered.length}</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-slate-500 uppercase">SDG Coverage</span>
          </div>
          {summary.sdgsCovered.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {summary.sdgsCovered.map(sdg => (
                <span
                  key={sdg}
                  className="px-2 py-1 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: getSDGColor(sdg) }}
                >
                  SDG {sdg}: {getSDGName(sdg)}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No SDG data yet</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-900">Filters</h2>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-sm text-blue-600 hover:underline">
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div>
            <label className="text-xs text-slate-500 uppercase font-medium block mb-1">SDG</label>
            <select
              value={filterSdg}
              onChange={e => setFilterSdg(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">All SDGs</option>
              {Array.from({ length: 17 }, (_, i) => i + 1).map(sdg => (
                <option key={sdg} value={sdg}>SDG {sdg}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-medium block mb-1">Project</label>
            <select
              value={filterProject}
              onChange={e => setFilterProject(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Projects</option>
              {uniqueProjects.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-medium block mb-1">Outcome Type</label>
            <select
              value={filterOutcomeType}
              onChange={e => setFilterOutcomeType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="">All Types</option>
              {uniqueOutcomeTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-medium block mb-1">Start Date</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 uppercase font-medium block mb-1">End Date</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Outcomes Table */}
      {isLoading ? (
        <div className="text-center py-16">
          <RefreshCw className="w-10 h-10 text-slate-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading verified outcomes...</p>
        </div>
      ) : outcomes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
          <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-slate-700 font-semibold text-lg mb-2">No verified outcomes yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            {activeFilterCount > 0
              ? "Try adjusting your filters to see more results."
              : "Verified outcomes will appear here once your partner NGOs verify volunteer submissions."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Quantity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">SDGs</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Organization</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Project</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {outcomes.map((outcome) => {
                const isExpanded = selectedOutcomeId === outcome.id;
                return (
                  <tr
                    key={outcome.id}
                    onClick={() => toggleOutcomeDetail(outcome.id)}
                    className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="px-4 py-3" colSpan={isExpanded ? 6 : undefined}>
                      {isExpanded ? (
                        <div className="space-y-3">
                          {/* Summary row when expanded */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <ChevronRight className="h-4 w-4 text-blue-500 rotate-90 transition-transform" />
                              <div>
                                <p className="text-sm font-medium text-slate-800">
                                  {outcome.outcomeText || outcome.outcomeType || 'Impact recorded'}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">{outcome.volunteerName}</p>
                              </div>
                            </div>
                            {outcome.outcomeQuantity && (
                              <span className="text-sm font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                {outcome.outcomeQuantity} {outcome.outcomeType || 'units'}
                              </span>
                            )}
                          </div>

                          {/* Expanded detail */}
                          <div className="ml-7 space-y-2 pb-1">
                            {outcome.outcomeText && (
                              <p className="text-xs text-slate-700 bg-slate-50 rounded-lg px-3 py-2">{outcome.outcomeText}</p>
                            )}
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Clock className="h-3 w-3" />
                              <span>{outcome.date ? format(new Date(outcome.date), "EEEE, MMMM d, yyyy") : 'Unknown date'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <Target className="h-3 w-3 text-emerald-600" />
                              <span>Volunteer: {outcome.volunteerName}</span>
                              {outcome.hours && <span className="font-medium">({outcome.hours}h)</span>}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-600">
                              <span className="font-medium">Organization:</span> {outcome.ngoName}
                              <span className="mx-1">•</span>
                              <span className="font-medium">Project:</span> {outcome.projectName}
                            </div>
                            {outcome.verifiedAt && (
                              <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>Verified on {format(new Date(outcome.verifiedAt), "MMM d, yyyy")}</span>
                                {outcome.verifierName && <span>by {outcome.verifierName}</span>}
                              </div>
                            )}
                            {outcome.sdgTags && outcome.sdgTags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {outcome.sdgTags.map(sdg => (
                                  <span
                                    key={sdg}
                                    className="px-2 py-0.5 rounded text-[10px] font-medium text-white"
                                    style={{ backgroundColor: getSDGColor(sdg) }}
                                  >
                                    SDG {sdg}: {getSDGName(sdg)}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-3">
                              {outcome.geolocation && (
                                <span className="flex items-center gap-1 text-[10px] text-blue-500">
                                  <MapPin className="w-3 h-3" /> Location verified
                                </span>
                              )}
                              {outcome.evidenceUrls && outcome.evidenceUrls.length > 0 && (
                                <span className="flex items-center gap-1 text-[10px] text-blue-500">
                                  <ImageIcon className="w-3 h-3" /> {outcome.evidenceUrls.length} photo{outcome.evidenceUrls.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-slate-400 transition-transform" />
                          <div>
                            <p className="text-sm font-medium text-slate-800 line-clamp-2">
                              {outcome.outcomeText || outcome.outcomeType || 'Impact recorded'}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{outcome.volunteerName}</p>
                          </div>
                        </div>
                      )}
                    </td>
                    {!isExpanded && (
                      <>
                        <td className="px-4 py-3">
                          {outcome.outcomeQuantity ? (
                            <span className="text-sm font-semibold text-emerald-700">
                              {outcome.outcomeQuantity} {outcome.outcomeType || 'units'}
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {outcome.sdgTags && outcome.sdgTags.map(sdg => (
                              <span
                                key={sdg}
                                className="px-1.5 py-0.5 rounded text-[10px] font-medium text-white"
                                style={{ backgroundColor: getSDGColor(sdg) }}
                              >
                                {sdg}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{outcome.ngoName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700">{outcome.projectName}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span className="text-sm text-slate-600">
                              {outcome.verifiedAt
                                ? format(new Date(outcome.verifiedAt), "MMM d, yyyy")
                                : '-'}
                            </span>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      </>)} {/* end outcomes tab */}

      {/* ── ESG Reports Tab ───────────────────────────────────────────────── */}
      {activeCorpTab === 'reports' && (
        <div className="space-y-6">
          {/* Branding header */}
          <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 shadow-sm px-6 py-4">
            <div className="flex items-center gap-4">
              <img src="/synerxus-esg-logo.png" alt="Synerxus" className="h-9 w-auto" />
              <div className="w-px h-8 bg-slate-200" />
              <div>
                <div className="text-sm font-bold text-slate-900 leading-tight">CSR / ESG Reports</div>
                <div className="text-[10px] text-slate-500 leading-tight">Verified impact data · Audit-ready exports</div>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">✓ Blockchain Verified</span>
          </div>

          {/* Entity Filters */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Filter by:
            </span>

            {/* Employees */}
            <div className="relative">
              <button
                onClick={() => setReportFilterPanel(reportFilterPanel === 'emp' ? null : 'emp')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                  selectedEmployeeNames.length ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-slate-200 text-slate-700")}
              >
                👥 Employees {selectedEmployeeNames.length > 0 && `(${selectedEmployeeNames.length})`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {reportFilterPanel === 'emp' && (
                <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[210px] max-h-52 overflow-y-auto">
                  {reportEmployeeOptions.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-3">No employee data yet</p>
                    : reportEmployeeOptions.map(name => (
                      <label key={name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={selectedEmployeeNames.includes(name)} onChange={e => { if (e.target.checked) setSelectedEmployeeNames(p => [...p, name]); else setSelectedEmployeeNames(p => p.filter(n => n !== name)); }} className="accent-blue-600" />
                        {name}
                      </label>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Projects */}
            <div className="relative">
              <button
                onClick={() => setReportFilterPanel(reportFilterPanel === 'proj' ? null : 'proj')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                  selectedProjectIds.length ? "bg-green-50 border-green-400 text-green-700" : "bg-white border-slate-200 text-slate-700")}
              >
                📁 Projects {selectedProjectIds.length > 0 && `(${selectedProjectIds.length})`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {reportFilterPanel === 'proj' && (
                <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[210px] max-h-52 overflow-y-auto">
                  {reportProjectOptions.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-3">No project data yet</p>
                    : reportProjectOptions.map(([id, name]) => (
                      <label key={id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={selectedProjectIds.includes(id)} onChange={e => { if (e.target.checked) setSelectedProjectIds(p => [...p, id]); else setSelectedProjectIds(p => p.filter(i => i !== id)); }} className="accent-green-600" />
                        {name}
                      </label>
                    ))
                  }
                </div>
              )}
            </div>

            {/* NGO Partners */}
            <div className="relative">
              <button
                onClick={() => setReportFilterPanel(reportFilterPanel === 'ngo' ? null : 'ngo')}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors",
                  selectedNgoNames.length ? "bg-amber-50 border-amber-400 text-amber-700" : "bg-white border-slate-200 text-slate-700")}
              >
                🌍 NGO Partners {selectedNgoNames.length > 0 && `(${selectedNgoNames.length})`}
                <ChevronDown className="w-3 h-3" />
              </button>
              {reportFilterPanel === 'ngo' && (
                <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-full mt-1 left-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg p-2 min-w-[210px] max-h-52 overflow-y-auto">
                  {reportNgoOptions.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-3">No NGO partner data yet</p>
                    : reportNgoOptions.map(name => (
                      <label key={name} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-700 hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" checked={selectedNgoNames.includes(name)} onChange={e => { if (e.target.checked) setSelectedNgoNames(p => [...p, name]); else setSelectedNgoNames(p => p.filter(n => n !== name)); }} className="accent-amber-600" />
                        {name}
                      </label>
                    ))
                  }
                </div>
              )}
            </div>

            {(selectedEmployeeNames.length > 0 || selectedProjectIds.length > 0 || selectedNgoNames.length > 0) && (
              <button
                onClick={() => { setSelectedEmployeeNames([]); setSelectedProjectIds([]); setSelectedNgoNames([]); setReportContent(null); }}
                className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-medium"
              >
                ✕ Clear filters
              </button>
            )}
          </div>

          {/* Period + Generate */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-slate-700 block mb-1">Reporting Period</label>
              <Select value={reportTimePeriod} onValueChange={(v) => { setReportTimePeriod(v); setReportContent(null); }}>
                <SelectTrigger className="w-full sm:w-[200px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <button
              onClick={generateReport}
              disabled={reportGenerating}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {reportGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              {reportGenerating ? 'Generating…' : 'Generate Report'}
            </button>
          </div>

          {/* Report preview */}
          {reportContent && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-slate-50">
                <span className="text-sm font-semibold text-slate-800">Report Preview</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadReport}
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Download HTML
                  </button>
                  <button
                    onClick={printReport}
                    className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 border border-indigo-300 rounded-lg px-3 py-1.5 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    Print / PDF
                  </button>
                </div>
              </div>
              <style dangerouslySetInnerHTML={{ __html: reportContent.styles }} />
              <div
                className="p-6 max-h-[70vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(reportContent.body, { ADD_ATTR: ['style', 'class', 'id'], FORCE_BODY: true }) }}
              />
            </div>
          )}

          {!reportContent && !reportGenerating && (
            <div className="text-center py-16 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a reporting period and click Generate Report</p>
              <p className="text-xs mt-1">Report includes SDG alignment, project breakdown, and global sustainability framework metrics</p>
            </div>
          )}
        </div>
      )}

    </main>
  );
});

export default CorporateView;

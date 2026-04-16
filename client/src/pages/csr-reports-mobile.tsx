/**
 * CSR Reports — Mobile Views
 *
 * Renders the mobile experience for both user types:
 *   - Organization users  → OrganizationPWALayout with impact stats + report cards
 *   - CSR / corporate users → Standalone mobile shell with category pills + report list
 *
 * Mounted by csr-reports-exports.tsx when `isMobile === true`.
 * Receives all data and callbacks as props — no data fetching.
 */

import { Download, RefreshCw, TrendingUp, Users, Target, Briefcase } from "lucide-react";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import CSRMobileNav, { CSRMobileHeader } from "@/components/layout/csr-mobile-nav";
import { PlanGate } from "@/components/plan-gate";
import { downloadFile, generateCSVContent } from "@/lib/csr-report-generators";
import { reportTemplates, reportCategories } from "@/types/csr-reports.types";
import type { ReportTemplate } from "@/types/csr-reports.types";

export interface CsrReportsMobileProps {
  isOrganization: boolean;
  orgDashboardData: any;
  currentUser: any;
  reportData: any;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  filteredTemplates: ReportTemplate[];
  categories: typeof reportCategories;
  isGenerating: string | null;
  generateReport: (template: ReportTemplate, format: string) => void;
  toast: (opts: { title: string; description?: string; variant?: string }) => void;
  planFeatures: any;
  currentDate: string;
  handleOrgRefresh: () => Promise<void>;
  navigate: (path: string) => void;
  companyName: string;
}

export default function CsrReportsMobile({
  isOrganization,
  orgDashboardData,
  currentUser,
  reportData,
  selectedCategory,
  setSelectedCategory,
  filteredTemplates,
  categories,
  isGenerating,
  generateReport,
  toast,
  planFeatures,
  currentDate,
  handleOrgRefresh,
  navigate,
  companyName,
}: CsrReportsMobileProps) {
  // ── Organisation Mobile View ──────────────────────────────────────────────
  if (isOrganization) {
    const orgReportTemplates = reportTemplates.filter(
      (t) => !["employee-engagement", "bcorp-compliance", "esg-scorecard"].includes(t.id)
    );
    const orgCategories = [
      { id: "all",        label: "All Reports", icon: "📄" },
      { id: "impact",     label: "Impact",      icon: "🌍" },
      { id: "compliance", label: "Compliance",  icon: "✅" },
      { id: "financial",  label: "Financial",   icon: "💰" },
    ];
    const orgFilteredTemplates =
      selectedCategory === "all"
        ? orgReportTemplates
        : orgReportTemplates.filter((t) => t.category === selectedCategory);

    return (
      <OrganizationPWALayout
        activeTab="reports"
        onRefresh={handleOrgRefresh}
        metrics={{
          activeProjects:   orgDashboardData?.activeProjects   || 0,
          activeVolunteers: orgDashboardData?.activeVolunteers || 0,
          totalHours:       orgDashboardData?.totalHours       || 0,
          sdgsAddressed:    orgDashboardData?.sdgsAddressed    || 0,
        }}
      >
        <div className="p-4 pb-20 space-y-4">
          {/* Page Title */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900">Analytics & Reports</h1>
            {currentUser?.name && (
              <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
            )}
            <p className="text-sm text-gray-500">Generate reports and track performance</p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm text-center">
              <TrendingUp className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <p className="text-lg font-bold">{orgDashboardData?.totalHours || 0}</p>
              <p className="text-[10px] text-gray-500">Total Hours</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm text-center">
              <Users className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <p className="text-lg font-bold">{orgDashboardData?.activeVolunteers || 0}</p>
              <p className="text-[10px] text-gray-500">Volunteers</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm text-center">
              <Target className="h-5 w-5 text-orange-600 mx-auto mb-1" />
              <p className="text-lg font-bold">{orgDashboardData?.sdgsAddressed || 0}</p>
              <p className="text-[10px] text-gray-500">SDGs Addressed</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm text-center">
              <Briefcase className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <p className="text-lg font-bold">{orgDashboardData?.activeProjects || 0}</p>
              <p className="text-[10px] text-gray-500">Active Projects</p>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-2">
            {orgCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 shadow-sm ${
                  selectedCategory === cat.id
                    ? "bg-orange-600 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Report Templates */}
          <div className="space-y-2">
            {orgFilteredTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-xl">{template.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-slate-900 text-sm font-semibold truncate">{template.name}</h3>
                    <p className="text-slate-600 text-[10px] line-clamp-2">{template.description}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {template.formats.map((format) => (
                      <span
                        key={format}
                        className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                          format === "PDF"
                            ? "bg-red-100 text-red-700 border border-red-200"
                            : format === "XLSX"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-blue-100 text-blue-700 border border-blue-200"
                        }`}
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-1">
                    {template.formats.slice(0, 2).map((format) => (
                      <button
                        key={format}
                        onClick={() => generateReport(template, format)}
                        disabled={isGenerating === template.id}
                        className={`px-2.5 py-1 rounded text-[10px] font-semibold flex items-center gap-1 shadow-sm ${
                          format === "PDF" ? "bg-orange-600 text-white" : "bg-emerald-600 text-white"
                        } disabled:opacity-50`}
                      >
                        {isGenerating === template.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        {format}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Export Section */}
          <PlanGate feature="csvExport" hasAccess={planFeatures.csvExport}>
            <div className="mt-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-3 border border-orange-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-orange-600" />
                Quick Data Export
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const csv = generateCSVContent(
                      { id: "hours-export", name: "Volunteer Hours Export" } as ReportTemplate,
                      reportData,
                      currentDate
                    );
                    downloadFile(csv, "volunteer_hours.csv", "text/csv");
                    toast({ title: "Downloaded", description: "Volunteer hours data exported." });
                  }}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">⏱️</div>
                  <div className="text-slate-800 text-[10px] font-semibold">Volunteer Hours</div>
                </button>
                <button
                  onClick={() => {
                    const sdgs = reportData?.sdgMetrics || [];
                    const hdr = ["SDG Goal", "SDG Name", "Hours", "Percentage"];
                    const rows = sdgs.map((m: any) => [
                      `SDG ${m.goal || ""}`,
                      m.name || m.label || "",
                      String(m.hours || m.totalHours || 0),
                      `${m.percentage || 0}%`,
                    ]);
                    downloadFile(
                      [hdr, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n"),
                      "sdg_metrics.csv",
                      "text/csv"
                    );
                    toast({ title: "Downloaded", description: "SDG metrics data exported." });
                  }}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">🌍</div>
                  <div className="text-slate-800 text-[10px] font-semibold">SDG Metrics</div>
                </button>
                <button
                  onClick={() => {
                    const projects = reportData?.projectMetrics || [];
                    const hdr = ["Project Name", "Hours", "Employees", "Status"];
                    const rows = projects.map((p: any) => [
                      p.name || "",
                      String(p.hours || 0),
                      String(p.employees || 0),
                      p.status || "",
                    ]);
                    downloadFile(
                      [hdr, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n"),
                      "project_data.csv",
                      "text/csv"
                    );
                    toast({ title: "Downloaded", description: "Project data exported." });
                  }}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">📁</div>
                  <div className="text-slate-800 text-[10px] font-semibold">Projects</div>
                </button>
                <button
                  onClick={() => {
                    const im = reportData?.impactMetrics || {};
                    const hdr = ["Metric", "Value"];
                    const rows = [
                      ["Direct Beneficiaries",   String(im.directBeneficiaries   || 0)],
                      ["Indirect Beneficiaries", String(im.indirectBeneficiaries || 0)],
                      ["Estimated Lives Touched", String(im.estimatedLivesTouched || 0)],
                      ["Impact Per Hour",         String(im.impactPerHour         || 0)],
                    ];
                    downloadFile(
                      [hdr, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n"),
                      "impact_data.csv",
                      "text/csv"
                    );
                    toast({ title: "Downloaded", description: "Impact data exported." });
                  }}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">📊</div>
                  <div className="text-slate-800 text-[10px] font-semibold">Impact Data</div>
                </button>
              </div>
            </div>
          </PlanGate>
        </div>
      </OrganizationPWALayout>
    );
  }

  // ── CSR Corporate Mobile View ─────────────────────────────────────────────
  return (
    <div className="h-screen bg-[#faf9f7] flex flex-col max-w-[428px] mx-auto overflow-hidden">
      <CSRMobileHeader
        title="Reports & Exports"
        companyName={companyName}
        showBackButton
        onBack={() => navigate("/csr-dashboard")}
      />

      <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3">
        {/* Category Pills */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 shadow-sm ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200"
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Report Templates */}
        <div className="space-y-2">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
              <div className="flex items-start gap-2 mb-2">
                <span className="text-xl">{template.icon}</span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-slate-900 text-sm font-semibold truncate">{template.name}</h3>
                  <p className="text-slate-600 text-[10px] line-clamp-2">{template.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {template.formats.map((format) => (
                    <span
                      key={format}
                      className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${
                        format === "PDF"
                          ? "bg-red-100 text-red-700 border border-red-200"
                          : format === "XLSX"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-blue-100 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {format}
                    </span>
                  ))}
                </div>
                <div className="flex gap-1">
                  {template.formats.slice(0, 2).map((format) => (
                    <button
                      key={format}
                      onClick={() => generateReport(template, format)}
                      disabled={isGenerating === template.id}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold flex items-center gap-1 shadow-sm ${
                        format === "PDF" ? "bg-blue-600 text-white" : "bg-emerald-600 text-white"
                      } disabled:opacity-50`}
                    >
                      {isGenerating === template.id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Download className="w-3 h-3" />
                      )}
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Export Section */}
        <PlanGate feature="csvExport" hasAccess={planFeatures.csvExport}>
          <div className="mt-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200 shadow-sm">
            <h3 className="text-slate-900 text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Download className="w-4 h-4 text-blue-600" />
              Quick Data Export
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const csv = generateCSVContent(
                    { id: "all-data", name: "All Data Export" } as ReportTemplate,
                    reportData,
                    currentDate
                  );
                  downloadFile(csv, "all_employee_hours.csv", "text/csv");
                  toast({ title: "Exported", description: "Employee hours data exported." });
                }}
                className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <div className="text-sm mb-0.5">⏱️</div>
                <div className="text-slate-800 text-[10px] font-semibold">Employee Hours</div>
              </button>
              <button
                onClick={() => {
                  const sdgs = reportData?.sdgMetrics || [];
                  const hdr = ["SDG Goal", "SDG Name", "Hours", "Percentage"];
                  const rows = sdgs.map((m: any) => [
                    `SDG ${m.goal || ""}`,
                    m.name || m.label || "",
                    String(m.hours || m.totalHours || 0),
                    `${m.percentage || 0}%`,
                  ]);
                  downloadFile(
                    [hdr, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n"),
                    "sdg_metrics.csv",
                    "text/csv"
                  );
                  toast({ title: "Downloaded", description: "SDG metrics data exported." });
                }}
                className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <div className="text-sm mb-0.5">🌍</div>
                <div className="text-slate-800 text-[10px] font-semibold">SDG Metrics</div>
              </button>
              <button
                onClick={() => {
                  const projects = reportData?.projectMetrics || [];
                  const hdr = ["Project Name", "Hours", "Employees", "Status"];
                  const rows = projects.map((p: any) => [
                    p.name || "",
                    String(p.hours || 0),
                    String(p.employees || 0),
                    p.status || "",
                  ]);
                  downloadFile(
                    [hdr, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n"),
                    "project_data.csv",
                    "text/csv"
                  );
                  toast({ title: "Downloaded", description: "Project data exported." });
                }}
                className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <div className="text-sm mb-0.5">📁</div>
                <div className="text-slate-800 text-[10px] font-semibold">Projects</div>
              </button>
              <button
                onClick={() => {
                  const fm = reportData?.financialMetrics || {};
                  const hdr = ["Metric", "Value"];
                  const rows = [
                    ["Volunteer Hour Value",  `$${fm.volunteerHourValue  || 0}`],
                    ["ROI",                  `${fm.roi                  || 0}%`],
                    ["Cost Per Beneficiary", `$${fm.costPerBeneficiary  || 0}`],
                    ["Program Cost",         `$${fm.programCost         || 0}`],
                  ];
                  downloadFile(
                    [hdr, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n"),
                    "financial_data.csv",
                    "text/csv"
                  );
                  toast({ title: "Downloaded", description: "Financial data exported." });
                }}
                className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
              >
                <div className="text-sm mb-0.5">💰</div>
                <div className="text-slate-800 text-[10px] font-semibold">Financial</div>
              </button>
            </div>
          </div>
        </PlanGate>
      </main>

      <CSRMobileNav activeTab="reports" />
    </div>
  );
}

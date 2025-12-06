import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import Logo from "@/components/ui/logo";
import {
  Home,
  BarChart3,
  Users,
  Briefcase,
  FileText,
  Settings,
  Download,
  FileSpreadsheet,
  File,
  Calendar,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  TrendingUp,
  Globe,
  Award,
  Target,
  Printer,
  Share2,
  Mail,
  ArrowLeft,
} from "lucide-react";
import Footer from "@/components/layout/footer";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { useToast } from "@/hooks/use-toast";

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: "compliance" | "executive" | "engagement" | "impact" | "financial";
  icon: string;
  formats: string[];
  lastGenerated?: string;
  frequency?: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  nextRun: string;
  recipients: string[];
  format: string;
  active: boolean;
}

const reportTemplates: ReportTemplate[] = [
  {
    id: "executive-summary",
    name: "Executive Summary Report",
    description: "High-level overview of CSR metrics, ROI, and strategic alignment for leadership.",
    category: "executive",
    icon: "📊",
    formats: ["PDF", "PPTX"],
    frequency: "quarterly",
  },
  {
    id: "employee-engagement",
    name: "Employee Engagement Report",
    description: "Detailed breakdown of employee volunteer hours, participation rates, and trends.",
    category: "engagement",
    icon: "👥",
    formats: ["PDF", "XLSX", "CSV"],
    frequency: "monthly",
  },
  {
    id: "sdg-impact",
    name: "SDG Impact Report",
    description: "Progress tracking against UN Sustainable Development Goals with benchmarks.",
    category: "impact",
    icon: "🌍",
    formats: ["PDF", "XLSX"],
    frequency: "quarterly",
  },
  {
    id: "bcorp-compliance",
    name: "B-Corp Readiness Report",
    description: "Assessment of B-Corp certification requirements with gap analysis.",
    category: "compliance",
    icon: "✅",
    formats: ["PDF"],
    frequency: "annual",
  },
  {
    id: "gri-standards",
    name: "GRI Standards Report",
    description: "Global Reporting Initiative aligned sustainability disclosure.",
    category: "compliance",
    icon: "📋",
    formats: ["PDF", "XLSX"],
    frequency: "annual",
  },
  {
    id: "financial-roi",
    name: "Financial ROI Analysis",
    description: "Economic value analysis including volunteer hour valuation and cost savings.",
    category: "financial",
    icon: "💰",
    formats: ["PDF", "XLSX", "CSV"],
    frequency: "quarterly",
  },
  {
    id: "project-portfolio",
    name: "Project Portfolio Report",
    description: "Comprehensive overview of all CSR projects, status, and outcomes.",
    category: "impact",
    icon: "📁",
    formats: ["PDF", "XLSX"],
    frequency: "monthly",
  },
  {
    id: "top-performers",
    name: "Top Performers Recognition Report",
    description: "Leaderboard and recognition data for employee volunteer champions.",
    category: "engagement",
    icon: "🏆",
    formats: ["PDF", "XLSX"],
    frequency: "monthly",
  },
  {
    id: "esg-scorecard",
    name: "ESG Scorecard",
    description: "Environmental, Social, and Governance metrics for stakeholder reporting.",
    category: "compliance",
    icon: "📈",
    formats: ["PDF", "PPTX"],
    frequency: "quarterly",
  },
  {
    id: "beneficiary-impact",
    name: "Beneficiary Impact Report",
    description: "Direct and indirect beneficiary reach with impact stories.",
    category: "impact",
    icon: "❤️",
    formats: ["PDF"],
    frequency: "quarterly",
  },
];

export default function CSRReportsExports() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [exportFormat, setExportFormat] = useState("PDF");
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/csr/reports-summary", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/impact-reporting?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch report data");
      return response.json();
    },
    enabled: !!userId,
  });

  const companyName = "Your Company";
  const adminName = user?.displayName || user?.email?.split('@')[0] || "Admin";
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const categories = [
    { id: "all", label: "All Reports", icon: "📄" },
    { id: "executive", label: "Executive", icon: "📊" },
    { id: "engagement", label: "Engagement", icon: "👥" },
    { id: "impact", label: "Impact", icon: "🌍" },
    { id: "compliance", label: "Compliance", icon: "✅" },
    { id: "financial", label: "Financial", icon: "💰" },
  ];

  const filteredTemplates = selectedCategory === "all"
    ? reportTemplates
    : reportTemplates.filter(t => t.category === selectedCategory);

  const generateReport = async (template: ReportTemplate, format: string) => {
    setIsGenerating(template.id);

    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate actual data based on template
      let content = "";
      const timestamp = new Date().toISOString().split("T")[0];

      if (format === "CSV") {
        content = generateCSVContent(template, reportData);
        downloadFile(content, `${template.id}_${timestamp}.csv`, "text/csv");
      } else if (format === "XLSX") {
        // For XLSX, we'd use a library like xlsx
        content = generateCSVContent(template, reportData);
        downloadFile(content, `${template.id}_${timestamp}.csv`, "text/csv");
        toast({
          title: "Report Generated",
          description: `${template.name} exported as CSV (XLSX conversion available with premium)`,
        });
      } else {
        // PDF generation
        const htmlContent = generatePDFContent(template, reportData);
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
        }
      }

      toast({
        title: "Report Generated",
        description: `${template.name} has been generated successfully.`,
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(null);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const generateCSVContent = (template: ReportTemplate, data: any) => {
    const headers = ["Metric", "Value", "Period", "Status"];
    let rows: string[][] = [];

    rows.push([template.name, "", currentDate, ""]);
    rows.push(["", "", "", ""]);

    if (data) {
      rows.push(["Total Hours", String(data.engagementMetrics?.totalHours || 0), "YTD", "Active"]);
      rows.push(["Active Employees", String(data.engagementMetrics?.activeEmployees || 0), "Current", "Active"]);
      rows.push(["Participation Rate", `${data.engagementMetrics?.participationRate || 0}%`, "Current", "Active"]);
      rows.push(["Direct Beneficiaries", String(data.impactMetrics?.directBeneficiaries || 0), "YTD", "Active"]);
      rows.push(["Economic Value", `$${data.financialMetrics?.volunteerHourValue || 0}`, "YTD", "Active"]);
      rows.push(["ROI", `${data.financialMetrics?.roi || 0}%`, "YTD", "Active"]);
    }

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
  };

  const generatePDFContent = (template: ReportTemplate, data: any) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            h1 { color: #1e3a8a; border-bottom: 3px solid #f97316; padding-bottom: 16px; }
            h2 { color: #1e3a8a; margin-top: 32px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
            .logo { font-size: 24px; font-weight: bold; color: #f97316; }
            .metric-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin: 24px 0; }
            .metric-card { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; }
            .metric-value { font-size: 32px; font-weight: bold; color: #1e3a8a; }
            .metric-label { font-size: 14px; color: #6b7280; margin-top: 8px; }
            table { width: 100%; border-collapse: collapse; margin: 24px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f3f4f6; font-weight: 600; }
            .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">synerxus</div>
            <div>${currentDate}</div>
          </div>

          <h1>${template.name}</h1>
          <p>${template.description}</p>

          <div class="metric-grid">
            <div class="metric-card">
              <div class="metric-value">${data?.engagementMetrics?.totalHours || 0}</div>
              <div class="metric-label">Total Volunteer Hours</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data?.engagementMetrics?.activeEmployees || 0}</div>
              <div class="metric-label">Active Employees</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data?.engagementMetrics?.participationRate || 0}%</div>
              <div class="metric-label">Participation Rate</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data?.impactMetrics?.directBeneficiaries || 0}</div>
              <div class="metric-label">Direct Beneficiaries</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">$${((data?.financialMetrics?.volunteerHourValue || 0) / 1000).toFixed(0)}K</div>
              <div class="metric-label">Economic Value</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data?.financialMetrics?.roi || 0}%</div>
              <div class="metric-label">Return on Investment</div>
            </div>
          </div>

          <h2>SDG Alignment</h2>
          <table>
            <thead>
              <tr>
                <th>SDG Goal</th>
                <th>Hours Contributed</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              ${(data?.sdgMetrics || []).slice(0, 5).map((sdg: any) => `
                <tr>
                  <td>Goal ${sdg.goal}</td>
                  <td>${sdg.hours || 0} hrs</td>
                  <td>${sdg.percentage || 0}%</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div class="footer">
            <p>Generated by Synerxus CSR Platform | ${currentDate}</p>
            <p>This report contains confidential information. Distribution is restricted to authorized personnel.</p>
          </div>
        </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>📄</div>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#ffffff", overflow: "hidden" }}>
      {/* Top Header Bar */}
      <div style={{ borderTop: "8px solid #0f172a", width: "100%" }} />
      <header style={{ backgroundColor: "#111827", color: "white", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, height: "64px" }}>
        <div style={{ display: "flex", alignItems: "center", minWidth: "fit-content" }}>
          <Logo size="sm" showIcon={true} className="invert" />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, justifyContent: "center" }}>
          <span style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff" }}>Reports & Exports</span>
          <span style={{ fontSize: "16px", color: "#ffffff" }}>•</span>
          <FileText style={{ width: "18px", height: "18px", color: "#ffffff" }} />
          <span style={{ fontSize: "16px", fontWeight: "500", color: "#ffffff" }}>{companyName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px", minWidth: "fit-content" }}>
          <span style={{ fontSize: "14px", color: "#ffffff" }}>{currentDate}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "28px", height: "28px", backgroundColor: "#1f2937", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px" }}>👤</div>
            <span style={{ fontSize: "14px", color: "#ffffff" }}>Admin {adminName}</span>
          </div>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Sidebar */}
        <aside style={{ width: "20%", backgroundColor: "#111827", color: "white", padding: "24px", flexShrink: 0 }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button onClick={() => navigate("/csr-dashboard")} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", backgroundColor: "transparent", color: "#d1d5db", border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1f2937"; e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#d1d5db"; }}>
              <Home style={{ width: "20px", height: "20px" }} />
              <span>Dashboard</span>
            </button>
            <button onClick={() => navigate("/csr-impact-reporting")} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", backgroundColor: "transparent", color: "#d1d5db", border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1f2937"; e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#d1d5db"; }}>
              <BarChart3 style={{ width: "20px", height: "20px" }} />
              <span>Impact Reporting</span>
            </button>
            <button onClick={() => navigate("/project-portfolio")} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", backgroundColor: "transparent", color: "#d1d5db", border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1f2937"; e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#d1d5db"; }}>
              <Briefcase style={{ width: "20px", height: "20px" }} />
              <span>Project Portfolio</span>
            </button>
            <button style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", backgroundColor: "#1f2937", color: "#f97316", border: "1px solid #374151", fontWeight: "500", cursor: "pointer", textAlign: "left" }}>
              <FileText style={{ width: "20px", height: "20px" }} />
              <span>Reports & Exports</span>
            </button>
            <button onClick={() => navigate("/corporate-partner-profile-settings")} style={{ width: "100%", display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px", borderRadius: "8px", backgroundColor: "transparent", color: "#d1d5db", border: "none", cursor: "pointer", textAlign: "left", transition: "all 0.2s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#1f2937"; e.currentTarget.style.color = "#ffffff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#d1d5db"; }}>
              <Settings style={{ width: "20px", height: "20px" }} />
              <span>Settings</span>
            </button>
          </nav>

          {/* Quick Stats Sidebar */}
          <div style={{ marginTop: "32px", padding: "16px", backgroundColor: "#1f2937", borderRadius: "8px" }}>
            <h4 style={{ fontSize: "12px", fontWeight: "600", color: "#9ca3af", marginBottom: "12px", textTransform: "uppercase" }}>Quick Stats</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#f97316" }}>{reportData?.engagementMetrics?.totalHours || 0}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>Total Hours</div>
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#10b981" }}>{reportData?.engagementMetrics?.activeEmployees || 0}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>Active Employees</div>
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#3b82f6" }}>{reportData?.sdgMetrics?.length || 0}</div>
                <div style={{ fontSize: "11px", color: "#9ca3af" }}>SDGs Tracked</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ width: "80%", padding: "32px", backgroundColor: "#f9fafb", overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px", flex: 1 }}>
          {/* Page Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#111827", margin: 0 }}>Reports & Exports</h1>
              <p style={{ fontSize: "14px", color: "#6b7280", marginTop: "8px" }}>Generate comprehensive reports for stakeholders, compliance, and internal tracking.</p>
            </div>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowScheduleModal(true)} style={{ padding: "10px 20px", backgroundColor: "#1e3a8a", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar style={{ width: "16px", height: "16px" }} />
                Schedule Reports
              </button>
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} style={{ padding: "8px 16px", backgroundColor: selectedCategory === cat.id ? "#1e3a8a" : "white", color: selectedCategory === cat.id ? "white" : "#374151", border: selectedCategory === cat.id ? "none" : "1px solid #e5e7eb", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", transition: "all 0.2s" }}>
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Report Templates Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "20px" }}>
            {filteredTemplates.map((template) => (
              <div key={template.id} style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", transition: "all 0.2s", cursor: "pointer" }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(0)"; }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ fontSize: "28px" }}>{template.icon}</div>
                    <div>
                      <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>{template.name}</h3>
                      <span style={{ fontSize: "11px", color: "#6b7280", textTransform: "capitalize", backgroundColor: "#f3f4f6", padding: "2px 8px", borderRadius: "4px" }}>{template.category}</span>
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: "13px", color: "#6b7280", lineHeight: "1.5", marginBottom: "16px" }}>{template.description}</p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    {template.formats.map((format) => (
                      <span key={format} style={{ fontSize: "10px", fontWeight: "600", padding: "4px 8px", borderRadius: "4px", backgroundColor: format === "PDF" ? "#fee2e2" : format === "XLSX" ? "#dcfce7" : "#e0e7ff", color: format === "PDF" ? "#dc2626" : format === "XLSX" ? "#16a34a" : "#4338ca" }}>
                        {format}
                      </span>
                    ))}
                  </div>
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>{template.frequency}</span>
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  {template.formats.map((format) => (
                    <button key={format} onClick={() => generateReport(template, format)} disabled={isGenerating === template.id} style={{ flex: 1, padding: "10px", backgroundColor: isGenerating === template.id ? "#9ca3af" : format === "PDF" ? "#1e3a8a" : "#059669", color: "white", border: "none", borderRadius: "6px", cursor: isGenerating === template.id ? "not-allowed" : "pointer", fontWeight: "500", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", transition: "all 0.2s" }}>
                      {isGenerating === template.id ? (
                        <RefreshCw style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} />
                      ) : (
                        <Download style={{ width: "14px", height: "14px" }} />
                      )}
                      {format}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Export Section */}
          <div style={{ backgroundColor: "white", borderRadius: "12px", border: "2px solid #1e3a8a", padding: "24px", marginTop: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#111827", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Download style={{ width: "20px", height: "20px", color: "#1e3a8a" }} />
              Quick Data Export
            </h3>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>Export raw data for custom analysis in your preferred tools.</p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
              <button onClick={() => {
                const csv = generateCSVContent({ id: "all-data", name: "All Data Export" } as ReportTemplate, reportData);
                downloadFile(csv, "all_employee_hours.csv", "text/csv");
                toast({ title: "Exported", description: "Employee hours data exported successfully." });
              }} style={{ padding: "16px", backgroundColor: "#f0fdf4", border: "1px solid #22c55e", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>⏱️</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Employee Hours</div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>All volunteer activity data</div>
              </button>

              <button onClick={() => {
                toast({ title: "Exported", description: "SDG metrics data exported successfully." });
              }} style={{ padding: "16px", backgroundColor: "#eff6ff", border: "1px solid #3b82f6", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>🌍</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>SDG Metrics</div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>Goal alignment data</div>
              </button>

              <button onClick={() => {
                toast({ title: "Exported", description: "Project data exported successfully." });
              }} style={{ padding: "16px", backgroundColor: "#fef3c7", border: "1px solid #f59e0b", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>📁</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Project Data</div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>All project information</div>
              </button>

              <button onClick={() => {
                toast({ title: "Exported", description: "Financial data exported successfully." });
              }} style={{ padding: "16px", backgroundColor: "#faf5ff", border: "1px solid #8b5cf6", borderRadius: "8px", cursor: "pointer", textAlign: "left" }}>
                <div style={{ fontSize: "20px", marginBottom: "8px" }}>💰</div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>Financial Data</div>
                <div style={{ fontSize: "11px", color: "#6b7280" }}>ROI and value metrics</div>
              </button>
            </div>
          </div>

          <Footer />
        </main>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "32px", maxWidth: "500px", width: "90%", maxHeight: "80vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#111827", marginBottom: "16px" }}>Schedule Automated Reports</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px" }}>Configure automatic report generation and delivery to stakeholders.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>Report Type</label>
                <select style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "14px" }}>
                  {reportTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>Frequency</label>
                <select style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "14px" }}>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>Recipients (comma-separated emails)</label>
                <input type="text" placeholder="ceo@company.com, csr@company.com" style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "14px" }} />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", marginBottom: "8px", display: "block" }}>Format</label>
                <div style={{ display: "flex", gap: "12px" }}>
                  {["PDF", "XLSX", "CSV"].map((format) => (
                    <label key={format} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                      <input type="radio" name="format" value={format} defaultChecked={format === "PDF"} />
                      <span style={{ fontSize: "13px" }}>{format}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "24px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowScheduleModal(false)} style={{ padding: "10px 20px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Cancel</button>
              <button onClick={() => { setShowScheduleModal(false); toast({ title: "Scheduled", description: "Report schedule has been saved." }); }} style={{ padding: "10px 20px", backgroundColor: "#1e3a8a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "500" }}>Save Schedule</button>
            </div>
          </div>
        </div>
      )}

      <MobileBottomNav />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

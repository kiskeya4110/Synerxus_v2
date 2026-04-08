import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import { useAuth } from "@/hooks/use-auth";
import { getAuthHeaders } from "@/lib/queryClient";
import { useState, useEffect, useCallback, lazy, Suspense, memo } from "react";
import DOMPurify from "dompurify";
import Logo from "@/components/ui/logo";
import OrganizationPWALayout from "@/components/layout/organization-pwa-layout";
import { CSRLayout } from "@/components/layout/csr-layout";
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
  ChevronRight,
  DollarSign,
  Receipt,
  PieChart,
  Activity,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  Eye,
} from "lucide-react";
import Footer from "@/components/layout/footer";
import CSRMobileNav, { CSRMobileHeader } from "@/components/layout/csr-mobile-nav";
import { useToast } from "@/hooks/use-toast";
import { getSDGColor, getSDGName } from "@/lib/sdg-utils";
import { usePlanFeatures } from "@/hooks/use-plan-features";
import { PlanGate } from "@/components/plan-gate";

// Lazy load heavy chart components for better initial load
const LazyLineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
const LazyBarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const LazyPieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));

// Regular imports for lighter chart parts
import {
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Pie,
  Cell
} from "recharts";

// Loading fallback for charts
const ChartSkeleton = memo(({ height = "h-[200px]" }: { height?: string }) => (
  <div className={`${height} bg-slate-100 animate-pulse rounded-lg flex items-center justify-center`}>
    <div className="text-slate-400 text-sm">Loading chart...</div>
  </div>
));
ChartSkeleton.displayName = "ChartSkeleton";

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

// MVP: PDF export only - no CSV per spec
const reportTemplates: ReportTemplate[] = [
  {
    id: "volunteer-hours",
    name: "Volunteer Hours Report",
    description: "Verified volunteer hours by employee with SDG breakdown.",
    category: "engagement",
    icon: "⏱️",
    formats: ["PDF"],
    frequency: "monthly",
  },
  {
    id: "sdg-impact",
    name: "SDG Impact Report",
    description: "Progress tracking against UN Sustainable Development Goals.",
    category: "impact",
    icon: "🌍",
    formats: ["PDF"],
    frequency: "quarterly",
  },
  {
    id: "employee-engagement",
    name: "Employee Engagement Report",
    description: "Participation rates and volunteer activity trends.",
    category: "engagement",
    icon: "👥",
    formats: ["PDF"],
    frequency: "monthly",
  },
  {
    id: "impact-summary",
    name: "Impact Summary Report",
    description: "Verified outcomes and beneficiary reach metrics.",
    category: "impact",
    icon: "📊",
    formats: ["PDF"],
    frequency: "quarterly",
  },
  {
    id: "esg-audit",
    name: "ESG Audit Report",
    description: "Audit-ready ESG data with verification timestamps.",
    category: "compliance",
    icon: "✅",
    formats: ["PDF"],
    frequency: "quarterly",
  },
];

// Financial tracking data types
interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  project?: string;
  submittedBy: string;
}

// Monthly spending data for charts
const monthlySpendingData = [
  { month: "Jan", budget: 15000, actual: 12500, projected: 13000 },
  { month: "Feb", budget: 15000, actual: 14200, projected: 14500 },
  { month: "Mar", budget: 18000, actual: 16800, projected: 17000 },
  { month: "Apr", budget: 18000, actual: 17500, projected: 18000 },
  { month: "May", budget: 20000, actual: 18200, projected: 19000 },
  { month: "Jun", budget: 20000, actual: 19500, projected: 20000 },
];

// Expense categories breakdown
const expenseCategoriesData = [
  { name: "Program Costs", value: 45000, color: "#3b82f6" },
  { name: "Volunteer Support", value: 25000, color: "#10b981" },
  { name: "Marketing", value: 12000, color: "#f59e0b" },
  { name: "Technology", value: 8000, color: "#8b5cf6" },
  { name: "Admin", value: 5000, color: "#ef4444" },
];

// Sample expense records
const sampleExpenses: ExpenseRecord[] = [
  { id: "EXP001", date: "2024-06-15", category: "Program Costs", description: "Community event supplies", amount: 1250, status: "approved", project: "Youth Mentorship", submittedBy: "Sarah Johnson" },
  { id: "EXP002", date: "2024-06-12", category: "Volunteer Support", description: "Volunteer training materials", amount: 850, status: "approved", project: "Skills Training", submittedBy: "Michael Chen" },
  { id: "EXP003", date: "2024-06-10", category: "Technology", description: "Volunteer management software", amount: 2500, status: "pending", submittedBy: "Admin" },
  { id: "EXP004", date: "2024-06-08", category: "Marketing", description: "Campaign materials", amount: 1800, status: "approved", project: "Food Bank Initiative", submittedBy: "Emily Davis" },
  { id: "EXP005", date: "2024-06-05", category: "Program Costs", description: "Transportation for volunteers", amount: 650, status: "pending", project: "Environmental Cleanup", submittedBy: "James Wilson" },
];

export default function CSRReportsExports() {
  const { user, dbUser } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<ReportTemplate | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [exportFormat, setExportFormat] = useState("PDF");
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"reports" | "expenses" | "budget">("reports");
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<number[]>([]);
  const [selectedOrgIds, setSelectedOrgIds] = useState<number[]>([]);
  const [filterOpenPanel, setFilterOpenPanel] = useState<string | null>(null);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    if (!filterOpenPanel) return;
    const close = () => setFilterOpenPanel(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [filterOpenPanel]);
  const [expenses, setExpenses] = useState(sampleExpenses);
  const planFeatures = usePlanFeatures();

  // Financial KPIs
  const totalBudget = 106000;
  const totalSpent = 98700;
  const remainingBudget = totalBudget - totalSpent;
  const budgetUtilization = Math.round((totalSpent / totalBudget) * 100);
  const pendingExpenses = expenses.filter(e => e.status === "pending").reduce((sum, e) => sum + e.amount, 0);

  // Fetch report data (re-fetches when entity filters change)
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/csr/reports-summary", userId, selectedEmployeeIds, selectedProjectIds, selectedOrgIds],
    queryFn: async () => {
      const params = new URLSearchParams({ userId: userId || '' });
      if (selectedEmployeeIds.length) params.set('employeeIds', selectedEmployeeIds.join(','));
      if (selectedProjectIds.length) params.set('projectIds', selectedProjectIds.join(','));
      if (selectedOrgIds.length) params.set('orgIds', selectedOrgIds.join(','));
      const response = await fetch(`/api/csr/impact-reporting?${params}`);
      if (!response.ok) throw new Error("Failed to fetch report data");
      return response.json();
    },
    enabled: !!userId,
  });

  // Fetch CSR dashboard data for company name
  const { data: csrDashboardData } = useQuery<any>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId,
  });

  // Use dbUser from auth context as the authoritative identity (immune to localStorage contamination)
  const currentUser = dbUser as any;
  const isOrganization = currentUser?.userType === 'organization';

  // Fetch organization dashboard data for organizations
  const { data: orgDashboardData } = useQuery<any>({
    queryKey: ["/api/dashboard/summary", userId],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/dashboard/summary`, { headers });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: isOrganization && !!userId
  });

  // Fetch unfiltered base data for populating filter dropdown options
  // Uses a stable query key without filter params so dropdowns always show all available options
  const { data: baseReportData } = useQuery<any>({
    queryKey: ["/api/csr/reports-base", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/impact-reporting?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId && !isOrganization,
  });

  // On desktop, org users go to the org dashboard reports tab (not CSR layout)
  useEffect(() => {
    if (isOrganization && !isMobile) {
      navigate('/organization-dashboard?tab=reports');
    }
  }, [isOrganization, isMobile, navigate]);

  const handleOrgRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/users/me", userId] });
    await queryClient.invalidateQueries({ queryKey: ["/api/dashboard/summary", userId] });
    await queryClient.invalidateQueries({ queryKey: ["/api/csr/reports-summary", userId] });
  }, [queryClient, userId]);

  const companyName = csrDashboardData?.companyName || csrDashboardData?.partners?.[0]?.companyName || "Your Company";
  const adminName = user?.displayName || user?.email?.split('@')[0] || "Admin";
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Filter option lists derived from unfiltered base report data
  const employeeOptions: { id: number; name: string }[] = baseReportData?.employeeList || [];
  const projectOptions: { id: number; name: string }[] = (baseReportData?.projectMetrics || [])
    .filter((p: any) => p.id)
    .map((p: any) => ({ id: p.id as number, name: p.name as string }));
  const orgOptions: { id: number; name: string }[] = baseReportData?.orgList || [];

  // Build a "Filtered by" label for the PDF header
  const filterLabelParts: string[] = [];
  if (selectedEmployeeIds.length) {
    const names = employeeOptions.filter(e => selectedEmployeeIds.includes(e.id)).map(e => e.name);
    if (names.length) filterLabelParts.push(`Employees: ${names.join(', ')}`);
  }
  if (selectedProjectIds.length) {
    const names = projectOptions.filter(p => selectedProjectIds.includes(p.id)).map(p => p.name);
    if (names.length) filterLabelParts.push(`Projects: ${names.join(', ')}`);
  }
  if (selectedOrgIds.length) {
    const names = orgOptions.filter(o => selectedOrgIds.includes(o.id)).map(o => o.name);
    if (names.length) filterLabelParts.push(`NGO Partners: ${names.join(', ')}`);
  }
  const activeFilterLabel = filterLabelParts.length ? `Filtered by: ${filterLabelParts.join(' | ')}` : '';

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

  // MVP: PDF export only
  const generateReport = async (template: ReportTemplate, format: string) => {
    setIsGenerating(template.id);

    try {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1500));

      // PDF generation only for MVP
      const htmlContent = isOrganization
        ? generateOrgPDFContent(template, activeFilterLabel)
        : generatePDFContent(template, reportData, activeFilterLabel);
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(DOMPurify.sanitize(htmlContent, { WHOLE_DOCUMENT: true }));
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
      }

      toast({
        title: "Report Generated",
        description: `${template.name} PDF has been generated successfully.`,
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

  const generateOrgPDFContent = (template: ReportTemplate, filterLabel: string = '') => {
    const orgName = currentUser?.name || currentUser?.displayName || "Organization";
    const totalHours = orgDashboardData?.totalHours || 0;
    const activeVolunteers = orgDashboardData?.activeVolunteers || 0;
    const activeProjects = orgDashboardData?.activeProjects || 0;
    const sdgsAddressed = orgDashboardData?.sdgsAddressed || 0;
    const sdgMetrics = reportData?.sdgMetrics || [];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.name} - ${orgName}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 28mm 60mm;
              @top-center { content: none; }
              @bottom-center { content: none; }
              @bottom-left { content: none; }
              @bottom-right { content: none; }
            }
            @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { -webkit-print-color-adjust: exact; } }
            @media print { html, body { margin: 0 !important; } }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 48px 0; color: #333; background: #fff; }

            .report-section {
              page-break-before: always;
              break-before: page;
            }
            .report-section-cover {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 48px;
              padding-bottom: 32px;
              border-bottom: 3px solid #f59e0b;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .header-left { flex: 2; }
            .header-right {
              flex: 1;
              background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
              padding: 16px;
              border-radius: 12px;
              border: 2px solid #f59e0b;
            }

            .logo-container {
              display: flex;
              align-items: center;
              gap: 16px;
              margin-bottom: 16px;
            }
            .company-divider { width: 2px; height: 32px; background: #d1d5db; margin: 0 8px; }
            .company-name { font-size: 18px; font-weight: 600; color: #374151; }

            .report-title { font-size: 32px; font-weight: 700; color: #111827; margin-bottom: 8px; }
            .report-subtitle { display: inline-flex; align-items: center; gap: 8px; margin-bottom: 12px; }
            .verified-badge {
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white; font-size: 10px; font-weight: 700;
              padding: 4px 12px; border-radius: 20px;
              text-transform: uppercase; letter-spacing: 0.5px;
            }
            .report-type { font-size: 18px; font-weight: 600; color: #6b7280; font-style: italic; }
            .report-meta { display: flex; align-items: center; gap: 12px; font-size: 13px; color: #6b7280; margin-top: 8px; }
            .meta-divider { color: #d1d5db; }
            .blockchain-verified { display: flex; align-items: center; gap: 4px; color: #f59e0b; font-weight: 600; }

            .impact-score-box h4 { font-size: 11px; color: #d97706; text-transform: uppercase; font-weight: 700; margin-bottom: 8px; letter-spacing: 0.5px; }
            .impact-score-value { font-size: 36px; font-weight: 800; color: #92400e; }
            .impact-score-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

            h2 {
              font-size: 20px; font-weight: 700; color: #92400e;
              margin: 0 0 16px 0; padding-bottom: 8px;
              border-bottom: 2px solid #f59e0b;
              page-break-after: avoid;
              break-after: avoid;
            }
            h2 + * {
              page-break-before: avoid;
              break-before: avoid;
            }
            .report-section {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 24px 0; page-break-inside: avoid; break-inside: avoid; }
            .metric-card {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; text-align: center;
              page-break-inside: avoid; break-inside: avoid;
            }
            .metric-card.orange { border-left: 4px solid #f59e0b; }
            .metric-card.green { border-left: 4px solid #10b981; }
            .metric-card.blue { border-left: 4px solid #3b82f6; }
            .metric-card.purple { border-left: 4px solid #8b5cf6; }
            .metric-value { font-size: 28px; font-weight: 800; color: #92400e; }
            .metric-label { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.3px; }

            table { width: 100%; border-collapse: collapse; margin: 24px 0; border-radius: 8px; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
            th { background: linear-gradient(135deg, #92400e 0%, #b45309 100%); color: white; padding: 14px 16px; text-align: left; font-weight: 600; font-size: 13px; }
            td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            tr:nth-child(even) { background: #f9fafb; }
            .sdg-badge { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; color: white; font-weight: 700; font-size: 12px; margin-right: 8px; }
            .sdg-name { font-weight: 500; }
            .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; }
            .progress-fill { height: 100%; background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%); border-radius: 4px; }

            .report-footer { margin-top: 56px; padding-top: 32px; border-top: 2px solid #e5e7eb; text-align: center; page-break-inside: avoid; break-inside: avoid; }
            .footer-logo { display: flex; justify-content: center; align-items: center; gap: 4px; margin-bottom: 12px; }
            .footer-tagline { font-size: 12px; color: #6b7280; font-style: italic; margin-bottom: 12px; }
            .footer-generated { font-size: 13px; color: #374151; margin-bottom: 8px; }
            .footer-confidential { font-size: 11px; color: #9ca3af; padding: 8px 16px; background: #f9fafb; border-radius: 6px; display: inline-block; }
            .footer-copyright { font-size: 11px; color: #9ca3af; margin-top: 16px; }

            .sdg-watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.03; pointer-events: none; z-index: -1; }
          </style>
        </head>
        <body>
          <div class="sdg-watermark">
            <svg viewBox="0 0 200 200" width="600" height="600">
              ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map((sdg, index) => {
                const anglePerSegment = (2 * Math.PI) / 17;
                const startAngle = index * anglePerSegment - Math.PI / 2;
                const endAngle = startAngle + anglePerSegment;
                const center = 100, outerRadius = 95, innerRadius = 30;
                const x1 = center + innerRadius * Math.cos(startAngle);
                const y1 = center + innerRadius * Math.sin(startAngle);
                const x2 = center + outerRadius * Math.cos(startAngle);
                const y2 = center + outerRadius * Math.sin(startAngle);
                const x3 = center + outerRadius * Math.cos(endAngle);
                const y3 = center + outerRadius * Math.sin(endAngle);
                const x4 = center + innerRadius * Math.cos(endAngle);
                const y4 = center + innerRadius * Math.sin(endAngle);
                return `<path d="M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z" fill="${getSDGColor(sdg)}" />`;
              }).join("")}
              <circle cx="100" cy="100" r="28" fill="white"/>
            </svg>
          </div>

          <!-- Report Header (Cover) -->
          <div class="report-section-cover">
            <div class="report-header">
              <div class="header-left">
                <div class="logo-container">
                  <img src="${window.location.origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 36px; width: auto;" />
                  <div class="company-divider"></div>
                  <div class="company-name">${orgName}</div>
                </div>
                <div class="report-title">${orgName}</div>
                <div class="report-subtitle">
                  <span class="verified-badge">✓ Verified</span>
                  <span class="report-type">${template.name}</span>
                </div>
                <div class="report-meta">
                  <span>📅 ${currentDate}</span>
                  <span class="meta-divider">|</span>
                  <span class="blockchain-verified">✓ Blockchain Verified</span>
                </div>
                ${filterLabel ? `<div style="margin-top: 8px; font-size: 12px; color: #6b7280;">🔍 ${filterLabel}</div>` : ''}
              </div>
              <div class="header-right">
                <div class="impact-score-box">
                  <h4>SDGs Addressed</h4>
                  <div class="impact-score-value">${sdgsAddressed}</div>
                  <div class="impact-score-label">UN Global Goals</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Key Metrics -->
          <div class="report-section">
            <h2>Key Performance Metrics</h2>
            <div class="metric-grid">
              <div class="metric-card orange">
                <div class="metric-value">${totalHours.toLocaleString()}</div>
                <div class="metric-label">Total Volunteer Hours</div>
              </div>
              <div class="metric-card green">
                <div class="metric-value">${activeVolunteers.toLocaleString()}</div>
                <div class="metric-label">Active Volunteers</div>
              </div>
              <div class="metric-card blue">
                <div class="metric-value">${activeProjects}</div>
                <div class="metric-label">Active Projects</div>
              </div>
              <div class="metric-card purple">
                <div class="metric-value">${sdgsAddressed}</div>
                <div class="metric-label">SDGs Addressed</div>
              </div>
            </div>
          </div>

          <!-- SDG Alignment -->
          <div class="report-section">
            <h2>SDG Alignment & Impact</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 40%">SDG Goal</th>
                  <th style="width: 25%">Hours Contributed</th>
                  <th style="width: 20%">Progress</th>
                  <th style="width: 15%">% of Total</th>
                </tr>
              </thead>
              <tbody>
                ${sdgMetrics.slice(0, 8).map((sdg: any) => `
                  <tr>
                    <td>
                      <span class="sdg-badge" style="background-color: ${getSDGColor(sdg.goal)}">${sdg.goal}</span>
                      <span class="sdg-name">${getSDGName(sdg.goal)}</span>
                    </td>
                    <td>${(sdg.hours || 0).toLocaleString()} hrs</td>
                    <td>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${sdg.percentage || 0}%"></div>
                      </div>
                    </td>
                    <td><strong>${sdg.percentage || 0}%</strong></td>
                  </tr>
                `).join("") || `
                  <tr>
                    <td colspan="4" style="text-align: center; color: #6b7280; padding: 24px;">
                      No SDG data available for this period
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <div class="report-footer">
            <div class="footer-logo">
              <img src="${window.location.origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 28px; width: auto;" />
            </div>
            <div class="footer-tagline"><span style="color:#D4980C;">Impact,</span> <span style="color:#0A2463;">Verified.</span></div>
            <div class="footer-generated">
              Generated on ${currentDate} • ${template.name}
            </div>
            <div class="footer-confidential">
              This report contains confidential information. Distribution is restricted to authorized personnel.
            </div>
            <div class="footer-copyright">
              © ${new Date().getFullYear()} Synerxus. All rights reserved. | support@synerxus.com
            </div>
          </div>
        </body>
      </html>
    `;
  };

  const generatePDFContent = (template: ReportTemplate, data: any, filterLabel: string = '') => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 28mm 60mm;
              @top-center { content: none; }
              @bottom-center { content: none; }
              @bottom-left { content: none; }
              @bottom-right { content: none; }
            }
            @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { -webkit-print-color-adjust: exact; } }
            @media print { html, body { margin: 0 !important; } }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 48px 0; color: #333; background: #fff; }

            /* Section page breaks */
            .report-section {
              page-break-before: always;
              break-before: page;
            }
            .report-section-cover {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            /* Header Styles - Matching Volunteer/Org Reports */
            .report-header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 48px;
              padding-bottom: 32px;
              border-bottom: 3px solid #10b981;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .header-left { flex: 2; }
            .header-right {
              flex: 1;
              background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
              padding: 16px;
              border-radius: 12px;
              border: 2px solid #3b82f6;
            }

            /* Synerxus Logo */
            .logo-container {
              display: flex;
              align-items: center;
              gap: 16px;
              margin-bottom: 16px;
            }
            .company-divider {
              width: 2px;
              height: 32px;
              background: #d1d5db;
              margin: 0 8px;
            }
            .company-name {
              font-size: 18px;
              font-weight: 600;
              color: #374151;
            }

            /* Report Title */
            .report-title {
              font-size: 32px;
              font-weight: 700;
              color: #111827;
              margin-bottom: 8px;
            }
            .report-subtitle {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              margin-bottom: 12px;
            }
            .verified-badge {
              background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
              color: white;
              font-size: 10px;
              font-weight: 700;
              padding: 4px 12px;
              border-radius: 20px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .report-type {
              font-size: 18px;
              font-weight: 600;
              color: #6b7280;
              font-style: italic;
            }

            /* Date & Meta Info */
            .report-meta {
              display: flex;
              align-items: center;
              gap: 12px;
              font-size: 13px;
              color: #6b7280;
              margin-top: 8px;
            }
            .meta-divider { color: #d1d5db; }
            .blockchain-verified {
              display: flex;
              align-items: center;
              gap: 4px;
              color: #10b981;
              font-weight: 600;
            }

            /* Impact Score Box */
            .impact-score-box h4 {
              font-size: 11px;
              color: #3b82f6;
              text-transform: uppercase;
              font-weight: 700;
              margin-bottom: 8px;
              letter-spacing: 0.5px;
            }
            .impact-score-value {
              font-size: 36px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .impact-score-label {
              font-size: 12px;
              color: #6b7280;
              margin-top: 4px;
            }

            /* Section Headers */
            h2 {
              font-size: 20px;
              font-weight: 700;
              color: #1e3a8a;
              margin: 0 0 16px 0;
              padding-bottom: 8px;
              border-bottom: 2px solid #10b981;
              page-break-after: avoid;
              break-after: avoid;
            }
            h2 + * {
              page-break-before: avoid;
              break-before: avoid;
            }
            .report-section {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            /* Metric Grid */
            .metric-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
              margin: 24px 0;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .metric-card {
              background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 20px;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .metric-card.blue { border-left: 4px solid #3b82f6; }
            .metric-card.green { border-left: 4px solid #10b981; }
            .metric-card.purple { border-left: 4px solid #8b5cf6; }
            .metric-card.orange { border-left: 4px solid #f59e0b; }
            .metric-value {
              font-size: 28px;
              font-weight: 800;
              color: #1e3a8a;
            }
            .metric-label {
              font-size: 12px;
              color: #6b7280;
              margin-top: 4px;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }

            /* SDG Table */
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 24px 0;
              border-radius: 8px;
              overflow: hidden;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            th {
              background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
              color: white;
              padding: 14px 16px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
            }
            td {
              padding: 12px 16px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            tr:nth-child(even) { background: #f9fafb; }
            tr:hover { background: #f3f4f6; }
            .sdg-badge {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 28px;
              height: 28px;
              border-radius: 6px;
              color: white;
              font-weight: 700;
              font-size: 12px;
              margin-right: 8px;
            }
            .sdg-name { font-weight: 500; }

            /* Progress Bar */
            .progress-bar {
              width: 100%;
              height: 8px;
              background: #e5e7eb;
              border-radius: 4px;
              overflow: hidden;
            }
            .progress-fill {
              height: 100%;
              background: linear-gradient(90deg, #10b981 0%, #14b8a6 100%);
              border-radius: 4px;
            }

            /* Footer - Matching Volunteer/Org Reports */
            .report-footer {
              margin-top: 56px;
              padding-top: 32px;
              border-top: 2px solid #e5e7eb;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .footer-logo {
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 4px;
              margin-bottom: 12px;
            }
            .footer-tagline {
              font-size: 12px;
              color: #6b7280;
              font-style: italic;
              margin-bottom: 12px;
            }
            .footer-generated {
              font-size: 13px;
              color: #374151;
              margin-bottom: 8px;
            }
            .footer-confidential {
              font-size: 11px;
              color: #9ca3af;
              padding: 8px 16px;
              background: #f9fafb;
              border-radius: 6px;
              display: inline-block;
            }
            .footer-copyright {
              font-size: 11px;
              color: #9ca3af;
              margin-top: 16px;
            }

            /* SDG Wheel Watermark */
            .sdg-watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              opacity: 0.03;
              pointer-events: none;
              z-index: -1;
            }
          </style>
        </head>
        <body>
          <!-- SDG Wheel Watermark -->
          <div class="sdg-watermark">
            <svg viewBox="0 0 200 200" width="600" height="600">
              ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map((sdg, index) => {
                const anglePerSegment = (2 * Math.PI) / 17;
                const startAngle = index * anglePerSegment - Math.PI / 2;
                const endAngle = startAngle + anglePerSegment;
                const center = 100;
                const outerRadius = 95;
                const innerRadius = 30;
                const x1 = center + innerRadius * Math.cos(startAngle);
                const y1 = center + innerRadius * Math.sin(startAngle);
                const x2 = center + outerRadius * Math.cos(startAngle);
                const y2 = center + outerRadius * Math.sin(startAngle);
                const x3 = center + outerRadius * Math.cos(endAngle);
                const y3 = center + outerRadius * Math.sin(endAngle);
                const x4 = center + innerRadius * Math.cos(endAngle);
                const y4 = center + innerRadius * Math.sin(endAngle);
                return `<path d="M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1} Z" fill="${getSDGColor(sdg)}" />`;
              }).join("")}
              <circle cx="100" cy="100" r="28" fill="white"/>
            </svg>
          </div>

          <!-- Report Header (Cover) -->
          <div class="report-section-cover">
            <div class="report-header">
              <div class="header-left">
                <div class="logo-container">
                  <img src="${window.location.origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 36px; width: auto;" />
                  <div class="company-divider"></div>
                  <div class="company-name">${companyName}</div>
                </div>

                <div class="report-title">${companyName}</div>
                <div class="report-subtitle">
                  <span class="verified-badge">✓ Verified</span>
                  <span class="report-type">${template.name}</span>
                </div>

                <div class="report-meta">
                  <span>📅 ${currentDate}</span>
                  <span class="meta-divider">|</span>
                  <span class="blockchain-verified">✓ Blockchain Verified</span>
                </div>
                ${filterLabel ? `<div style="margin-top: 8px; font-size: 12px; color: #6b7280;">🔍 ${filterLabel}</div>` : ''}
              </div>

              <div class="header-right">
                <div class="impact-score-box">
                  <h4>Overall Impact Score</h4>
                  <div class="impact-score-value">${data?.impactMetrics?.impactScore || Math.round((data?.engagementMetrics?.participationRate || 0) * 0.8 + 20)}</div>
                  <div class="impact-score-label">out of 100</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Key Metrics -->
          <div class="report-section">
            <h2>Key Performance Metrics</h2>
            <div class="metric-grid">
              <div class="metric-card blue">
                <div class="metric-value">${(data?.engagementMetrics?.totalHours || 0).toLocaleString()}</div>
                <div class="metric-label">Total Volunteer Hours</div>
              </div>
              <div class="metric-card green">
                <div class="metric-value">${data?.engagementMetrics?.activeEmployees || 0}</div>
                <div class="metric-label">Active Employees</div>
              </div>
              <div class="metric-card purple">
                <div class="metric-value">${data?.engagementMetrics?.participationRate || 0}%</div>
                <div class="metric-label">Participation Rate</div>
              </div>
              <div class="metric-card orange">
                <div class="metric-value">${(data?.impactMetrics?.directBeneficiaries || 0).toLocaleString()}</div>
                <div class="metric-label">Direct Beneficiaries</div>
              </div>
              <div class="metric-card blue">
                <div class="metric-value">$${Math.round((data?.financialMetrics?.volunteerHourValue || 0) / 1000)}K</div>
                <div class="metric-label">Economic Value</div>
              </div>
              <div class="metric-card green">
                <div class="metric-value">${data?.financialMetrics?.roi || 0}%</div>
                <div class="metric-label">Return on Investment</div>
              </div>
            </div>
          </div>

          <!-- SDG Alignment -->
          <div class="report-section">
            <h2>SDG Alignment & Impact</h2>
            <table>
              <thead>
                <tr>
                  <th style="width: 40%">SDG Goal</th>
                  <th style="width: 25%">Hours Contributed</th>
                  <th style="width: 20%">Progress</th>
                  <th style="width: 15%">% of Total</th>
                </tr>
              </thead>
              <tbody>
                ${(data?.sdgMetrics || []).slice(0, 8).map((sdg: any) => `
                  <tr>
                    <td>
                      <span class="sdg-badge" style="background-color: ${getSDGColor(sdg.goal)}">${sdg.goal}</span>
                      <span class="sdg-name">${getSDGName(sdg.goal)}</span>
                    </td>
                    <td>${(sdg.hours || 0).toLocaleString()} hrs</td>
                    <td>
                      <div class="progress-bar">
                        <div class="progress-fill" style="width: ${sdg.percentage || 0}%"></div>
                      </div>
                    </td>
                    <td><strong>${sdg.percentage || 0}%</strong></td>
                  </tr>
                `).join("") || `
                  <tr>
                    <td colspan="4" style="text-align: center; color: #6b7280; padding: 24px;">
                      No SDG data available for this period
                    </td>
                  </tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- Report Footer -->
          <div class="report-footer">
            <div class="footer-logo">
              <img src="${window.location.origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 28px; width: auto;" />
            </div>
            <div class="footer-tagline"><span style="color:#D4980C;">Impact,</span> <span style="color:#0A2463;">Verified.</span></div>
            <div class="footer-generated">
              Generated on ${currentDate} • ${template.name}
            </div>
            <div class="footer-confidential">
              This report contains confidential information. Distribution is restricted to authorized personnel.
            </div>
            <div class="footer-copyright">
              © ${new Date().getFullYear()} Synerxus. All rights reserved. | support@synerxus.com
            </div>
          </div>
        </body>
      </html>
    `;
  };

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#faf9f7", overflow: "hidden" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>📄</div>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Loading reports...</p>
        </div>
      </div>
    );
  }

  // Organization Mobile PWA View (excludes corporate CSR elements)
  if (isOrganization && isMobile) {
    // Filter templates to exclude corporate-specific ones
    const orgReportTemplates = reportTemplates.filter(t =>
      !['employee-engagement', 'bcorp-compliance', 'esg-scorecard'].includes(t.id)
    );

    const orgCategories = [
      { id: "all", label: "All Reports", icon: "📄" },
      { id: "impact", label: "Impact", icon: "🌍" },
      { id: "compliance", label: "Compliance", icon: "✅" },
      { id: "financial", label: "Financial", icon: "💰" },
    ];

    const orgFilteredTemplates = selectedCategory === "all"
      ? orgReportTemplates
      : orgReportTemplates.filter(t => t.category === selectedCategory);

    return (
      <OrganizationPWALayout
        activeTab="reports"
        onRefresh={handleOrgRefresh}
        metrics={{
          activeProjects: orgDashboardData?.activeProjects || 0,
          activeVolunteers: orgDashboardData?.activeVolunteers || 0,
          totalHours: orgDashboardData?.totalHours || 0,
          sdgsAddressed: orgDashboardData?.sdgsAddressed || 0,
        }}
      >
        <div className="p-4 pb-20 space-y-4">
          {/* Page Title */}
          <div className="mb-4">
            <h1 className="text-xl font-bold text-gray-900">Analytics & Reports</h1>
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
                    ? 'bg-orange-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
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
                          format === 'PDF' ? 'bg-red-100 text-red-700 border border-red-200' :
                          format === 'XLSX' ? 'bg-green-100 text-green-700 border border-green-200' :
                          'bg-blue-100 text-blue-700 border border-blue-200'
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
                          format === 'PDF' ? 'bg-orange-600 text-white' : 'bg-emerald-600 text-white'
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
                    toast({ title: "Exported", description: "Volunteer hours data exported." });
                  }}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">⏱️</div>
                  <div className="text-slate-800 text-[10px] font-semibold">Volunteer Hours</div>
                </button>
                <button
                  onClick={() => toast({ title: "Exported", description: "SDG metrics data exported." })}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">🌍</div>
                  <div className="text-slate-800 text-[10px] font-semibold">SDG Metrics</div>
                </button>
                <button
                  onClick={() => toast({ title: "Exported", description: "Project data exported." })}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">📁</div>
                  <div className="text-slate-800 text-[10px] font-semibold">Projects</div>
                </button>
                <button
                  onClick={() => toast({ title: "Exported", description: "Impact data exported." })}
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

  // CSR Mobile PWA View (for corporate users)
  if (isMobile) {
    return (
      <div className="h-screen bg-[#faf9f7] flex flex-col max-w-[428px] mx-auto overflow-hidden">
        <CSRMobileHeader title="Reports & Exports" companyName={companyName} showBackButton onBack={() => navigate('/csr-dashboard')} />

        <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3">
          {/* Category Pills - Light colors for better contrast */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap flex items-center gap-1 shadow-sm ${
                  selectedCategory === cat.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Report Templates - Light backgrounds */}
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
                          format === 'PDF' ? 'bg-red-100 text-red-700 border border-red-200' :
                          format === 'XLSX' ? 'bg-green-100 text-green-700 border border-green-200' :
                          'bg-blue-100 text-blue-700 border border-blue-200'
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
                          format === 'PDF' ? 'bg-blue-600 text-white' : 'bg-emerald-600 text-white'
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

          {/* Quick Export Section - Light background */}
          <PlanGate feature="csvExport" hasAccess={planFeatures.csvExport}>
            <div className="mt-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200 shadow-sm">
              <h3 className="text-slate-900 text-sm font-semibold mb-2 flex items-center gap-1.5">
                <Download className="w-4 h-4 text-blue-600" />
                Quick Data Export
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const csv = generateCSVContent({ id: "all-data", name: "All Data Export" } as ReportTemplate, reportData);
                    downloadFile(csv, "all_employee_hours.csv", "text/csv");
                    toast({ title: "Exported", description: "Employee hours data exported." });
                  }}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">⏱️</div>
                  <div className="text-slate-800 text-[10px] font-semibold">Employee Hours</div>
                </button>
                <button
                  onClick={() => toast({ title: "Exported", description: "SDG metrics data exported." })}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">🌍</div>
                  <div className="text-slate-800 text-[10px] font-semibold">SDG Metrics</div>
                </button>
                <button
                  onClick={() => toast({ title: "Exported", description: "Project data exported." })}
                  className="p-2 bg-white rounded-lg text-left border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors"
                >
                  <div className="text-sm mb-0.5">📁</div>
                  <div className="text-slate-800 text-[10px] font-semibold">Projects</div>
                </button>
                <button
                  onClick={() => toast({ title: "Exported", description: "Financial data exported." })}
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

  return (
    <CSRLayout activeNav="reports" title="Reports & Financial Tracking" subtitle="Generate reports, track expenses, and manage CSR program budget.">
          {/* Action Buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
            <div style={{ display: "flex", gap: "12px" }}>
              {activeTab === "expenses" && (
                <button onClick={() => setShowExpenseModal(true)} style={{ padding: "10px 20px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Receipt style={{ width: "16px", height: "16px" }} />
                  Add Expense
                </button>
              )}
              <button onClick={() => setShowScheduleModal(true)} style={{ padding: "10px 20px", backgroundColor: "#1e3a8a", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Calendar style={{ width: "16px", height: "16px" }} />
                Schedule Reports
              </button>
            </div>
          </div>

          {/* Main Tab Navigation */}
          <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #e5e7eb", paddingBottom: "12px" }}>
            {[
              { id: "reports", label: "Reports", icon: <FileText style={{ width: "16px", height: "16px" }} /> },
              { id: "expenses", label: "Expense Tracking", icon: <Receipt style={{ width: "16px", height: "16px" }} /> },
              { id: "budget", label: "Budget Overview", icon: <Wallet style={{ width: "16px", height: "16px" }} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: activeTab === tab.id ? "#1e3a8a" : "white",
                  color: activeTab === tab.id ? "white" : "#374151",
                  border: activeTab === tab.id ? "none" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "all 0.2s",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Financial KPI Cards */}
          {(activeTab === "expenses" || activeTab === "budget") && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #3b82f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Budget</div>
                  <DollarSign style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#3b82f6", marginTop: "8px" }}>${Math.round(totalBudget / 1000)}K</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Annual allocation</div>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #10b981" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Total Spent</div>
                  <CreditCard style={{ width: "20px", height: "20px", color: "#10b981" }} />
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981", marginTop: "8px" }}>${Math.round(totalSpent / 1000)}K</div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                  <ArrowUpRight style={{ width: "12px", height: "12px", color: "#10b981" }} />
                  <span style={{ fontSize: "11px", color: "#10b981" }}>{budgetUtilization}% utilized</span>
                </div>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #f59e0b" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Remaining</div>
                  <Wallet style={{ width: "20px", height: "20px", color: "#f59e0b" }} />
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b", marginTop: "8px" }}>${formatDecimal(remainingBudget / 1000)}K</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{100 - budgetUtilization}% available</div>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #8b5cf6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Pending Approval</div>
                  <Clock style={{ width: "20px", height: "20px", color: "#8b5cf6" }} />
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#8b5cf6", marginTop: "8px" }}>${formatDecimal(pendingExpenses / 1000)}K</div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{expenses.filter(e => e.status === "pending").length} expenses</div>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #059669" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Cost per Beneficiary</div>
                  <Activity style={{ width: "20px", height: "20px", color: "#059669" }} />
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669", marginTop: "8px" }}>$12.50</div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
                  <ArrowDownRight style={{ width: "12px", height: "12px", color: "#059669" }} />
                  <span style={{ fontSize: "11px", color: "#059669" }}>-8% vs last year</span>
                </div>
              </div>
            </div>
          )}

          {/* Expense Tracking Tab */}
          {activeTab === "expenses" && (
            <>
              {/* Expense Table */}
              <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
                <div style={{ padding: "20px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", margin: 0 }}>Recent Expenses</h3>
                  <button onClick={() => { toast({ title: "Exported", description: "Expense report exported." }); }} style={{ padding: "8px 16px", backgroundColor: "#f3f4f6", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Download style={{ width: "14px", height: "14px" }} />
                    Export CSV
                  </button>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f9fafb" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>ID</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>Date</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>Category</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>Description</th>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>Project</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>Amount</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: "600", fontSize: "12px", color: "#6b7280" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((expense) => (
                      <tr key={expense.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>{expense.id}</td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151" }}>{expense.date}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ fontSize: "12px", padding: "4px 8px", backgroundColor: "#f3f4f6", borderRadius: "4px", color: "#374151" }}>{expense.category}</span>
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#374151" }}>{expense.description}</td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "#6b7280" }}>{expense.project || "-"}</td>
                        <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: "600", color: "#111827", textAlign: "right" }}>${expense.amount.toLocaleString()}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            backgroundColor: expense.status === "approved" ? "#dcfce7" : expense.status === "pending" ? "#fef3c7" : "#fee2e2",
                            color: expense.status === "approved" ? "#15803d" : expense.status === "pending" ? "#92400e" : "#dc2626",
                          }}>
                            {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          {expense.status === "pending" && (
                            <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                              <button
                                onClick={() => {
                                  setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, status: "approved" } : e));
                                  toast({ title: "Approved", description: `Expense ${expense.id} approved.` });
                                }}
                                style={{ padding: "4px 8px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setExpenses(prev => prev.map(e => e.id === expense.id ? { ...e, status: "rejected" } : e));
                                  toast({ title: "Rejected", description: `Expense ${expense.id} rejected.` });
                                }}
                                style={{ padding: "4px 8px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                          {expense.status !== "pending" && (
                            <button style={{ padding: "4px 8px", backgroundColor: "#f3f4f6", color: "#374151", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>
                              <Eye style={{ width: "12px", height: "12px" }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Budget Overview Tab */}
          {activeTab === "budget" && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
                {/* Spending Trend Chart */}
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Budget vs Actual Spending</h3>
                  <Suspense fallback={<ChartSkeleton height="h-[300px]" />}>
                    <ResponsiveContainer width="100%" height={300}>
                      <LazyBarChart data={monthlySpendingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `$${v/1000}K`} />
                        <Tooltip contentStyle={{ backgroundColor: "#1e3a8a", border: "none", borderRadius: "8px", color: "white" }} formatter={(value: number) => `$${value.toLocaleString()}`} />
                        <Bar dataKey="budget" fill="#e5e7eb" name="Budget" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="actual" fill="#3b82f6" name="Actual" radius={[4, 4, 0, 0]} />
                      </LazyBarChart>
                    </ResponsiveContainer>
                  </Suspense>
                  <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "12px", height: "12px", backgroundColor: "#e5e7eb", borderRadius: "2px" }} />
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>Budget</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: "12px", height: "12px", backgroundColor: "#3b82f6", borderRadius: "2px" }} />
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>Actual</span>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown Pie Chart */}
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Spending by Category</h3>
                  <Suspense fallback={<ChartSkeleton />}>
                    <ResponsiveContainer width="100%" height={200}>
                      <LazyPieChart>
                        <Pie
                          data={expenseCategoriesData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={40}
                        >
                          {expenseCategoriesData.map((entry, index) => (
                            <Cell key={index} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                      </LazyPieChart>
                    </ResponsiveContainer>
                  </Suspense>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "16px" }}>
                    {expenseCategoriesData.map((cat) => (
                      <div key={cat.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "10px", height: "10px", backgroundColor: cat.color, borderRadius: "2px" }} />
                        <span style={{ flex: 1, fontSize: "12px", color: "#374151" }}>{cat.name}</span>
                        <span style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>${Math.round(cat.value / 1000)}K</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Budget Alerts */}
              <div style={{ backgroundColor: "#fef3c7", border: "2px solid #f59e0b", borderRadius: "12px", padding: "20px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle style={{ width: "18px", height: "18px" }} />
                  Budget Alerts & Recommendations
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", backgroundColor: "white", borderRadius: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#374151" }}>• Technology spend is {Math.round((8000 / totalSpent) * 100)}% under budget - consider allocating to Q3 volunteer training</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", backgroundColor: "white", borderRadius: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#374151" }}>• Program costs trending 5% higher than projected - review vendor contracts</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", backgroundColor: "white", borderRadius: "6px" }}>
                    <span style={{ fontSize: "13px", color: "#374151" }}>• ${remainingBudget.toLocaleString()} remaining for {6} months - average ${Math.round(remainingBudget / 6).toLocaleString()}/month available</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Reports Tab - Original Content */}
          {activeTab === "reports" && (
            <>
          {/* Report Section Header with Synerxus branding */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #e5e7eb", marginBottom: "4px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <img src="/synerxus-esg-logo.png" alt="Synerxus" style={{ height: "36px", width: "auto" }} />
              <div style={{ width: "1px", height: "32px", backgroundColor: "#e5e7eb" }} />
              <div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>CSR / ESG Reports</div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>Verified impact data · Audit-ready exports</div>
              </div>
            </div>
            <span style={{ fontSize: "11px", fontWeight: "600", padding: "4px 12px", borderRadius: "20px", backgroundColor: "#dbeafe", color: "#1e40af" }}>✓ Blockchain Verified</span>
          </div>

          {/* Entity Filters */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", padding: "16px", backgroundColor: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151", display: "flex", alignItems: "center", gap: "6px" }}>
              <Filter style={{ width: "14px", height: "14px", color: "#6b7280" }} />
              Filter by:
            </span>

            {/* Employees dropdown — always visible */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setFilterOpenPanel(filterOpenPanel === 'employees' ? null : 'employees')}
                style={{ padding: "8px 14px", backgroundColor: selectedEmployeeIds.length ? "#eff6ff" : "white", color: selectedEmployeeIds.length ? "#1e40af" : "#374151", border: `1px solid ${selectedEmployeeIds.length ? "#3b82f6" : "#e5e7eb"}`, borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}
              >
                👥 Employees {selectedEmployeeIds.length > 0 ? `(${selectedEmployeeIds.length})` : ''}
                <span style={{ fontSize: "10px" }}>▼</span>
              </button>
              {filterOpenPanel === 'employees' && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "8px", minWidth: "220px", maxHeight: "220px", overflowY: "auto" }}
                >
                  {employeeOptions.length === 0 ? (
                    <div style={{ padding: "12px", fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>No employee data yet</div>
                  ) : employeeOptions.map(emp => (
                    <label key={emp.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", cursor: "pointer", borderRadius: "6px", fontSize: "13px", color: "#374151" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                    >
                      <input type="checkbox" checked={selectedEmployeeIds.includes(emp.id)} onChange={(e) => { if (e.target.checked) setSelectedEmployeeIds(prev => [...prev, emp.id]); else setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id)); }} style={{ accentColor: "#1e3a8a" }} />
                      {emp.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Projects dropdown — always visible */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setFilterOpenPanel(filterOpenPanel === 'projects' ? null : 'projects')}
                style={{ padding: "8px 14px", backgroundColor: selectedProjectIds.length ? "#f0fdf4" : "white", color: selectedProjectIds.length ? "#15803d" : "#374151", border: `1px solid ${selectedProjectIds.length ? "#22c55e" : "#e5e7eb"}`, borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}
              >
                📁 Projects {selectedProjectIds.length > 0 ? `(${selectedProjectIds.length})` : ''}
                <span style={{ fontSize: "10px" }}>▼</span>
              </button>
              {filterOpenPanel === 'projects' && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "8px", minWidth: "220px", maxHeight: "220px", overflowY: "auto" }}
                >
                  {projectOptions.length === 0 ? (
                    <div style={{ padding: "12px", fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>No project data yet</div>
                  ) : projectOptions.map(proj => (
                    <label key={proj.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", cursor: "pointer", borderRadius: "6px", fontSize: "13px", color: "#374151" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                    >
                      <input type="checkbox" checked={selectedProjectIds.includes(proj.id)} onChange={(e) => { if (e.target.checked) setSelectedProjectIds(prev => [...prev, proj.id]); else setSelectedProjectIds(prev => prev.filter(id => id !== proj.id)); }} style={{ accentColor: "#059669" }} />
                      {proj.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* NGO Partners dropdown — always visible */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setFilterOpenPanel(filterOpenPanel === 'orgs' ? null : 'orgs')}
                style={{ padding: "8px 14px", backgroundColor: selectedOrgIds.length ? "#fef3c7" : "white", color: selectedOrgIds.length ? "#92400e" : "#374151", border: `1px solid ${selectedOrgIds.length ? "#f59e0b" : "#e5e7eb"}`, borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}
              >
                🌍 NGO Partners {selectedOrgIds.length > 0 ? `(${selectedOrgIds.length})` : ''}
                <span style={{ fontSize: "10px" }}>▼</span>
              </button>
              {filterOpenPanel === 'orgs' && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 50, backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "8px", boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "8px", minWidth: "220px", maxHeight: "220px", overflowY: "auto" }}
                >
                  {orgOptions.length === 0 ? (
                    <div style={{ padding: "12px", fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>No NGO partner data yet</div>
                  ) : orgOptions.map(org => (
                    <label key={org.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", cursor: "pointer", borderRadius: "6px", fontSize: "13px", color: "#374151" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#f9fafb"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                    >
                      <input type="checkbox" checked={selectedOrgIds.includes(org.id)} onChange={(e) => { if (e.target.checked) setSelectedOrgIds(prev => [...prev, org.id]); else setSelectedOrgIds(prev => prev.filter(id => id !== org.id)); }} style={{ accentColor: "#f59e0b" }} />
                      {org.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Clear filters */}
            {(selectedEmployeeIds.length > 0 || selectedProjectIds.length > 0 || selectedOrgIds.length > 0) && (
              <button
                onClick={() => { setSelectedEmployeeIds([]); setSelectedProjectIds([]); setSelectedOrgIds([]); }}
                style={{ padding: "8px 14px", backgroundColor: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: "500" }}
              >
                ✕ Clear filters
              </button>
            )}

            {/* Active filter summary */}
            {activeFilterLabel && (
              <span style={{ fontSize: "12px", color: "#6b7280", fontStyle: "italic", marginLeft: "4px" }}>
                🔍 {activeFilterLabel}
              </span>
            )}
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
          <PlanGate feature="csvExport" hasAccess={planFeatures.csvExport}>
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
          </PlanGate>
            </>
          )}

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
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input type="radio" name="format" value="PDF" defaultChecked />
                    <span style={{ fontSize: "13px" }}>PDF (Audit-Ready)</span>
                  </label>
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

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </CSRLayout>
  );
}

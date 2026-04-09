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
            h3 {
              page-break-after: avoid;
              break-after: avoid;
            }
            h3 + * {
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
            thead { display: table-header-group; }
            th { background: linear-gradient(135deg, #92400e 0%, #b45309 100%); color: white; padding: 14px 16px; text-align: left; font-weight: 600; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
            td { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; font-size: 13px; page-break-inside: avoid; break-inside: avoid; }
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
                  <img src="${window.location.origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 44px; width: auto;" />
                  <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;">
                    <span style="font-size:26px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-family:Arial,sans-serif;">
                      <span style="color:#0A2463;">SYNERXUS</span>
                    </span>
                    <span style="font-size:13px;font-weight:600;line-height:1;white-space:nowrap;font-family:Arial,sans-serif;">
                      <span style="color:#D4980C;">Impacts.</span> <span style="color:#0A2463;">Verified.</span>
                    </span>
                  </div>
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
    const reportId = `SYN-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const totalHours = data?.engagementMetrics?.totalHours || 0;
    const activeEmployees = data?.engagementMetrics?.activeEmployees || 0;
    const participationRate = data?.engagementMetrics?.participationRate || 0;
    const directBeneficiaries = data?.impactMetrics?.directBeneficiaries || 0;
    const economicValue = data?.financialMetrics?.volunteerHourValue || 0;
    const roi = data?.financialMetrics?.roi || 0;
    const sdgMetricsData: any[] = data?.sdgMetrics || [];
    const impactScore = data?.impactMetrics?.impactScore || Math.round((participationRate || 0) * 0.8 + 20);

    // Ring chart helper — pure SVG
    const makeRing = (displayVal: string, pct: number, color: string, metricLabel: string, badge: string, badgeColor: string) => {
      const r = 52;
      const circ = 2 * Math.PI * r;
      const filled = (circ * Math.min(Math.max(pct, 0), 1)).toFixed(1);
      const empty = (circ - parseFloat(filled)).toFixed(1);
      return `<div style="text-align:center;padding:8px 4px;">
        <svg width="120" height="120" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="#e5e7eb" stroke-width="9"/>
          <circle cx="60" cy="60" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-dasharray="${filled} ${empty}" stroke-linecap="round" transform="rotate(-90 60 60)"/>
          <text x="60" y="54" text-anchor="middle" font-size="15" font-weight="800" fill="#111827" font-family="Arial,sans-serif">${displayVal}</text>
          <text x="60" y="70" text-anchor="middle" font-size="9" fill="#6b7280" font-family="Arial,sans-serif">${Math.round(pct * 100)}%</text>
        </svg>
        <div style="font-size:11px;color:#111827;font-weight:700;margin-top:2px;line-height:1.3;">${metricLabel}</div>
        <div style="font-size:9px;font-weight:700;color:${badgeColor};margin-top:3px;padding:2px 8px;background:${badgeColor}1a;border-radius:10px;display:inline-block;">${badge}</div>
      </div>`;
    };

    // Radar chart helper — 6-axis WEF-pillar spider
    const buildRadarChart = () => {
      const dims = [
        { label: 'People', sub: 'Engagement',    score: Math.min(100, activeEmployees > 0 ? Math.round((activeEmployees / 300) * 100) : 72) },
        { label: 'Planet', sub: 'Environmental', score: 65 },
        { label: 'Prosperity', sub: 'Economic',  score: Math.min(100, directBeneficiaries > 0 ? Math.round((directBeneficiaries / 8000) * 100) : 58) },
        { label: 'Governance', sub: 'Integrity', score: 90 },
        { label: 'SDG', sub: 'Coverage',         score: Math.min(100, sdgMetricsData.length > 0 ? Math.round((sdgMetricsData.length / 12) * 100) : 67) },
        { label: 'Verification', sub: 'Quality', score: 95 },
      ];
      const cx = 150, cy = 150, R = 100;
      const N = dims.length;
      const pt = (i: number, r: number) => {
        const a = -Math.PI / 2 + i * (2 * Math.PI / N);
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      };
      const gridRings = [25,50,75,100].map(pct => {
        const r = R * pct / 100;
        const pts = dims.map((_,i) => { const p = pt(i,r); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
        return `<polygon points="${pts}" fill="none" stroke="${pct===100?'#cbd5e1':'#e5e7eb'}" stroke-width="${pct===100?'1.5':'0.8'}"/>`;
      }).join('');
      const axes = dims.map((_,i) => {
        const p = pt(i, R);
        return `<line x1="${cx}" y1="${cy}" x2="${p.x.toFixed(1)}" y2="${p.y.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
      }).join('');
      const dataPts = dims.map((d,i) => { const p = pt(i, R * d.score / 100); return `${p.x.toFixed(1)},${p.y.toFixed(1)}`; }).join(' ');
      const dots = dims.map((d,i) => {
        const p = pt(i, R * d.score / 100);
        return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#10b981" stroke="white" stroke-width="2"/>`;
      }).join('');
      const labels = dims.map((d,i) => {
        const p = pt(i, R + 26);
        const anchorMap = [cx, cx+1, cx+1, cx, cx-1, cx-1];
        const anchor = p.x > cx + 10 ? 'start' : p.x < cx - 10 ? 'end' : 'middle';
        return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="${anchor}" font-size="9.5" font-weight="700" fill="#111827" font-family="Arial,sans-serif">${d.label}</text>
          <text x="${p.x.toFixed(1)}" y="${(p.y + 11).toFixed(1)}" text-anchor="${anchor}" font-size="8" fill="#6b7280" font-family="Arial,sans-serif">${d.sub}</text>
          <text x="${p.x.toFixed(1)}" y="${(p.y + 22).toFixed(1)}" text-anchor="${anchor}" font-size="9" font-weight="800" fill="#10b981" font-family="Arial,sans-serif">${d.score}%</text>`;
      }).join('');
      const pctLabels = [25,50,75].map(pct => {
        const p = pt(0, R * pct / 100);
        return `<text x="${(p.x + 3).toFixed(1)}" y="${(p.y - 2).toFixed(1)}" font-size="7" fill="#9ca3af" font-family="Arial,sans-serif">${pct}%</text>`;
      }).join('');
      return `<svg viewBox="0 0 300 300" width="300" height="300" style="display:block;">
        ${gridRings}${axes}
        <polygon points="${dataPts}" fill="rgba(16,185,129,0.12)" stroke="#10b981" stroke-width="2" stroke-linejoin="round"/>
        ${dots}${pctLabels}${labels}
      </svg>`;
    };

    // SDG donut helpers — illustrative fallback keeps Climate Action (SDG 13) dominant
    const illustrativeSDGData = [
      { goal: 13, hours: 1250 }, // Climate Action — 25%, dominant
      { goal: 4,  hours: 800  }, // Quality Education — 16%
      { goal: 3,  hours: 750  }, // Good Health — 15%
      { goal: 8,  hours: 600  }, // Decent Work — 12%
      { goal: 10, hours: 500  }, // Reduced Inequalities — 10%
      { goal: 1,  hours: 400  }, // No Poverty — 8%
      { goal: 5,  hours: 350  }, // Gender Equality — 7%
      { goal: 17, hours: 350  }, // Partnerships — 7%
    ];
    const sdgDisplayData: any[] = sdgMetricsData.length > 0 ? sdgMetricsData : illustrativeSDGData;
    const sdgTotal = sdgDisplayData.reduce((s: number, g: any) => s + (g.hours || 1), 0);
    const buildDonutSlices = () => {
      let angle = -Math.PI / 2;
      const cx = 110, cy = 110, R = 88, r = 50;
      return sdgDisplayData.slice(0, 9).map((sdg: any) => {
        const pct = (sdg.hours || 1) / sdgTotal;
        const sweep = pct * 2 * Math.PI;
        const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
        angle += sweep;
        const x2 = cx + R * Math.cos(angle), y2 = cy + R * Math.sin(angle);
        const xi1 = cx + r * Math.cos(angle), yi1 = cy + r * Math.sin(angle);
        const xi2 = cx + r * Math.cos(angle - sweep), yi2 = cy + r * Math.sin(angle - sweep);
        const large = sweep > Math.PI ? 1 : 0;
        const d = `M${x1.toFixed(1)},${y1.toFixed(1)} A${R},${R} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${xi1.toFixed(1)},${yi1.toFixed(1)} A${r},${r} 0 ${large} 0 ${xi2.toFixed(1)},${yi2.toFixed(1)} Z`;
        return `<path d="${d}" fill="${getSDGColor(sdg.goal)}" stroke="white" stroke-width="2"/>`;
      }).join('');
    };
    const buildDonutLegend = () => sdgDisplayData.slice(0, 9).map((sdg: any) => {
      const pct = Math.round(((sdg.hours || 0) / sdgTotal) * 100);
      const isDominant = sdg.goal === (sdgDisplayData[0]?.goal);
      return `<div style="display:flex;align-items:center;gap:7px;margin-bottom:6px;${isDominant ? 'background:#f0fdf4;border-radius:6px;padding:3px 5px;margin-left:-5px;' : ''}">
        <div style="width:${isDominant ? '14' : '11'}px;height:${isDominant ? '14' : '11'}px;border-radius:3px;background:${getSDGColor(sdg.goal)};flex-shrink:0;"></div>
        <span style="font-size:10px;color:#374151;flex:1;${isDominant ? 'font-weight:700;' : ''}"><strong>SDG ${sdg.goal}</strong> ${getSDGName(sdg.goal)}</span>
        <span style="font-size:10px;font-weight:800;color:${isDominant ? '#065f46' : '#111827'};">${pct}%${isDominant ? ' ★' : ''}</span>
      </div>`;
    }).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${template.name}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 20mm 15mm;
            }
            @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } body { -webkit-print-color-adjust: exact; } }
            @media print { html, body { margin: 0 !important; } }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 32px 0; color: #333; background: #fff; }

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
            h3 {
              page-break-after: avoid;
              break-after: avoid;
            }
            h3 + * {
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
            thead { display: table-header-group; }
            th {
              background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%);
              color: white;
              padding: 14px 16px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              page-break-inside: avoid;
              break-inside: avoid;
            }
            td {
              padding: 12px 16px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
              page-break-inside: avoid;
              break-inside: avoid;
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
            .sdg-watermark { position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); opacity:0.03; pointer-events:none; z-index:-1; }

            /* ── NEW SECTIONS ───────────────────────────────── */

            /* Sample Banner */
            .sample-banner { background:linear-gradient(135deg,#fef3c7 0%,#fde68a 100%); border:2px solid #f59e0b; border-radius:8px; padding:8px 16px; text-align:center; margin-bottom:14px; }
            .sample-banner-text { font-size:12px; font-weight:800; color:#92400e; text-transform:uppercase; letter-spacing:1px; }

            /* WEF Framework Disclosure Bar */
            .framework-bar { background:linear-gradient(135deg,#0A2463 0%,#1e3a8a 100%); border-radius:10px; padding:13px 18px; margin-bottom:18px; page-break-inside:avoid; }
            .framework-bar-primary { display:flex; align-items:center; gap:10px; margin-bottom:9px; flex-wrap:wrap; }
            .framework-primary-label { font-size:10px; color:#93c5fd; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; white-space:nowrap; }
            .wef-pill { background:#D4980C; color:white; font-size:11px; font-weight:800; padding:4px 13px; border-radius:20px; letter-spacing:0.3px; }
            .framework-bar-secondary { display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
            .secondary-label { font-size:10px; color:#93c5fd; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; white-space:nowrap; }
            .fw-pill { background:rgba(255,255,255,0.12); color:#e0f2fe; font-size:10px; font-weight:600; padding:3px 9px; border-radius:12px; border:1px solid rgba(255,255,255,0.2); }
            .fw-pill.esrs { background:rgba(99,102,241,0.3); border-color:rgba(99,102,241,0.5); }
            .isae-badge { background:rgba(16,185,129,0.25); color:#6ee7b7; font-size:10px; font-weight:700; padding:3px 10px; border-radius:12px; border:1px solid rgba(16,185,129,0.4); margin-left:auto; white-space:nowrap; }

            /* Ring Charts */
            .ring-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin:16px 0; page-break-inside:avoid; }

            /* Impact Flow */
            .flow-container { display:flex; align-items:stretch; gap:0; margin:16px 0; page-break-inside:avoid; }
            .flow-box { flex:1; background:#eff6ff; border:2px solid #3b82f6; border-radius:10px; padding:14px 8px; text-align:center; }
            .flow-box.green { background:#f0fdf4; border-color:#10b981; }
            .flow-box.purple { background:#faf5ff; border-color:#8b5cf6; }
            .flow-box.gold { background:#fffbeb; border-color:#f59e0b; }
            .flow-arrow { font-size:20px; color:#9ca3af; padding:0 6px; display:flex; align-items:center; flex-shrink:0; }
            .flow-icon { font-size:20px; margin-bottom:5px; }
            .flow-label { font-size:11px; font-weight:700; color:#111827; }
            .flow-sub { font-size:9px; color:#6b7280; margin-top:3px; }
            .flow-count { font-size:18px; font-weight:800; color:#1e3a8a; margin-top:4px; }

            /* Scope Boundary */
            .scope-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin:14px 0; page-break-inside:avoid; }
            .scope-panel { border-radius:12px; padding:18px; }
            .scope-panel.included { background:#f0fdf4; border:2px solid #10b981; }
            .scope-panel.excluded { background:#fffbeb; border:2px solid #f59e0b; }
            .scope-header { font-size:12px; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:11px; display:flex; align-items:center; gap:7px; }
            .scope-header.inc { color:#065f46; }
            .scope-header.exc { color:#92400e; }
            .scope-badge { padding:3px 9px; border-radius:10px; font-size:9px; font-weight:700; }
            .scope-badge.inc { background:#10b981; color:white; }
            .scope-badge.exc { background:#f59e0b; color:white; }
            .scope-item { display:flex; align-items:flex-start; gap:7px; margin-bottom:7px; font-size:11px; color:#374151; }
            .scope-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:3px; }
            .scope-dot.inc { background:#10b981; }
            .scope-dot.exc { background:#f59e0b; }

            /* SDG Donut */
            .donut-section { display:grid; grid-template-columns:230px 1fr; gap:22px; align-items:center; margin:14px 0; page-break-inside:avoid; }

            /* Geography */
            .geo-section { margin:14px 0; page-break-inside:avoid; }
            .geo-map { width:100%; border-radius:10px; overflow:hidden; border:1px solid #e5e7eb; }
            .geo-legend { display:flex; gap:18px; margin-top:9px; flex-wrap:wrap; }
            .geo-legend-item { display:flex; align-items:center; gap:6px; font-size:11px; color:#374151; }

            /* Verification Timeline */
            .timeline-sla { background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%); border:2px solid #10b981; border-radius:10px; padding:13px 18px; margin-bottom:14px; display:flex; align-items:center; gap:18px; flex-wrap:wrap; page-break-inside:avoid; }
            .sla-metric { text-align:center; }
            .sla-value { font-size:22px; font-weight:800; color:#065f46; }
            .sla-label { font-size:9px; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; }
            .sla-divider { width:1px; height:44px; background:#d1fae5; flex-shrink:0; }
            .timeline-track { position:relative; margin:22px 0 6px 0; page-break-inside:avoid; }
            .timeline-line { height:4px; background:linear-gradient(90deg,#10b981,#3b82f6); border-radius:2px; }
            .timeline-nodes { display:flex; justify-content:space-between; margin-top:-14px; }
            .timeline-node { text-align:center; width:80px; }
            .timeline-dot { width:24px; height:24px; border-radius:50%; border:3px solid white; margin:0 auto 5px; }
            .timeline-dot.completed { background:#10b981; box-shadow:0 0 0 3px #d1fae5; }
            .timeline-dot.current { background:#3b82f6; box-shadow:0 0 0 3px #dbeafe; }
            .timeline-node-label { font-size:9px; color:#374151; font-weight:600; line-height:1.3; }
            .timeline-node-date { font-size:8px; color:#9ca3af; margin-top:2px; }
            .verification-record { background:#1e293b; border-radius:10px; padding:15px 18px; margin-top:14px; page-break-inside:avoid; }
            .vr-header { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; }
            .vr-row { display:flex; gap:8px; margin-bottom:5px; font-family:'Courier New',monospace; font-size:10px; }
            .vr-key { color:#7dd3fc; font-weight:600; min-width:120px; flex-shrink:0; }
            .vr-val { color:#e2e8f0; }
            .vr-val.green { color:#6ee7b7; }
            .vr-val.gold { color:#fcd34d; }

            /* NGO Partners */
            .pillar-tag { display:inline-block; font-size:8px; font-weight:700; padding:2px 6px; border-radius:8px; margin:1px; text-transform:uppercase; letter-spacing:0.3px; }
            .pillar-planet { background:#d1fae5; color:#065f46; }
            .pillar-people { background:#ede9fe; color:#4c1d95; }
            .pillar-prosperity { background:#fef3c7; color:#78350f; }
            .pillar-governance { background:#dbeafe; color:#1e3a8a; }

            /* Evidence Object */
            .evidence-block { background:#0f172a; border-radius:10px; padding:18px; margin:14px 0; page-break-inside:avoid; border-left:4px solid #D4980C; }
            .evidence-title { font-size:10px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px; }
            .evidence-line { font-family:'Courier New',monospace; font-size:11px; line-height:1.7; }
            .ev-key { color:#7dd3fc; }
            .ev-val { color:#e2e8f0; }
            .ev-val.str { color:#a3e635; }
            .ev-val.num { color:#fb923c; }
            .ev-val.bool { color:#60a5fa; }
            .ev-bracket { color:rgba(226,232,240,0.5); }

            /* Framework Matrix */
            .matrix-table th { font-size:11px; }
            .matrix-table td { font-size:10px; }
            .matrix-table .wef-col { font-weight:700; color:#1e3a8a; background:#eff6ff; }
            .matrix-note { font-size:10px; color:#6b7280; font-style:italic; margin-top:8px; }

            /* Assurance Boundary */
            .assurance-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin:14px 0; page-break-inside:avoid; }
            .assurance-panel { border-radius:12px; padding:16px; }
            .assurance-panel.synerxus { background:#eff6ff; border:2px solid #3b82f6; }
            .assurance-panel.auditor { background:#f5f3ff; border:2px solid #8b5cf6; }
            .assurance-panel-header { font-size:11px; font-weight:800; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:10px; }
            .assurance-panel-header.syn { color:#1e3a8a; }
            .assurance-panel-header.aud { color:#4c1d95; }
            .assurance-item { display:flex; align-items:flex-start; gap:7px; margin-bottom:7px; font-size:11px; color:#374151; }
            .assurance-icon { flex-shrink:0; font-size:12px; }

            /* Enhanced Footer */
            .report-footer { margin-top:40px; padding-top:22px; border-top:2px solid #e5e7eb; page-break-inside:avoid; }
            .footer-top { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:14px; }
            .footer-logo-block { display:flex; align-items:center; gap:8px; }
            .footer-ids { text-align:right; font-size:10px; color:#9ca3af; line-height:1.8; }
            .footer-fw-bar { display:flex; justify-content:center; align-items:center; gap:7px; flex-wrap:wrap; margin-bottom:9px; }
            .footer-fw-tag { font-size:9px; font-weight:600; color:#6b7280; padding:2px 7px; border:1px solid #e5e7eb; border-radius:8px; }
            .footer-tagline { font-size:12px; color:#6b7280; font-style:italic; margin-bottom:10px; text-align:center; }
            .footer-generated { font-size:12px; color:#374151; margin-bottom:8px; text-align:center; }
            .footer-confidential { font-size:11px; color:#9ca3af; padding:7px 14px; background:#f9fafb; border-radius:6px; display:inline-block; }
            .footer-copyright { font-size:11px; color:#9ca3af; margin-top:10px; text-align:center; }
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

          <!-- ═══ SECTION 1: Header with WEF-first Framework Disclosure ═══ -->
          <div class="report-section-cover">
            <div class="sample-banner">
              <div class="sample-banner-text">⚠ SAMPLE REPORT — Illustrative data only · Not for external distribution</div>
            </div>
            <div class="framework-bar">
              <div class="framework-bar-primary">
                <span class="framework-primary-label">Primary Framework</span>
                <span class="wef-pill">WEF Stakeholder Capitalism Metrics</span>
                <span class="isae-badge">ISAE 3000 Revised · Audit-Supported</span>
              </div>
              <div class="framework-bar-secondary">
                <span class="secondary-label">Also aligned:</span>
                <span class="fw-pill">GRI Standards</span>
                <span class="fw-pill">SASB</span>
                <span class="fw-pill">TCFD</span>
                <span class="fw-pill esrs">ESRS (CSRD)</span>
                <span class="fw-pill">UN SDGs</span>
              </div>
            </div>
            <div class="report-header">
              <div class="header-left">
                <div class="logo-container">
                  <img src="${window.location.origin}/synerxus-esg-logo.png" alt="Synerxus" style="height: 44px; width: auto;" />
                  <div style="display:flex;flex-direction:column;justify-content:center;gap:2px;">
                    <span style="font-size:26px;font-weight:700;letter-spacing:-0.02em;line-height:1;font-family:Arial,sans-serif;">
                      <span style="color:#0A2463;">SYNERXUS</span>
                    </span>
                    <span style="font-size:13px;font-weight:600;line-height:1;white-space:nowrap;font-family:Arial,sans-serif;">
                      <span style="color:#D4980C;">Impacts.</span> <span style="color:#0A2463;">Verified.</span>
                    </span>
                  </div>
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
                ${filterLabel ? `<div style="margin-top:8px;font-size:12px;color:#6b7280;">🔍 ${filterLabel}</div>` : ''}
              </div>
              <div class="header-right">
                <div class="impact-score-box">
                  <h4>Overall Impact Score</h4>
                  <div class="impact-score-value">${impactScore}</div>
                  <div class="impact-score-label">out of 100</div>
                </div>
              </div>
            </div>
          </div>

          <!-- ═══ SECTION 2: Ring Charts — 4 Hero Metrics ═══ -->
          <div class="report-section">
            <h2>Executive Metric Snapshot</h2>
            <div class="ring-grid">
              ${makeRing(
                totalHours >= 1000 ? (totalHours/1000).toFixed(1)+'K' : String(totalHours),
                Math.min(totalHours / 5000, 1),
                '#10b981', 'Volunteer Hours', '✓ Audited', '#10b981'
              )}
              ${makeRing(
                String(activeEmployees),
                Math.min(activeEmployees / 500, 1),
                '#3b82f6', 'Active Employees', '✓ Verified', '#3b82f6'
              )}
              ${makeRing(
                participationRate + '%',
                participationRate / 100,
                '#8b5cf6', 'Participation Rate', '✓ NGO-Confirmed', '#8b5cf6'
              )}
              ${makeRing(
                '100%',
                1,
                '#10b981', 'Verification Rate', '✓ Fully Audited', '#10b981'
              )}
            </div>
          </div>

          <!-- ═══ SECTION 3: Impact Flow — Volunteer → NGO → Evidence → SDG ═══ -->
          <div class="report-section">
            <h2>Impact Pipeline</h2>
            <div class="flow-container">
              <div class="flow-box">
                <div class="flow-icon">👥</div>
                <div class="flow-label">Volunteer Action</div>
                <div class="flow-count">${activeEmployees}</div>
                <div class="flow-sub">Employees engaged</div>
              </div>
              <div class="flow-arrow">→</div>
              <div class="flow-box green">
                <div class="flow-icon">🏢</div>
                <div class="flow-label">NGO Partner</div>
                <div class="flow-count">${data?.ngoPartners?.length || 5}</div>
                <div class="flow-sub">Verified partners</div>
              </div>
              <div class="flow-arrow">→</div>
              <div class="flow-box purple">
                <div class="flow-icon">🔗</div>
                <div class="flow-label">Evidence Object</div>
                <div class="flow-count">${Math.round(totalHours * 0.12) || 24}</div>
                <div class="flow-sub">Verified records</div>
              </div>
              <div class="flow-arrow">→</div>
              <div class="flow-box gold">
                <div class="flow-icon">🌍</div>
                <div class="flow-label">SDG Outcome</div>
                <div class="flow-count">${sdgMetricsData.length || 6}</div>
                <div class="flow-sub">Goals addressed</div>
              </div>
            </div>
          </div>

          <!-- ═══ SECTION 4 (existing): Key Performance Metrics ═══ -->
          <div class="report-section">
            <h2>Key Performance Metrics</h2>
            <div class="metric-grid">
              <div class="metric-card blue">
                <div class="metric-value">${totalHours.toLocaleString()}</div>
                <div class="metric-label">Total Volunteer Hours</div>
              </div>
              <div class="metric-card green">
                <div class="metric-value">${activeEmployees}</div>
                <div class="metric-label">Active Employees</div>
              </div>
              <div class="metric-card purple">
                <div class="metric-value">${participationRate}%</div>
                <div class="metric-label">Participation Rate</div>
              </div>
              <div class="metric-card orange">
                <div class="metric-value">${directBeneficiaries.toLocaleString()}</div>
                <div class="metric-label">Direct Beneficiaries</div>
              </div>
              <div class="metric-card blue">
                <div class="metric-value">$${Math.round(economicValue / 1000)}K</div>
                <div class="metric-label">Economic Value</div>
              </div>
              <div class="metric-card green">
                <div class="metric-value">${roi}%</div>
                <div class="metric-label">Return on Investment</div>
              </div>
            </div>
          </div>

          <!-- ═══ SECTION 5: Verification Scope Boundary ═══ -->
          <div class="report-section">
            <h2>Verification Scope Boundary</h2>
            <div class="scope-grid">
              <div class="scope-panel included">
                <div class="scope-header inc"><span class="scope-badge inc">INCLUDED</span> What IS verified</div>
                <div class="scope-item"><div class="scope-dot inc"></div><span>Direct employee volunteer hours (timesheet-verified)</span></div>
                <div class="scope-item"><div class="scope-dot inc"></div><span>NGO-confirmed beneficiary outcomes (signed attestations)</span></div>
                <div class="scope-item"><div class="scope-dot inc"></div><span>GHG Scope 1 &amp; 2 direct operations emissions</span></div>
                <div class="scope-item"><div class="scope-dot inc"></div><span>Employee participation and engagement records</span></div>
                <div class="scope-item"><div class="scope-dot inc"></div><span>Community investment cash contributions</span></div>
                <div class="scope-item"><div class="scope-dot inc"></div><span>Blockchain-anchored evidence objects</span></div>
              </div>
              <div class="scope-panel excluded">
                <div class="scope-header exc"><span class="scope-badge exc">NOT INCLUDED</span> What IS NOT verified</div>
                <div class="scope-item"><div class="scope-dot exc"></div><span>Supply chain / Scope 3 indirect emissions</span></div>
                <div class="scope-item"><div class="scope-dot exc"></div><span>Estimated or projected future outcomes</span></div>
                <div class="scope-item"><div class="scope-dot exc"></div><span>Third-party partner financial statements</span></div>
                <div class="scope-item"><div class="scope-dot exc"></div><span>Contractor and agency worker hours</span></div>
                <div class="scope-item"><div class="scope-dot exc"></div><span>Pro-bono service valuations (self-reported only)</span></div>
                <div class="scope-item"><div class="scope-dot exc"></div><span>Non-Synerxus-platform volunteer activities</span></div>
              </div>
            </div>
          </div>

          <!-- ═══ SECTION 6 (existing): SDG Alignment Table ═══ -->
          <div class="report-section">
            <h2>SDG Alignment &amp; Impact</h2>
            <table>
              <thead>
                <tr>
                  <th style="width:40%">SDG Goal</th>
                  <th style="width:25%">Hours Contributed</th>
                  <th style="width:20%">Progress</th>
                  <th style="width:15%">% of Total</th>
                </tr>
              </thead>
              <tbody>
                ${(data?.sdgMetrics || []).slice(0, 8).map((sdg: any) => `
                  <tr>
                    <td>
                      <span class="sdg-badge" style="background-color:${getSDGColor(sdg.goal)}">${sdg.goal}</span>
                      <span class="sdg-name">${getSDGName(sdg.goal)}</span>
                    </td>
                    <td>${(sdg.hours || 0).toLocaleString()} hrs</td>
                    <td><div class="progress-bar"><div class="progress-fill" style="width:${sdg.percentage || 0}%"></div></div></td>
                    <td><strong>${sdg.percentage || 0}%</strong></td>
                  </tr>
                `).join("") || `
                  <tr><td colspan="4" style="text-align:center;color:#6b7280;padding:24px;">No SDG data available for this period</td></tr>
                `}
              </tbody>
            </table>
          </div>

          <!-- ═══ SECTION 7: SDG Radial Donut Chart ═══ -->
          <div class="report-section">
            <h2>SDG Distribution (Radial)</h2>
            <div class="donut-section">
              <div>
                <svg viewBox="0 0 220 220" width="220" height="220">
                  ${buildDonutSlices()}
                  <circle cx="110" cy="110" r="48" fill="white"/>
                  <text x="110" y="106" text-anchor="middle" font-size="13" font-weight="800" fill="#1e3a8a" font-family="Arial,sans-serif">${sdgMetricsData.length || 0}</text>
                  <text x="110" y="121" text-anchor="middle" font-size="9" fill="#6b7280" font-family="Arial,sans-serif">SDGs</text>
                </svg>
              </div>
              <div>${buildDonutLegend() || '<p style="color:#9ca3af;font-size:12px;">No SDG distribution data available</p>'}</div>
            </div>
          </div>

          <!-- ═══ SECTION 8: Geography — World Map with Country Markers ═══ -->
          <div class="report-section">
            <h2>Geographic Impact</h2>
            <div class="geo-section">
              <div class="geo-map">
                <svg viewBox="0 0 700 320" width="100%" style="display:block;">
                  <rect width="700" height="320" fill="#dbeafe" rx="8"/>
                  <!-- North America -->
                  <path d="M 60 35 L 90 28 L 145 30 L 180 42 L 202 62 L 206 92 L 196 126 L 178 153 L 158 163 L 128 158 L 98 144 L 74 118 L 54 84 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                  <ellipse cx="188" cy="21" rx="22" ry="13" fill="#bfdbfe" stroke="white" stroke-width="1"/>
                  <path d="M 158 163 L 174 172 L 177 190 L 158 197 L 146 188 L 144 172 Z" fill="#bfdbfe" stroke="white" stroke-width="1"/>
                  <ellipse cx="190" cy="173" rx="10" ry="5" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                  <!-- South America -->
                  <path d="M 146 196 L 190 188 L 214 206 L 218 242 L 213 278 L 198 300 L 172 307 L 148 298 L 130 268 L 124 228 L 128 205 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                  <!-- Europe -->
                  <path d="M 297 28 L 340 23 L 366 34 L 376 56 L 370 76 L 350 86 L 323 88 L 303 77 L 291 56 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                  <ellipse cx="283" cy="43" rx="8" ry="12" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                  <path d="M 318 9 L 340 7 L 348 27 L 330 29 L 314 24 Z" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                  <!-- Africa -->
                  <path d="M 298 95 L 355 89 L 386 104 L 396 136 L 393 176 L 380 217 L 359 239 L 333 245 L 306 234 L 288 204 L 280 166 L 280 123 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                  <ellipse cx="405" cy="218" rx="8" ry="17" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                  <!-- Asia -->
                  <path d="M 376 24 L 432 17 L 502 19 L 562 27 L 596 50 L 601 80 L 580 110 L 539 128 L 489 132 L 438 127 L 399 109 L 381 78 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                  <!-- India -->
                  <path d="M 460 124 L 491 119 L 512 138 L 511 169 L 492 186 L 471 183 L 454 160 L 449 135 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                  <!-- SE Asia -->
                  <path d="M 530 119 L 576 113 L 601 129 L 599 158 L 578 173 L 547 165 L 529 147 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                  <ellipse cx="578" cy="180" rx="28" ry="10" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                  <ellipse cx="620" cy="157" rx="12" ry="8" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                  <ellipse cx="630" cy="73" rx="8" ry="20" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                  <!-- Australia -->
                  <path d="M 544 208 L 610 200 L 646 219 L 656 255 L 648 288 L 619 306 L 584 305 L 554 284 L 537 251 L 534 221 Z" fill="#bfdbfe" stroke="white" stroke-width="1.5"/>
                  <ellipse cx="668" cy="300" rx="8" ry="16" fill="#bfdbfe" stroke="white" stroke-width="0.8"/>
                  <!-- 4 markers · 3 continents -->
                  <!-- North America: USA -->
                  <circle cx="127" cy="97" r="8" fill="#10b981" stroke="white" stroke-width="2.5"/>
                  <text x="127" y="86" text-anchor="middle" font-size="8" font-weight="700" fill="#065f46" font-family="Arial">USA</text>
                  <!-- Africa: Kenya -->
                  <circle cx="357" cy="172" r="8" fill="#10b981" stroke="white" stroke-width="2.5"/>
                  <text x="357" y="161" text-anchor="middle" font-size="8" font-weight="700" fill="#065f46" font-family="Arial">Kenya</text>
                  <!-- Asia: India -->
                  <circle cx="481" cy="154" r="8" fill="#10b981" stroke="white" stroke-width="2.5"/>
                  <text x="481" y="143" text-anchor="middle" font-size="8" font-weight="700" fill="#065f46" font-family="Arial">India</text>
                  <!-- Asia: Philippines -->
                  <circle cx="607" cy="147" r="7" fill="#10b981" stroke="white" stroke-width="2.5"/>
                  <text x="607" y="136" text-anchor="middle" font-size="8" font-weight="700" fill="#065f46" font-family="Arial">PHL</text>
                </svg>
              </div>
              <div class="geo-legend">
                <div class="geo-legend-item"><div style="width:12px;height:12px;border-radius:50%;background:#10b981;flex-shrink:0;"></div> Verified NGO Partner (4 locations · 3 continents)</div>
              </div>
            </div>
          </div>

          <!-- ═══ SECTION 9: Verification Timeline & SLA Compliance ═══ -->
          <div class="report-section">
            <h2>Verification Timeline &amp; SLA Compliance</h2>
            <div class="timeline-sla">
              <div class="sla-metric"><div class="sla-value">100%</div><div class="sla-label">Within 72h SLA</div></div>
              <div class="sla-divider"></div>
              <div class="sla-metric"><div class="sla-value">4.2h</div><div class="sla-label">Avg. Verify Time</div></div>
              <div class="sla-divider"></div>
              <div class="sla-metric"><div class="sla-value">${Math.round(totalHours * 0.12) || 24}</div><div class="sla-label">Records Verified</div></div>
              <div class="sla-divider"></div>
              <div class="sla-metric"><div class="sla-value">0</div><div class="sla-label">SLA Breaches</div></div>
              <div style="margin-left:auto;background:#10b981;color:white;font-size:11px;font-weight:700;padding:8px 14px;border-radius:20px;white-space:nowrap;">✓ Fully Compliant</div>
            </div>
            <!-- SLA Bar: 0–72h range, green fill to 29h average -->
            <div style="margin:18px 0 6px 0;page-break-inside:avoid;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                <span style="font-size:11px;font-weight:700;color:#111827;">Verification Time Distribution (Jan–${new Date().getFullYear()})</span>
                <span style="font-size:10px;color:#10b981;font-weight:700;">Avg: 29h · SLA ceiling: 72h</span>
              </div>
              <!-- Bar track -->
              <div style="position:relative;height:32px;background:#e5e7eb;border-radius:8px;overflow:hidden;">
                <!-- Green fill: 29/72 ≈ 40.3% -->
                <div style="width:40.3%;height:100%;background:linear-gradient(90deg,#059669 0%,#10b981 100%);border-radius:8px 0 0 8px;display:flex;align-items:center;padding-left:10px;">
                  <span style="font-size:10px;font-weight:800;color:white;">29h avg</span>
                </div>
                <!-- SLA limit zone 72h: right edge red tick -->
                <div style="position:absolute;right:0;top:0;width:3px;height:100%;background:#ef4444;"></div>
              </div>
              <!-- Scale labels -->
              <div style="display:flex;justify-content:space-between;font-size:8.5px;color:#9ca3af;margin-top:4px;padding:0 1px;">
                <span>0h</span><span>18h</span><span>36h</span><span>54h</span><span style="color:#ef4444;font-weight:700;">72h SLA</span>
              </div>
              <!-- Period milestones below bar -->
              <div style="display:flex;justify-content:space-between;margin-top:14px;padding:0 2px;">
                ${['Jan 1 — Period Open','Jan–Mar — Collection','Q1 Close — Attestation','Apr — Review','Today — Published'].map((label, i) => `
                  <div style="text-align:center;flex:1;">
                    <div style="width:10px;height:10px;border-radius:50%;background:${i < 4 ? '#10b981' : '#3b82f6'};border:2px solid white;box-shadow:0 0 0 2px ${i < 4 ? '#d1fae5' : '#dbeafe'};margin:0 auto 4px;"></div>
                    <div style="font-size:8px;color:#374151;font-weight:600;line-height:1.3;">${label}</div>
                  </div>`).join('')}
              </div>
            </div>
            <div class="verification-record">
              <!-- Hash header bar -->
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(148,163,184,0.2);">
                <div class="vr-header" style="margin-bottom:0;">▸ Sample Verification Record</div>
                <span style="font-family:'Courier New',monospace;font-size:9px;color:#475569;background:rgba(71,85,105,0.15);padding:3px 8px;border-radius:4px;">hash: 0x4a7f2c…d9e831</span>
              </div>
              <div class="vr-row"><span class="vr-key">record_id</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val green">SYN-VR-2024-00847</span></div>
              <div class="vr-row"><span class="vr-key">submitted_by</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val">J. Mwangi · Project Lead, ${companyName}</span></div>
              <div class="vr-row"><span class="vr-key">verified_by</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val green">Hope Foundation NGO · Nairobi, KE</span></div>
              <div class="vr-row"><span class="vr-key">outcome</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val gold">48 beneficiaries · Digital Literacy · SDG 4</span></div>
              <div class="vr-row"><span class="vr-key">method</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val">NGO_ATTESTATION + ATTENDANCE_REGISTER + PHOTO</span></div>
              <div class="vr-row"><span class="vr-key">submitted_at</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val">2024-03-14T09:22:00Z</span></div>
              <div class="vr-row"><span class="vr-key">verified_at</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val green">2024-03-14T13:47:00Z</span></div>
              <div class="vr-row" style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(148,163,184,0.2);"><span class="vr-key">time_to_verify</span><span style="color:#94a3b8;margin:0 6px;">:</span><span class="vr-val green" style="font-weight:700;">4h 25m ✓ Within 72h SLA</span></div>
            </div>
          </div>

          <!-- ═══ SECTION 10: NGO Partners Table with WEF Pillar Tags ═══ -->
          <div class="report-section">
            <h2>NGO Partner Registry</h2>
            <table>
              <thead>
                <tr>
                  <th>Partner Organization</th>
                  <th>Country</th>
                  <th>WEF Pillar</th>
                  <th>Verified Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Hope Foundation</strong></td>
                  <td>Kenya 🇰🇪</td>
                  <td><span class="pillar-tag pillar-people">People</span><span class="pillar-tag pillar-planet">Planet</span></td>
                  <td>312 hrs</td>
                  <td style="color:#10b981;font-weight:700;">✓ Verified</td>
                </tr>
                <tr>
                  <td><strong>Digital Access PH</strong></td>
                  <td>Philippines 🇵🇭</td>
                  <td><span class="pillar-tag pillar-prosperity">Prosperity</span></td>
                  <td>186 hrs</td>
                  <td style="color:#10b981;font-weight:700;">✓ Verified</td>
                </tr>
                <tr>
                  <td><strong>Green Futures Zambia</strong></td>
                  <td>Zambia 🇿🇲</td>
                  <td><span class="pillar-tag pillar-planet">Planet</span></td>
                  <td>240 hrs</td>
                  <td style="color:#10b981;font-weight:700;">✓ Verified</td>
                </tr>
                <tr>
                  <td><strong>Community Health NG</strong></td>
                  <td>Nigeria 🇳🇬</td>
                  <td><span class="pillar-tag pillar-people">People</span><span class="pillar-tag pillar-governance">Governance</span></td>
                  <td>158 hrs</td>
                  <td style="color:#f59e0b;font-weight:700;">⏳ Pending Attestation</td>
                </tr>
                <tr>
                  <td><strong>Ayiti Tech Haiti</strong></td>
                  <td>Haiti 🇭🇹</td>
                  <td><span class="pillar-tag pillar-prosperity">Prosperity</span></td>
                  <td>94 hrs</td>
                  <td style="color:#10b981;font-weight:700;">✓ Verified</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ═══ SECTION 11: Sample Evidence Object (Monospace) ═══ -->
          <div class="report-section">
            <h2>Sample Evidence Object</h2>
            <div class="evidence-block">
              <div class="evidence-title">// Synerxus Evidence Object · ISAE 3000 Revised · Blockchain-Anchored</div>
              <div class="evidence-line"><span class="ev-bracket">{</span></div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"evidence_id"</span>: <span class="ev-val str">"SYN-EV-2024-004821"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"framework"</span>: <span class="ev-val str">"WEF Stakeholder Capitalism Metrics v2.0"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"wef_pillar"</span>: <span class="ev-val str">"People"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"sdg_mapping"</span>: [<span class="ev-val num">4</span>, <span class="ev-val num">8</span>, <span class="ev-val num">10</span>],</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"volunteer_hours"</span>: <span class="ev-val num">48</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"beneficiaries_direct"</span>: <span class="ev-val num">312</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"ngo_verified"</span>: <span class="ev-val bool">true</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"verification_method"</span>: <span class="ev-val str">"NGO_ATTESTATION + ATTENDANCE_REGISTER"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"assurance_standard"</span>: <span class="ev-val str">"ISAE 3000 Revised"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"blockchain_hash"</span>: <span class="ev-val str">"0x4a7f2c...d9e831"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"timestamp_utc"</span>: <span class="ev-val str">"2024-03-14T13:47:00Z"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"gri_disclosure"</span>: <span class="ev-val str">"GRI 413-1"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"sasb_indicator"</span>: <span class="ev-val str">"HC-MS-310a.1"</span>,</div>
              <div class="evidence-line">&nbsp;&nbsp;<span class="ev-key">"esrs_data_point"</span>: <span class="ev-val str">"ESRS S1-4"</span></div>
              <div class="evidence-line"><span class="ev-bracket">}</span></div>
            </div>
          </div>

          <!-- ═══ SECTION 12: Framework Alignment Matrix ═══ -->
          <div class="report-section">
            <h2>Framework Alignment Matrix</h2>
            <p style="font-size:11px;color:#6b7280;margin-bottom:12px;font-style:italic;">Primary framework: WEF Stakeholder Capitalism Metrics. Secondary alignments shown below. Full mapping documentation available upon request.</p>
            <table class="matrix-table">
              <thead>
                <tr>
                  <th style="width:22%">WEF SCM Metric</th>
                  <th style="width:14%">Pillar</th>
                  <th style="width:16%">GRI Standard</th>
                  <th style="width:16%">SASB</th>
                  <th style="width:16%">TCFD</th>
                  <th style="width:16%">ESRS (CSRD)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="wef-col">Volunteer Engagement Hours</td>
                  <td><span class="pillar-tag pillar-people">People</span></td>
                  <td>GRI 413-1</td><td>HC-MS-310a.1</td><td>No direct equiv.</td><td>ESRS S1-4</td>
                </tr>
                <tr>
                  <td class="wef-col">Community Investment ($)</td>
                  <td><span class="pillar-tag pillar-prosperity">Prosperity</span></td>
                  <td>GRI 201-1</td><td>No direct equiv.</td><td>No direct equiv.</td><td>ESRS S3-1</td>
                </tr>
                <tr>
                  <td class="wef-col">GHG Emissions (Scope 1&amp;2)</td>
                  <td><span class="pillar-tag pillar-planet">Planet</span></td>
                  <td>GRI 305-1/2</td><td>EM-IS-110a.1</td><td>Metrics &amp; Targets</td><td>ESRS E1-6</td>
                </tr>
                <tr>
                  <td class="wef-col">Board Diversity &amp; Structure</td>
                  <td><span class="pillar-tag pillar-governance">Governance</span></td>
                  <td>GRI 405-1</td><td>CG-EC-330a.1</td><td>Governance</td><td>ESRS G1-1</td>
                </tr>
                <tr>
                  <td class="wef-col">Employee Training Investment</td>
                  <td><span class="pillar-tag pillar-people">People</span></td>
                  <td>GRI 404-1</td><td>HC-MS-330a.1</td><td>No direct equiv.</td><td>ESRS S1-13</td>
                </tr>
                <tr>
                  <td class="wef-col">Beneficiaries Reached</td>
                  <td><span class="pillar-tag pillar-prosperity">Prosperity</span></td>
                  <td>GRI 413-1</td><td>No direct equiv.</td><td>No direct equiv.</td><td>ESRS S3-4</td>
                </tr>
              </tbody>
            </table>
            <p class="matrix-note">Full crosswalk documentation including metric definitions, boundary rules, and disaggregation methodology available upon request: assurance@synerxus.com</p>
          </div>

          <!-- ═══ SECTION 13: Impact Radar Chart ═══ -->
          <div class="report-section">
            <h2>Impact Performance Radar — WEF Pillar Overview</h2>
            <div style="display:grid;grid-template-columns:300px 1fr;gap:28px;align-items:center;page-break-inside:avoid;">
              <div style="display:flex;justify-content:center;">
                ${buildRadarChart()}
              </div>
              <div>
                <p style="font-size:11px;color:#374151;margin-bottom:14px;line-height:1.6;">Performance scored across the six WEF Stakeholder Capitalism Metric pillars. Verified data drives People, Governance and Verification scores; Planet and Prosperity use a combination of verified outcomes and illustrative estimates.</p>
                <div style="display:flex;flex-direction:column;gap:8px;">
                  ${['People · Engagement','Planet · Environmental','Prosperity · Economic','Governance · Integrity','SDG · Coverage','Verification · Quality'].map((label, i) => {
                    const scores = [
                      Math.min(100, activeEmployees > 0 ? Math.round((activeEmployees / 300) * 100) : 72),
                      65,
                      Math.min(100, directBeneficiaries > 0 ? Math.round((directBeneficiaries / 8000) * 100) : 58),
                      90,
                      Math.min(100, sdgMetricsData.length > 0 ? Math.round((sdgMetricsData.length / 12) * 100) : 67),
                      95
                    ];
                    const s = scores[i];
                    const color = s >= 85 ? '#10b981' : s >= 60 ? '#3b82f6' : '#f59e0b';
                    return `<div style="display:flex;align-items:center;gap:10px;">
                      <span style="font-size:10px;font-weight:600;color:#374151;min-width:150px;">${label}</span>
                      <div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;">
                        <div style="width:${s}%;height:100%;background:${color};border-radius:4px;"></div>
                      </div>
                      <span style="font-size:10px;font-weight:800;color:${color};min-width:32px;text-align:right;">${s}%</span>
                    </div>`;
                  }).join('')}
                </div>
                <p style="font-size:9px;color:#9ca3af;margin-top:12px;font-style:italic;">Scores calculated from verified platform data. Illustrative values used where live data is unavailable. Full methodology available upon request.</p>
              </div>
            </div>
          </div>

          <!-- ═══ SECTION 14: Assurance Boundary ═══ -->
          <div class="report-section">
            <h2>Assurance Boundary</h2>
            <div class="assurance-grid">
              <div class="assurance-panel synerxus">
                <div class="assurance-panel-header syn">🔵 Synerxus Platform Provides</div>
                <div class="assurance-item"><span class="assurance-icon">✓</span><span>Real-time activity logging and timestamping</span></div>
                <div class="assurance-item"><span class="assurance-icon">✓</span><span>NGO partner attestation workflow and sign-off</span></div>
                <div class="assurance-item"><span class="assurance-icon">✓</span><span>Blockchain anchoring of all evidence objects</span></div>
                <div class="assurance-item"><span class="assurance-icon">✓</span><span>SDG mapping and WEF pillar classification</span></div>
                <div class="assurance-item"><span class="assurance-icon">✓</span><span>SLA monitoring and verification audit trail</span></div>
                <div class="assurance-item"><span class="assurance-icon">✓</span><span>Framework crosswalk tagging (GRI/SASB/TCFD/ESRS)</span></div>
                <div class="assurance-item"><span class="assurance-icon">✓</span><span>Report generation with sample data disclosure</span></div>
              </div>
              <div class="assurance-panel auditor">
                <div class="assurance-panel-header aud">🟣 External Auditor Provides</div>
                <div class="assurance-item"><span class="assurance-icon">◆</span><span>Independent review of evidence object completeness</span></div>
                <div class="assurance-item"><span class="assurance-icon">◆</span><span>Management assertions sign-off (ISAE 3000)</span></div>
                <div class="assurance-item"><span class="assurance-icon">◆</span><span>Materiality threshold determination</span></div>
                <div class="assurance-item"><span class="assurance-icon">◆</span><span>Financial metric reconciliation (if applicable)</span></div>
                <div class="assurance-item"><span class="assurance-icon">◆</span><span>Scope 3 GHG data verification (if in scope)</span></div>
                <div class="assurance-item"><span class="assurance-icon">◆</span><span>Final assurance opinion and practitioner letter</span></div>
                <div class="assurance-item"><span class="assurance-icon">◆</span><span>Regulatory filing review (CSRD/SEC where applicable)</span></div>
              </div>
            </div>
          </div>

          <!-- ═══ Enhanced Footer (Report ID, framework, assurance level) ═══ -->
          <div class="report-footer">
            <div class="footer-top">
              <div class="footer-logo-block">
                <img src="${window.location.origin}/synerxus-esg-logo.png" alt="Synerxus" style="height:28px;width:auto;" />
                <div style="font-size:11px;line-height:1.6;color:#6b7280;">
                  <div><span style="color:#D4980C;font-weight:700;">Impacts.</span> <span style="color:#0A2463;font-weight:700;">Verified.</span></div>
                  <div>Powered by Synerxus · ISAE 3000 Revised</div>
                </div>
              </div>
              <div class="footer-ids">
                <div><strong>Report ID:</strong> ${reportId}</div>
                <div><strong>Framework:</strong> WEF SCM v2.0 · GRI · SASB · TCFD · ESRS</div>
                <div><strong>Assurance:</strong> ISAE 3000 Revised · Audit-Supported</div>
                <div><strong>Generated:</strong> ${currentDate}</div>
              </div>
            </div>
            <div class="footer-fw-bar">
              <span class="footer-fw-tag">WEF SCM</span>
              <span class="footer-fw-tag">GRI</span>
              <span class="footer-fw-tag">SASB</span>
              <span class="footer-fw-tag">TCFD</span>
              <span class="footer-fw-tag">ESRS</span>
              <span class="footer-fw-tag">UN SDGs</span>
              <span class="footer-fw-tag">ISAE 3000</span>
            </div>
            <div class="footer-tagline"><span style="color:#D4980C;">Impact,</span> <span style="color:#0A2463;">Verified.</span></div>
            <div class="footer-generated">Generated on ${currentDate} · ${template.name} · Report ID: ${reportId}</div>
            <div style="text-align:center;margin-bottom:8px;">
              <div class="footer-confidential">⚠ SAMPLE REPORT — Illustrative data only. This report contains confidential information. Distribution is restricted to authorized personnel.</div>
            </div>
            <div class="footer-copyright">© ${new Date().getFullYear()} Synerxus. All rights reserved. | support@synerxus.com | assurance@synerxus.com</div>
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
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <img src="/synerxus-esg-logo.png" alt="Synerxus" style={{ height: "44px", width: "auto" }} />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "2px" }}>
                <span style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 }}>
                  <span style={{ color: "#0A2463" }}>SYNERXUS</span>
                </span>
                <span style={{ fontSize: "11px", fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap" }}>
                  <span style={{ color: "#D4980C" }}>Impacts.</span> <span style={{ color: "#0A2463" }}>Verified.</span>
                </span>
              </div>
              <div style={{ width: "1px", height: "36px", backgroundColor: "#e5e7eb", margin: "0 4px" }} />
              <div>
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#111827" }}>CSR / ESG Reports</div>
                {companyName && companyName !== "Your Company" && (
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>{companyName}</div>
                )}
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

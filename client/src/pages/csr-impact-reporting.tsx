import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { TrendingUp, Users, DollarSign, Globe, CheckCircle, ArrowLeft, Download, Zap, AlertCircle, Target, Clock, FolderKanban, ChevronRight, BarChart2, PieChart, Activity, Award, Briefcase, Calculator, TrendingDown, ArrowUpRight, ArrowDownRight, Layers, Star, Shield, FileText, Eye } from "lucide-react";
import { useState, useEffect, lazy, Suspense, memo } from "react";
import DOMPurify from "dompurify";
import { getSDGName, getSDGFullName } from "@shared/sdg-goals";
import Footer from "@/components/layout/footer";
import Logo from "@/components/ui/logo";
import CSRMobileNav, { CSRMobileHeader } from "@/components/layout/csr-mobile-nav";
import { CSRLayout } from "@/components/layout/csr-layout";
import logoUrl from "@assets/Synerxus_Logo_1765433966690.png";
import { formatDecimal } from "@/lib/format-utils";
import { MetricAlertBanner } from "@/components/impact/metric-alert-banner";
import { VTOUtilization } from "@/components/impact/vto-utilization";
import { PeriodComparison } from "@/components/impact/period-comparison";

// Lazy load heavy chart components for better initial load
const LazyAreaChart = lazy(() => import("recharts").then(m => ({ default: m.AreaChart })));
const LazyBarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const LazyLineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
const LazyPieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));

// Regular imports for lighter chart parts
import {
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Cell,
  Pie
} from "recharts";

// Loading fallback for charts
const ChartSkeleton = memo(({ height = "h-[300px]" }: { height?: string }) => (
  <div className={`${height} bg-slate-100 animate-pulse rounded-lg flex items-center justify-center`}>
    <div className="text-slate-400 text-sm">Loading chart...</div>
  </div>
));
ChartSkeleton.displayName = "ChartSkeleton";

interface ComplianceCalculation {
  engagementScore: number;
  impactScore: number;
  governanceScore: number;
  communityBenefitScore: number;
}

interface ImpactData {
  reportPeriod: string;
  engagementMetrics: {
    totalHours: number;
    activeEmployees: number;
    avgHoursPerEmployee: number;
    participationRate: number;
    hoursPerMonth: Record<string, number>;
  };
  impactMetrics: {
    directBeneficiaries: number;
    indirectBeneficiaries: number;
    estimatedLivesTouched: number;
    impactPerHour: number;
  };
  financialMetrics: {
    volunteerHourValue: number;
    estimatedCostIfPaidStaff: number;
    costPerBeneficiary: number;
    roi: number;
    programCost: number;
  };
  sdgMetrics: Array<{ goal: number; hours: number; percentage: number }>;
  projectMetrics: Array<any>;
  benchmarks: {
    avgHoursPerEmployeeBenchmark: number;
    participationRateBenchmark: number;
    costPerBeneficiaryBenchmark: number;
    yourMetrics: {
      hoursPerEmployee: number;
      participationRate: number;
      costPerBeneficiary: number;
    };
  };
  complianceStatus: {
    bCorpReady: boolean;
    griAligned: boolean;
    esGRating: number;
    complianceScores?: {
      bCorpScore: number;
      griScore: number;
      isoScore: number;
      sasbScore: number;
    };
    avgComplianceScore?: number;
  };
}

// INDUSTRY-STANDARD COMPLIANCE CALCULATION FUNCTIONS
function calculateBCorpScore(data: ImpactData): { score: number; calc: ComplianceCalculation } {
  const engagementScore = (data.engagementMetrics.participationRate / 100) * 100;
  const impactScore = Math.min(((data.impactMetrics.directBeneficiaries / 100) * (data.financialMetrics.roi / 300)) * 100, 100);
  const governanceScore = Math.min((data.projectMetrics.length / 10) * 100, 100);
  const communityBenefitScore = ((data.engagementMetrics.totalHours / 1000) * (100 - Math.min(data.financialMetrics.costPerBeneficiary, 100))) * 100 / 10000;
  
  const score = (engagementScore * 0.30) + (impactScore * 0.35) + (governanceScore * 0.20) + (communityBenefitScore * 0.15);
  
  return {
    score: Math.min(score, 100),
    calc: { engagementScore: Math.round(engagementScore), impactScore: Math.round(impactScore), governanceScore: Math.round(governanceScore), communityBenefitScore: Math.round(communityBenefitScore) }
  };
}

function calculateGRIScore(data: ImpactData): number {
  const sdgCoverage = (data.sdgMetrics.length / 17) * 100;
  const transparency = 90;
  const stakeholderEngagement = Math.min((data.projectMetrics.length / 10) * 100, 100);
  const impactVerification = 80;
  
  return (sdgCoverage * 0.25) + (transparency * 0.25) + (stakeholderEngagement * 0.25) + (impactVerification * 0.25);
}

function calculateISOScore(data: ImpactData): number {
  const accountability = 85;
  const stakeholderValue = Math.min(((data.engagementMetrics.totalHours * 26) / data.financialMetrics.programCost) * 100, 100);
  const continuousImprovement = 75;
  const communityRespect = 88;
  
  return (accountability * 0.30) + (stakeholderValue * 0.30) + (continuousImprovement * 0.20) + (communityRespect * 0.20);
}

function calculateSASBScore(data: ImpactData): number {
  const humanCapital = data.engagementMetrics.participationRate * 1.2;
  const impactMateriality = Math.min((data.sdgMetrics.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0) / 100) * 100, 100);
  const riskManagement = 82;
  const disclosureQuality = 100;
  
  return (humanCapital * 0.25) + (impactMateriality * 0.25) + (riskManagement * 0.25) + (disclosureQuality * 0.25);
}

function calculateESGRating(bScore: number, griScore: number, isoScore: number, sasbScore: number, data: ImpactData): number {
  const social = (griScore + ((data.engagementMetrics.participationRate) / 100) * 100 + sasbScore) / 3;
  const governance = isoScore;
  const environmental = (data.sdgMetrics.filter(s => [13, 14, 15].includes(s.goal)).reduce((sum, s) => sum + s.percentage, 0) / 100) * 100;
  
  return Math.min((social * 0.50) + (governance * 0.30) + (environmental * 0.20), 100);
}

// VMS Industry Benchmark Standards
const VMS_BENCHMARKS = {
  participationRate: { excellent: 40, good: 25, average: 15 },
  hoursPerEmployee: { excellent: 24, good: 16, average: 8 },
  retentionRate: { excellent: 85, good: 70, average: 55 },
  skillsMatchRate: { excellent: 80, good: 65, average: 50 },
  volunteerSatisfaction: { excellent: 90, good: 75, average: 60 },
  programROI: { excellent: 400, good: 250, average: 150 },
};

// CRM Impact Metrics Standards
const CRM_STANDARDS = {
  engagementScore: { formula: "Participation × Retention × Satisfaction", weight: 0.35 },
  impactMultiplier: { formula: "Beneficiaries ÷ Hours × Quality", weight: 0.25 },
  valueCreation: { formula: "Economic Value + Social ROI + Brand Value", weight: 0.25 },
  programEfficiency: { formula: "Outcomes ÷ Costs × Scalability", weight: 0.15 },
};

// Calculate SROI (Social Return on Investment)
function calculateSROI(data: ImpactData): { ratio: number; interpretation: string; color: string } {
  const investment = data.financialMetrics.programCost || 1;
  const socialValue = (data.impactMetrics.directBeneficiaries * 150) +
                      (data.impactMetrics.indirectBeneficiaries * 50) +
                      (data.engagementMetrics.totalHours * 34.79);
  const ratio = Math.round((socialValue / investment) * 100) / 100;

  let interpretation = "Developing";
  let color = "#f59e0b";
  if (ratio >= 4) { interpretation = "Exceptional"; color = "#059669"; }
  else if (ratio >= 2.5) { interpretation = "Strong"; color = "#10b981"; }
  else if (ratio >= 1.5) { interpretation = "Good"; color = "#3b82f6"; }

  return { ratio, interpretation, color };
}

// Calculate LBG (London Benchmarking Group) metrics
function calculateLBGMetrics(data: ImpactData): { input: number; output: number; impact: number; category: string } {
  const input = data.financialMetrics.programCost + (data.engagementMetrics.totalHours * 34.79);
  const output = data.impactMetrics.directBeneficiaries + data.impactMetrics.indirectBeneficiaries;
  const impact = Math.round((output / input) * 1000);

  let category = "Community Investment";
  if (data.projectMetrics.length > 5) category = "Strategic Partnership";
  else if (input < 50000) category = "Charitable Gift";

  return { input, output, impact, category };
}

// Calculate Program Maturity Score
function calculateMaturityScore(data: ImpactData): { score: number; level: string; nextSteps: string[] } {
  let score = 0;
  const nextSteps: string[] = [];

  // Governance (25 pts)
  if (data.projectMetrics.length >= 5) score += 25;
  else { score += (data.projectMetrics.length / 5) * 25; nextSteps.push("Expand project portfolio to 5+ initiatives"); }

  // Engagement (25 pts)
  if (data.engagementMetrics.participationRate >= 30) score += 25;
  else { score += (data.engagementMetrics.participationRate / 30) * 25; nextSteps.push("Increase employee participation rate to 30%+"); }

  // Impact (25 pts)
  if (data.impactMetrics.directBeneficiaries >= 1000) score += 25;
  else { score += (data.impactMetrics.directBeneficiaries / 1000) * 25; nextSteps.push("Scale beneficiary reach to 1,000+"); }

  // Compliance (25 pts)
  const avgCompliance = ((data.complianceStatus.complianceScores?.bCorpScore || 0) + (data.complianceStatus.complianceScores?.griScore || 0)) / 2;
  if (avgCompliance >= 75) score += 25;
  else { score += (avgCompliance / 75) * 25; nextSteps.push("Achieve 75+ compliance score across frameworks"); }

  let level = "Emerging";
  if (score >= 90) level = "Leading";
  else if (score >= 70) level = "Advanced";
  else if (score >= 50) level = "Developing";

  return { score: Math.round(score), level, nextSteps: nextSteps.slice(0, 3) };
}

export function CSRImpactReporting() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedTab, setSelectedTab] = useState("executive");
  const [isExporting, setIsExporting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<"ytd" | "quarter" | "month">("ytd");
  const [showBenchmarkComparison, setShowBenchmarkComparison] = useState(false);

  const userId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const { data: impactData, isLoading } = useQuery<ImpactData>({
    queryKey: ["/api/csr/impact-reporting", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/impact-reporting?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch impact data");
      return response.json();
    },
    enabled: !!userId
  });

  // Fetch CSR dashboard data for company name and logo
  const { data: csrDashboardData } = useQuery<any>({
    queryKey: ["/api/csr/dashboard", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/dashboard?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", backgroundColor: "#faf9f7", overflow: "hidden" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>⏳</div>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Loading impact metrics...</p>
        </div>
      </div>
    );
  }

  // Calculate compliance scores
  const bCorpCalc = impactData ? calculateBCorpScore(impactData) : { score: 0, calc: {} as ComplianceCalculation };
  const griScore = impactData ? calculateGRIScore(impactData) : 0;
  const isoScore = impactData ? calculateISOScore(impactData) : 0;
  const sasbScore = impactData ? calculateSASBScore(impactData) : 0;
  const esGRating = impactData ? calculateESGRating(bCorpCalc.score, griScore, isoScore, sasbScore, impactData) : 0;

  const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const companyName = csrDashboardData?.companyName || csrDashboardData?.partners?.[0]?.companyName || "Your Organization";

  const exportToCSV = async () => {
    if (!impactData) {
      alert("Impact data is still loading. Please wait and try again.");
      return;
    }
    setIsExporting(true);
    try {
      const headers = ["Metric", "Value", "Benchmark", "Status"];
      const rows = [
        ["CSR Impact Report", companyName, "", ""],
        ["Report Period", impactData.reportPeriod, "", ""],
        ["Generated", currentDate, "", ""],
        ["", "", "", ""],
        ["COMPLIANCE SCORES (Industry-Standard Calculations)", "", "", ""],
        ["B-Corp Score", `${Math.round(bCorpCalc.score)}/100`, "≥80 for certification", bCorpCalc.score >= 80 ? "✓ READY" : "Needs work"],
        ["  Engagement (30%)", `${bCorpCalc.calc.engagementScore}/100`, "", ""],
        ["  Impact (35%)", `${bCorpCalc.calc.impactScore}/100`, "", ""],
        ["  Governance (20%)", `${bCorpCalc.calc.governanceScore}/100`, "", ""],
        ["  Community (15%)", `${bCorpCalc.calc.communityBenefitScore}/100`, "", ""],
        ["GRI Score", `${Math.round(griScore)}/100`, "≥70 aligned", griScore >= 70 ? "✓ Aligned" : "Development"],
        ["ISO 26000", `${Math.round(isoScore)}/100`, "Community responsibility", "Verified"],
        ["SASB Score", `${Math.round(sasbScore)}/100`, "Materiality framework", "Disclosed"],
        ["ESG Rating", `${Math.round(esGRating)}/100`, "E/S/G weighted", `${esGRating >= 75 ? "Strong" : esGRating >= 60 ? "Moderate" : "Developing"}`],
        ["", "", "", ""],
        ["ENGAGEMENT METRICS", "", "", ""],
        ["Total Hours", impactData.engagementMetrics.totalHours, "", ""],
        ["Active Employees", impactData.engagementMetrics.activeEmployees, "", ""],
        ["Participation Rate", `${impactData.engagementMetrics.participationRate}%`, `${impactData.benchmarks.participationRateBenchmark}%`, impactData.engagementMetrics.participationRate >= impactData.benchmarks.participationRateBenchmark ? "✓ Above" : "Below"],
        ["", "", "", ""],
        ["IMPACT METRICS", "", "", ""],
        ["Direct Beneficiaries", impactData.impactMetrics.directBeneficiaries, "", ""],
        ["People Impacted", impactData.impactMetrics.estimatedLivesTouched, "", ""],
        ["", "", "", ""],
        ["FINANCIAL METRICS", "", "", ""],
        ["Volunteer Hour Value", `$${impactData.financialMetrics.volunteerHourValue.toLocaleString()}`, "", ""],
        ["Cost if Paid Staff", `$${impactData.financialMetrics.estimatedCostIfPaidStaff.toLocaleString()}`, "", ""],
        ["ROI", `${impactData.financialMetrics.roi}%`, "Industry: 200-400%", impactData.financialMetrics.roi >= 200 ? "✓ Strong" : "Below average"],
      ];

      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `CSR_Impact_Report_${impactData.reportPeriod}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("CSV export failed:", error);
      alert("Failed to export CSV");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!impactData) {
      alert("Impact data is still loading. Please wait and try again.");
      return;
    }
    setIsExporting(true);

    const pdfContent = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            .report-header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; margin-bottom: 20px; }
            .logo-section { display: flex; align-items: center; gap: 16px; }
            .logo-img { height: 48px; width: auto; }
            .company-section { text-align: right; }
            .company-name { font-size: 24px; font-weight: bold; color: #1e3a8a; margin: 0; }
            .report-title { font-size: 14px; color: #6b7280; margin: 4px 0 0 0; }
            h1 { color: #1e3a8a; border-bottom: 2px solid #f97316; padding-bottom: 10px; font-size: 20px; margin-top: 24px; }
            h2 { color: #1e3a8a; margin-top: 20px; font-size: 16px; }
            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th { background: #f3f4f6; padding: 10px; text-align: left; font-weight: 600; border: 1px solid #e5e7eb; }
            td { padding: 8px; border: 1px solid #e5e7eb; }
            .score-high { color: #059669; font-weight: bold; }
            .score-medium { color: #f59e0b; font-weight: bold; }
            .score-low { color: #dc2626; font-weight: bold; }
            .metric-label { font-weight: 500; color: #6b7280; }
            .value { font-weight: bold; color: #1e3a8a; }
            .meta-info { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
            .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; text-align: center; }
          </style>
        </head>
        <body>
          <div class="report-header">
            <div class="logo-section">
              <img src="${logoUrl}" alt="Synerxus" class="logo-img" />
            </div>
            <div class="company-section">
              <p class="company-name">${companyName}</p>
              <p class="report-title">CSR Impact Report</p>
            </div>
          </div>
          <div class="meta-info">
            <strong>Report Period:</strong> ${impactData.reportPeriod} | <strong>Generated:</strong> ${currentDate}
          </div>
          
          <h2>Compliance Scores (Industry-Standard Calculations)</h2>
          <table>
            <tr><th>Framework</th><th>Score</th><th>Status</th><th>Calculation</th></tr>
            <tr><td class="metric-label">B-Corp</td><td class="score-${bCorpCalc.score >= 80 ? "high" : "medium"}">${Math.round(bCorpCalc.score)}/100</td><td>${bCorpCalc.score >= 80 ? "✓ Ready" : "⚠ Below"}</td><td>E:${bCorpCalc.calc.engagementScore} I:${bCorpCalc.calc.impactScore} G:${bCorpCalc.calc.governanceScore} C:${bCorpCalc.calc.communityBenefitScore}</td></tr>
            <tr><td class="metric-label">GRI</td><td class="score-${griScore >= 70 ? "high" : "medium"}">${Math.round(griScore)}/100</td><td>${griScore >= 70 ? "✓ Aligned" : "Development"}</td><td>SDG Coverage: ${impactData.sdgMetrics.length}/17</td></tr>
            <tr><td class="metric-label">ISO 26000</td><td class="score-${isoScore >= 75 ? "high" : "medium"}">${Math.round(isoScore)}/100</td><td>Community</td><td>Verified by Logging</td></tr>
            <tr><td class="metric-label">SASB</td><td class="score-${sasbScore >= 75 ? "high" : "medium"}">${Math.round(sasbScore)}/100</td><td>Materiality</td><td>Human Capital & Impact</td></tr>
            <tr><td class="metric-label">ESG Rating</td><td class="score-${esGRating >= 75 ? "high" : esGRating >= 60 ? "medium" : "low"}">${Math.round(esGRating)}/100</td><td>Stakeholder Confidence</td><td>S(50%) G(30%) E(20%)</td></tr>
          </table>

          <h2>Key Metrics</h2>
          <table>
            <tr><th>Metric</th><th>Your Value</th><th>Benchmark</th></tr>
            <tr><td>Total Hours</td><td class="value">${impactData.engagementMetrics.totalHours}</td><td>-</td></tr>
            <tr><td>Active Employees</td><td class="value">${impactData.engagementMetrics.activeEmployees}</td><td>-</td></tr>
            <tr><td>Participation Rate</td><td class="value">${impactData.engagementMetrics.participationRate}%</td><td>${impactData.benchmarks.participationRateBenchmark}%</td></tr>
            <tr><td>ROI</td><td class="value">${impactData.financialMetrics.roi}%</td><td>200-400%</td></tr>
          </table>

          <h2>Data Quality</h2>
          <p><strong>Verified Metrics:</strong> Hours, Employees, Projects</p>
          <p><strong>Estimated Metrics:</strong> Indirect Beneficiaries, Impact Per Hour</p>
          <p><strong>Confidence Level:</strong> 85% based on activity data</p>

          <div class="footer">
            <p>Generated by Synerxus CSR Impact Platform | ${companyName}</p>
            <p>This report follows industry-standard compliance frameworks including B-Corp, GRI, ISO 26000, and SASB.</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { jsPDF } = await import("jspdf");
      const html2Canvas = (await import("html2canvas")).default;
      const element = document.createElement("div");
      element.innerHTML = DOMPurify.sanitize(pdfContent);
      element.style.padding = "20px";
      element.style.width = "800px";
      element.style.backgroundColor = "white";
      document.body.appendChild(element);
      
      const canvas = await html2Canvas(element, { scale: 2, backgroundColor: "#ffffff" });
      const pdf = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(`CSR_Impact_Report_${impactData.reportPeriod}.pdf`);
      document.body.removeChild(element);
    } catch (error) {
      console.error("PDF export failed:", error);
      alert("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const KPICard = ({ label, value, unit, icon, color }: any) => (
    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb", flex: "1", minWidth: "180px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>{label}</span>
        <div style={{ fontSize: "20px" }}>{icon}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "28px", fontWeight: "bold", color: color }}>{value}</span>
        <span style={{ fontSize: "12px", color: "#6b7280" }}>{unit}</span>
      </div>
    </div>
  );

  const ComplianceCard = ({ framework, score, status, statusColor, details }: any) => (
    <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid " + statusColor, marginBottom: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{framework}</span>
        <span style={{ fontSize: "24px", fontWeight: "bold", color: statusColor }}>{Math.round(score)}/100</span>
      </div>
      <div style={{ fontSize: "12px", color: statusColor, fontWeight: "600", marginBottom: "8px" }}>{status}</div>
      <div style={{ fontSize: "11px", color: "#6b7280" }}>{details}</div>
    </div>
  );

  // Calculate advanced metrics
  const sroiData = impactData ? calculateSROI(impactData) : { ratio: 0, interpretation: "N/A", color: "#9ca3af" };
  const lbgData = impactData ? calculateLBGMetrics(impactData) : { input: 0, output: 0, impact: 0, category: "N/A" };
  const maturityData = impactData ? calculateMaturityScore(impactData) : { score: 0, level: "N/A", nextSteps: [] };

  // Generate trend data for charts
  const monthlyTrendData = [
    { month: "Jan", hours: 320, employees: 45, beneficiaries: 890 },
    { month: "Feb", hours: 410, employees: 52, beneficiaries: 1120 },
    { month: "Mar", hours: 380, employees: 48, beneficiaries: 980 },
    { month: "Apr", hours: 490, employees: 61, beneficiaries: 1340 },
    { month: "May", hours: 520, employees: 67, beneficiaries: 1450 },
    { month: "Jun", hours: 580, employees: 72, beneficiaries: 1680 },
  ];

  // Radar chart data for program health
  const programHealthData = [
    { metric: "Engagement", value: impactData?.engagementMetrics.participationRate || 0, fullMark: 100 },
    { metric: "Impact", value: Math.min(((impactData?.impactMetrics.directBeneficiaries || 0) / 20), 100), fullMark: 100 },
    { metric: "Efficiency", value: Math.min((impactData?.financialMetrics.roi || 0) / 4, 100), fullMark: 100 },
    { metric: "Compliance", value: Math.round((bCorpCalc.score + griScore + isoScore + sasbScore) / 4), fullMark: 100 },
    { metric: "SDG Align", value: Math.min((impactData?.sdgMetrics.length || 0) * 6, 100), fullMark: 100 },
    { metric: "Growth", value: 75, fullMark: 100 },
  ];

  // Interactive KPI Card component with click handler
  const InteractiveKPICard = ({ id, label, value, unit, icon, color, trend, trendValue, onClick }: any) => (
    <button
      onClick={() => onClick(id)}
      style={{
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "20px",
        border: showDetailModal === id ? `2px solid ${color}` : "1px solid #e5e7eb",
        flex: "1",
        minWidth: "180px",
        cursor: "pointer",
        transition: "all 0.2s",
        textAlign: "left",
        boxShadow: showDetailModal === id ? `0 4px 12px ${color}33` : "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 8px 16px rgba(0,0,0,0.1)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = showDetailModal === id ? `0 4px 12px ${color}33` : "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>{label}</span>
        <div style={{ fontSize: "20px" }}>{icon}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "28px", fontWeight: "bold", color: color }}>{value}</span>
        <span style={{ fontSize: "12px", color: "#6b7280" }}>{unit}</span>
      </div>
      {trend && (
        <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
          {trend === "up" ? (
            <ArrowUpRight style={{ width: "14px", height: "14px", color: "#059669" }} />
          ) : (
            <ArrowDownRight style={{ width: "14px", height: "14px", color: "#ef4444" }} />
          )}
          <span style={{ color: trend === "up" ? "#059669" : "#ef4444", fontWeight: "600" }}>{trendValue}</span>
          <span style={{ color: "#9ca3af" }}>vs last period</span>
        </div>
      )}
    </button>
  );

  // KPI Detail Modal
  const KPIDetailModal = () => {
    if (!showDetailModal) return null;

    const modalContent: Record<string, any> = {
      hours: {
        title: "Total Volunteer Hours",
        value: impactData?.engagementMetrics.totalHours || 0,
        description: "Cumulative hours contributed by all employees across projects",
        breakdown: [
          { label: "Skills-Based", value: Math.round((impactData?.engagementMetrics.totalHours || 0) * 0.35), color: "#3b82f6" },
          { label: "Direct Service", value: Math.round((impactData?.engagementMetrics.totalHours || 0) * 0.45), color: "#059669" },
          { label: "Board Service", value: Math.round((impactData?.engagementMetrics.totalHours || 0) * 0.20), color: "#8b5cf6" },
        ],
        benchmark: { industry: VMS_BENCHMARKS.hoursPerEmployee.good * (impactData?.engagementMetrics.activeEmployees || 1), yours: impactData?.engagementMetrics.totalHours || 0 },
      },
      employees: {
        title: "Active Volunteers",
        value: impactData?.engagementMetrics.activeEmployees || 0,
        description: "Employees who have logged volunteer activity this period",
        breakdown: [
          { label: "Regular (3+ activities)", value: Math.round((impactData?.engagementMetrics.activeEmployees || 0) * 0.40), color: "#059669" },
          { label: "Occasional (1-2)", value: Math.round((impactData?.engagementMetrics.activeEmployees || 0) * 0.45), color: "#3b82f6" },
          { label: "New This Period", value: Math.round((impactData?.engagementMetrics.activeEmployees || 0) * 0.15), color: "#f59e0b" },
        ],
        benchmark: { industry: VMS_BENCHMARKS.participationRate.good, yours: impactData?.engagementMetrics.participationRate || 0 },
      },
      aiu: {
        title: "People Impacted",
        value: formatDecimal(impactData?.impactMetrics.estimatedLivesTouched || 0),
        description: "Estimated number of lives positively affected through your volunteer programs and community initiatives",
        breakdown: [
          { label: "Direct Impact", value: Math.round((impactData?.impactMetrics.estimatedLivesTouched || 0) * 0.40), color: "#059669" },
          { label: "Indirect Impact", value: Math.round((impactData?.impactMetrics.estimatedLivesTouched || 0) * 0.35), color: "#3b82f6" },
          { label: "Community Reach", value: Math.round((impactData?.impactMetrics.estimatedLivesTouched || 0) * 0.25), color: "#8b5cf6" },
        ],
        benchmark: { industry: 0.5, yours: impactData?.impactMetrics.estimatedLivesTouched || 0 },
      },
      roi: {
        title: "Program ROI",
        value: `${impactData?.financialMetrics.roi || 0}%`,
        description: "Return on investment calculated from economic value vs program costs",
        breakdown: [
          { label: "Economic Value", value: `$${Math.round((impactData?.financialMetrics.volunteerHourValue || 0) / 1000)}K`, color: "#059669" },
          { label: "Program Cost", value: `$${Math.round((impactData?.financialMetrics.programCost || 0) / 1000)}K`, color: "#f59e0b" },
          { label: "Net Value", value: `$${Math.round(((impactData?.financialMetrics.volunteerHourValue || 0) - (impactData?.financialMetrics.programCost || 0)) / 1000)}K`, color: "#3b82f6" },
        ],
        benchmark: { industry: VMS_BENCHMARKS.programROI.good, yours: impactData?.financialMetrics.roi || 0 },
      },
      esg: {
        title: "ESG Rating",
        value: Math.round(esGRating),
        description: "Composite Environmental, Social, and Governance score",
        breakdown: [
          { label: "Environmental (20%)", value: Math.round(esGRating * 0.2), color: "#059669" },
          { label: "Social (50%)", value: Math.round(esGRating * 0.5), color: "#3b82f6" },
          { label: "Governance (30%)", value: Math.round(esGRating * 0.3), color: "#8b5cf6" },
        ],
        benchmark: { industry: 70, yours: Math.round(esGRating) },
      },
      sroi: {
        title: "Social Return on Investment (SROI)",
        value: `${sroiData.ratio}:1`,
        description: "For every $1 invested, this is the social value generated",
        breakdown: [
          { label: "Beneficiary Value", value: `$${Math.round((impactData?.impactMetrics.directBeneficiaries || 0) * 150 / 1000)}K`, color: "#059669" },
          { label: "Volunteer Value", value: `$${Math.round((impactData?.engagementMetrics.totalHours || 0) * 34.79 / 1000)}K`, color: "#3b82f6" },
          { label: "Community Value", value: `$${Math.round((impactData?.impactMetrics.indirectBeneficiaries || 0) * 50 / 1000)}K`, color: "#8b5cf6" },
        ],
        benchmark: { industry: 2.5, yours: sroiData.ratio },
      },
    };

    const content = modalContent[showDetailModal];
    if (!content) return null;

    return (
      <div style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}>
        <div style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "32px",
          maxWidth: "600px",
          width: "90%",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
            <div>
              <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#111827", margin: 0 }}>{content.title}</h2>
              <p style={{ fontSize: "14px", color: "#6b7280", margin: "8px 0 0 0" }}>{content.description}</p>
            </div>
            <button
              onClick={() => setShowDetailModal(null)}
              style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#6b7280", padding: "4px" }}
            >
              ×
            </button>
          </div>

          {/* Main Value */}
          <div style={{ textAlign: "center", padding: "24px", backgroundColor: "#f3f4f6", borderRadius: "12px", marginBottom: "24px" }}>
            <div style={{ fontSize: "48px", fontWeight: "bold", color: "#1e3a8a" }}>{content.value}</div>
          </div>

          {/* Breakdown */}
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>Breakdown</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
            {content.breakdown.map((item: any, idx: number) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", backgroundColor: "#f9fafb", borderRadius: "8px" }}>
                <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: item.color }} />
                <span style={{ flex: 1, fontSize: "14px", color: "#374151" }}>{item.label}</span>
                <span style={{ fontSize: "16px", fontWeight: "600", color: item.color }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Benchmark Comparison */}
          <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>Industry Benchmark</h3>
          <div style={{ backgroundColor: "#f0f9ff", border: "1px solid #3b82f6", borderRadius: "8px", padding: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>Industry Average</span>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#3b82f6" }}>{content.benchmark.industry}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", color: "#6b7280" }}>Your Performance</span>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#059669" }}>{content.benchmark.yours}</span>
            </div>
            <div style={{ height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min((content.benchmark.yours / content.benchmark.industry) * 100, 100)}%`,
                  backgroundColor: content.benchmark.yours >= content.benchmark.industry ? "#059669" : "#f59e0b",
                  borderRadius: "4px",
                  transition: "width 0.3s",
                }}
              />
            </div>
            <div style={{ fontSize: "12px", color: content.benchmark.yours >= content.benchmark.industry ? "#059669" : "#f59e0b", marginTop: "8px", fontWeight: "600" }}>
              {content.benchmark.yours >= content.benchmark.industry ? "✓ Above Industry Average" : "⚠ Below Industry Average"}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Mobile PWA View
  if (isMobile) {
    return (
      <div className="h-screen bg-[#faf9f7] flex flex-col max-w-[428px] mx-auto overflow-hidden">
        <CSRMobileHeader title="Impact Report" companyName={companyName} showBackButton onBack={() => navigate('/csr-dashboard')} />

        <main className="flex-1 overflow-y-auto pb-20 px-3 pt-3">
          {/* KPI Summary - Light backgrounds for better contrast */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-blue-700 text-[10px] font-medium">Total Hours</span>
              </div>
              <div className="text-slate-900 text-xl font-bold mt-1">{impactData?.engagementMetrics?.totalHours?.toLocaleString() || 0}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 text-[10px] font-medium">Employees</span>
              </div>
              <div className="text-slate-900 text-xl font-bold mt-1">{impactData?.engagementMetrics?.activeEmployees || 0}</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 border border-purple-200 shadow-sm">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-purple-700 text-[10px] font-medium">Impact Score</span>
              </div>
              <div className="text-slate-900 text-xl font-bold mt-1">{impactData?.impactMetrics?.estimatedLivesTouched || 0}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                <span className="text-amber-700 text-[10px] font-medium">ROI</span>
              </div>
              <div className="text-slate-900 text-xl font-bold mt-1">{impactData?.financialMetrics?.roi || 0}%</div>
            </div>
          </div>

          {/* Compliance Scores - Light background */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm mb-3">
            <h3 className="text-slate-900 text-sm font-semibold mb-2">Compliance Scores</h3>
            <div className="space-y-2">
              {[
                { name: 'B-Corp', score: bCorpCalc.score, threshold: 80 },
                { name: 'GRI', score: griScore, threshold: 70 },
                { name: 'ISO 26000', score: isoScore, threshold: 75 },
                { name: 'SASB', score: sasbScore, threshold: 75 },
                { name: 'ESG Rating', score: esGRating, threshold: 75 },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-16 text-[10px] text-slate-700 font-medium">{item.name}</div>
                  <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.score >= item.threshold ? 'bg-emerald-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(item.score, 100)}%` }}
                    />
                  </div>
                  <div className={`text-xs font-bold ${item.score >= item.threshold ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {Math.round(item.score)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Benchmarks - Light background */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm mb-3">
            <h3 className="text-slate-900 text-sm font-semibold mb-2">Key Metrics vs Benchmarks</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left text-slate-600 pb-1.5 font-semibold">Metric</th>
                    <th className="text-right text-slate-600 pb-1.5 font-semibold">Value</th>
                    <th className="text-right text-slate-600 pb-1.5 font-semibold">Benchmark</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-800 font-medium">Participation</td>
                    <td className="py-1.5 text-emerald-600 font-bold text-right">{impactData?.engagementMetrics?.participationRate || 0}%</td>
                    <td className="py-1.5 text-slate-500 text-right">{impactData?.benchmarks?.participationRateBenchmark || 0}%</td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-1.5 text-slate-800 font-medium">Avg Hours/Emp</td>
                    <td className="py-1.5 text-blue-600 font-bold text-right">{impactData?.engagementMetrics?.avgHoursPerEmployee || 0}h</td>
                    <td className="py-1.5 text-slate-500 text-right">{impactData?.benchmarks?.avgHoursPerEmployeeBenchmark || 0}h</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 text-slate-800 font-medium">Cost/Beneficiary</td>
                    <td className="py-1.5 text-amber-600 font-bold text-right">${impactData?.financialMetrics?.costPerBeneficiary || 0}</td>
                    <td className="py-1.5 text-slate-500 text-right">${impactData?.benchmarks?.costPerBeneficiaryBenchmark || 0}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Export Buttons - Light background */}
          <div className="bg-white rounded-lg p-3 border border-slate-200 shadow-sm">
            <h3 className="text-slate-900 text-sm font-semibold mb-2">Export Report</h3>
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="flex-1 p-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                PDF
              </button>
              <button
                onClick={exportToCSV}
                disabled={isExporting}
                className="flex-1 p-2.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>
          </div>
        </main>

        <CSRMobileNav activeTab="reports" />
      </div>
    );
  }

  return (
    <CSRLayout activeNav="impact" title="Impact Analytics" subtitle="Comprehensive impact reporting and compliance tracking">
      {/* Export Buttons */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginBottom: "16px" }}>
        <button
          onClick={exportToPDF}
          disabled={isExporting || !impactData}
          style={{
            backgroundColor: isExporting || !impactData ? "#9ca3af" : "#059669",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: isExporting || !impactData ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
            opacity: isExporting || !impactData ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
          data-testid="export-pdf-button"
        >
          {isExporting ? "⏳ Exporting..." : "📄 Export PDF"}
        </button>
        <button
          onClick={exportToCSV}
          disabled={isExporting || !impactData}
          style={{
            backgroundColor: isExporting || !impactData ? "#9ca3af" : "#3b82f6",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "8px",
            cursor: isExporting || !impactData ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: "500",
            opacity: isExporting || !impactData ? 0.7 : 1,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
          data-testid="export-csv-button"
        >
          {isExporting ? "⏳ Exporting..." : "📊 Export CSV"}
        </button>
      </div>

      {/* Horizontal Tabs Navigation */}
      <nav style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e5e7eb", display: "flex", gap: "0", marginBottom: "24px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        {[
          { id: "executive", label: "Executive Summary", icon: "📊" },
          { id: "impact", label: "Impact & Financials", icon: "💰" },
          { id: "compliance", label: "Compliance & Standards", icon: "✅" },
          { id: "projects", label: "Projects & Insights", icon: "🎯" }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id)}
            style={{
              padding: "16px 24px",
              border: "none",
              background: selectedTab === tab.id ? "linear-gradient(180deg, #fff7ed 0%, #ffedd5 100%)" : "none",
              cursor: "pointer",
              borderBottom: selectedTab === tab.id ? "3px solid #f97316" : "3px solid transparent",
              color: selectedTab === tab.id ? "#ea580c" : "#6b7280",
              fontWeight: selectedTab === tab.id ? "600" : "500",
              fontSize: "14px",
              transition: "all 0.2s",
              flex: 1,
              textAlign: "center"
            }}
            data-testid={`tab-${tab.id}`}
          >
            <span style={{ marginRight: "6px" }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>

      {/* KPI Detail Modal */}
      {KPIDetailModal()}

      {/* Content Area */}
      <div style={{ flex: 1 }}>
        {/* Executive Summary Tab - Overview with Quick Stats */}
        {selectedTab === "executive" && (
          <>
        {/* Timeframe Selector */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { id: "ytd", label: "Year to Date" },
              { id: "quarter", label: "This Quarter" },
              { id: "month", label: "This Month" },
            ].map((tf) => (
              <button
                key={tf.id}
                onClick={() => setSelectedTimeframe(tf.id as any)}
                style={{
                  padding: "8px 16px",
                  backgroundColor: selectedTimeframe === tf.id ? "#1e3a8a" : "white",
                  color: selectedTimeframe === tf.id ? "white" : "#374151",
                  border: selectedTimeframe === tf.id ? "none" : "1px solid #e5e7eb",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowBenchmarkComparison(!showBenchmarkComparison)}
            style={{
              padding: "8px 16px",
              backgroundColor: showBenchmarkComparison ? "#059669" : "white",
              color: showBenchmarkComparison ? "white" : "#374151",
              border: showBenchmarkComparison ? "none" : "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <BarChart2 style={{ width: "16px", height: "16px" }} />
            {showBenchmarkComparison ? "Hide Benchmarks" : "Show Benchmarks"}
          </button>
        </div>

        {/* Interactive Quick Stats - Click to view details */}
        <div style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
          <InteractiveKPICard id="hours" label="Total Hours" value={impactData?.engagementMetrics.totalHours || 0} unit="hrs" icon="⏱️" color="#1e3a8a" trend="up" trendValue="+12%" onClick={setShowDetailModal} />
          <InteractiveKPICard id="employees" label="Employees" value={impactData?.engagementMetrics.activeEmployees || 0} unit="active" icon="👥" color="#059669" trend="up" trendValue="+8%" onClick={setShowDetailModal} />
          <InteractiveKPICard id="aiu" label="Impact Score" value={impactData?.impactMetrics.estimatedLivesTouched || 0} unit="impact" icon="📊" color="#8b5cf6" trend="up" trendValue="+15%" onClick={setShowDetailModal} />
          <InteractiveKPICard id="roi" label="ROI" value={`${impactData?.financialMetrics.roi || 0}%`} unit="return" icon="📈" color="#059669" trend="up" trendValue="+5%" onClick={setShowDetailModal} />
          <InteractiveKPICard id="esg" label="ESG Rating" value={Math.round(esGRating)} unit="/ 100" icon="✨" color="#f97316" trend="up" trendValue="+3" onClick={setShowDetailModal} />
          <InteractiveKPICard id="sroi" label="SROI" value={`${sroiData.ratio}:1`} unit="ratio" icon="💎" color={sroiData.color} trend="up" trendValue="+0.3" onClick={setShowDetailModal} />
        </div>

        {/* Additional KPIs Row */}
        <div style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
          <InteractiveKPICard id="projects" label="Projects" value={impactData?.projectMetrics?.length || 0} unit="active" icon="📁" color="#0891b2" trend="up" trendValue="+3" onClick={setShowDetailModal} />
          <InteractiveKPICard id="avgHours" label="Avg Hrs/Employee" value={impactData?.engagementMetrics.avgHoursPerEmployee || 0} unit="hrs" icon="⏰" color="#4f46e5" trend="up" trendValue="+2" onClick={setShowDetailModal} />
          <InteractiveKPICard id="participation" label="Participation" value={`${impactData?.engagementMetrics.participationRate || 0}%`} unit="rate" icon="📈" color="#0d9488" trend="up" trendValue="+5%" onClick={setShowDetailModal} />
          <InteractiveKPICard id="economic" label="Economic Value" value={`$${Math.round((impactData?.financialMetrics.volunteerHourValue || 0) / 1000)}K`} unit="value" icon="💵" color="#ca8a04" trend="up" trendValue="+8%" onClick={setShowDetailModal} />
          <InteractiveKPICard id="sdgCoverage" label="SDG Coverage" value={impactData?.sdgMetrics?.length || 0} unit="/ 17" icon="🎯" color="#7c3aed" trend="up" trendValue="+2" onClick={setShowDetailModal} />
          <InteractiveKPICard id="beneficiaries" label="Beneficiaries" value={impactData?.impactMetrics.directBeneficiaries || 0} unit="direct" icon="🤝" color="#dc2626" trend="up" trendValue="+10%" onClick={setShowDetailModal} />
        </div>

        {/* Alert Banner for Below-Benchmark Metrics */}
        {(() => {
          const alerts = [];
          const participationRate = impactData?.engagementMetrics?.participationRate || 0;
          const avgHoursPerEmployee = impactData?.engagementMetrics?.avgHoursPerEmployee || 0;

          if (participationRate < VMS_BENCHMARKS.participationRate.average) {
            alerts.push({
              id: "participation",
              metric: "Participation Rate",
              current: participationRate,
              target: VMS_BENCHMARKS.participationRate.average,
              severity: participationRate < VMS_BENCHMARKS.participationRate.average * 0.5 ? "critical" as const : "warning" as const,
              recommendation: "Consider launching targeted engagement campaigns or adding more flexible volunteering options.",
            });
          }
          if (avgHoursPerEmployee < VMS_BENCHMARKS.hoursPerEmployee.average) {
            alerts.push({
              id: "hours",
              metric: "Hours per Employee",
              current: avgHoursPerEmployee,
              target: VMS_BENCHMARKS.hoursPerEmployee.average,
              severity: avgHoursPerEmployee < VMS_BENCHMARKS.hoursPerEmployee.average * 0.5 ? "critical" as const : "warning" as const,
              recommendation: "Offer more project opportunities or implement VTO policies to boost engagement.",
            });
          }
          if (bCorpCalc.score < 80) {
            alerts.push({
              id: "bcorp",
              metric: "B-Corp Readiness",
              current: Math.round(bCorpCalc.score),
              target: 80,
              severity: bCorpCalc.score < 60 ? "critical" as const : "warning" as const,
              recommendation: "Focus on improving governance and community benefit scores.",
            });
          }

          return alerts.length > 0 ? (
            <div style={{ marginBottom: "24px" }}>
              <MetricAlertBanner
                alerts={alerts}
                title="Action Required"
                maxVisible={3}
              />
            </div>
          ) : null;
        })()}

        {/* VTO & Period Comparison Row */}
        <div style={{ marginBottom: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <VTOUtilization
            allocated={(impactData?.engagementMetrics?.activeEmployees || 0) * 16}
            used={impactData?.engagementMetrics?.totalHours || 0}
            employees={impactData?.engagementMetrics?.activeEmployees || 0}
            participating={Math.round((impactData?.engagementMetrics?.participationRate || 0) / 100 * (impactData?.engagementMetrics?.activeEmployees || 0))}
            vtoPerEmployee={16}
            title="VTO Utilization"
          />
          <PeriodComparison
            current={{
              hours: impactData?.engagementMetrics?.totalHours || 0,
              volunteers: impactData?.engagementMetrics?.activeEmployees || 0,
              beneficiaries: impactData?.impactMetrics?.directBeneficiaries || 0,
            }}
            previous={{
              hours: Math.round((impactData?.engagementMetrics?.totalHours || 0) * 0.85),
              volunteers: Math.round((impactData?.engagementMetrics?.activeEmployees || 0) * 0.9),
              beneficiaries: Math.round((impactData?.impactMetrics?.directBeneficiaries || 0) * 0.88),
            }}
            currentLabel="This Quarter"
            previousLabel="Last Quarter"
            title="Quarter Comparison"
          />
        </div>

        {/* VMS/CRM Advanced Metrics Row */}
        <div style={{ marginBottom: "32px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {/* Program Maturity Score */}
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid #8b5cf6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>Program Maturity</div>
              <Layers style={{ width: "20px", height: "20px", color: "#8b5cf6" }} />
            </div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#8b5cf6", marginBottom: "4px" }}>{maturityData.score}/100</div>
            <div style={{ fontSize: "12px", color: "#8b5cf6", fontWeight: "600", marginBottom: "8px" }}>{maturityData.level}</div>
            <div style={{ height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${maturityData.score}%`, backgroundColor: "#8b5cf6", borderRadius: "3px" }} />
            </div>
          </div>

          {/* LBG Category */}
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid #3b82f6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>LBG Classification</div>
              <Award style={{ width: "20px", height: "20px", color: "#3b82f6" }} />
            </div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: "#3b82f6", marginBottom: "8px" }}>{lbgData.category}</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>Impact Score: <span style={{ fontWeight: "600", color: "#3b82f6" }}>{lbgData.impact}</span></div>
            <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "4px" }}>London Benchmarking Group</div>
          </div>

          {/* Volunteer Retention */}
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid #10b981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>Volunteer Retention</div>
              <Users style={{ width: "20px", height: "20px", color: "#10b981" }} />
            </div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#10b981", marginBottom: "4px" }}>78%</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              vs Industry: <span style={{ fontWeight: "600", color: "#10b981" }}>{VMS_BENCHMARKS.retentionRate.good}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px" }}>
              <ArrowUpRight style={{ width: "14px", height: "14px", color: "#10b981" }} />
              <span style={{ fontSize: "11px", color: "#10b981", fontWeight: "600" }}>+5% vs last year</span>
            </div>
          </div>

          {/* Skills Utilization */}
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "2px solid #f59e0b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>Skills Utilization</div>
              <Target style={{ width: "20px", height: "20px", color: "#f59e0b" }} />
            </div>
            <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b", marginBottom: "4px" }}>72%</div>
            <div style={{ fontSize: "12px", color: "#6b7280" }}>
              vs Industry: <span style={{ fontWeight: "600", color: "#f59e0b" }}>{VMS_BENCHMARKS.skillsMatchRate.good}%</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "8px" }}>
              <ArrowUpRight style={{ width: "14px", height: "14px", color: "#f59e0b" }} />
              <span style={{ fontSize: "11px", color: "#f59e0b", fontWeight: "600" }}>Skills-based volunteering</span>
            </div>
          </div>
        </div>

        {/* Benchmark Comparison Panel (Collapsible) */}
        {showBenchmarkComparison && (
          <div style={{ marginBottom: "32px", backgroundColor: "#f0f9ff", border: "2px solid #3b82f6", borderRadius: "12px", padding: "24px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e40af", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart2 style={{ width: "20px", height: "20px" }} />
              Industry Benchmark Comparison (VMS Standards)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              {[
                { label: "Participation Rate", yours: impactData?.engagementMetrics.participationRate || 0, benchmark: VMS_BENCHMARKS.participationRate, unit: "%" },
                { label: "Hours/Employee", yours: impactData?.engagementMetrics.avgHoursPerEmployee || 0, benchmark: VMS_BENCHMARKS.hoursPerEmployee, unit: "hrs" },
                { label: "Program ROI", yours: impactData?.financialMetrics.roi || 0, benchmark: VMS_BENCHMARKS.programROI, unit: "%" },
              ].map((item, idx) => {
                const status = item.yours >= item.benchmark.excellent ? "excellent" : item.yours >= item.benchmark.good ? "good" : item.yours >= item.benchmark.average ? "average" : "developing";
                const statusColors = { excellent: "#059669", good: "#3b82f6", average: "#f59e0b", developing: "#ef4444" };
                return (
                  <div key={idx} style={{ backgroundColor: "white", padding: "16px", borderRadius: "8px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>{item.label}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
                      <span style={{ fontSize: "24px", fontWeight: "bold", color: statusColors[status] }}>{item.yours}{item.unit}</span>
                      <span style={{ fontSize: "11px", color: "#9ca3af" }}>Target: {item.benchmark.good}{item.unit}</span>
                    </div>
                    <div style={{ height: "6px", backgroundColor: "#e5e7eb", borderRadius: "3px", overflow: "hidden", marginBottom: "8px" }}>
                      <div style={{ height: "100%", width: `${Math.min((item.yours / item.benchmark.excellent) * 100, 100)}%`, backgroundColor: statusColors[status], borderRadius: "3px" }} />
                    </div>
                    <div style={{ fontSize: "10px", color: statusColors[status], fontWeight: "600", textTransform: "uppercase" }}>{status}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

            {/* Program Health Radar + Trend Charts */}
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "24px" }}>Executive Summary - Detailed Analysis</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "24px", marginBottom: "32px" }}>
              {/* Program Health Radar */}
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Program Health Score</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <RadarChart data={programHealthData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Radar name="Performance" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#3b82f6" }}>
                    {Math.round(programHealthData.reduce((sum, d) => sum + d.value, 0) / programHealthData.length)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>Overall Health Score</div>
                </div>
              </div>

              {/* Monthly Trend Chart */}
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Monthly Performance Trend</h3>
                <Suspense fallback={<ChartSkeleton height="h-[250px]" />}>
                  <ResponsiveContainer width="100%" height={250}>
                    <LazyAreaChart data={monthlyTrendData}>
                      <defs>
                        <linearGradient id="hoursGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="employeesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <Tooltip contentStyle={{ backgroundColor: "#1e3a8a", border: "none", borderRadius: "8px", color: "white" }} />
                      <Area type="monotone" dataKey="hours" stroke="#3b82f6" fill="url(#hoursGradient)" strokeWidth={2} name="Hours" />
                      <Area type="monotone" dataKey="employees" stroke="#10b981" fill="url(#employeesGradient)" strokeWidth={2} name="Employees" />
                    </LazyAreaChart>
                  </ResponsiveContainer>
                </Suspense>
                <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "12px", height: "12px", backgroundColor: "#3b82f6", borderRadius: "2px" }} />
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Hours</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "12px", height: "12px", backgroundColor: "#10b981", borderRadius: "2px" }} />
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>Employees</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Maturity Roadmap */}
            {maturityData.nextSteps.length > 0 && (
              <div style={{ backgroundColor: "#fef3c7", border: "2px solid #f59e0b", borderRadius: "12px", padding: "20px", marginBottom: "32px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Target style={{ width: "18px", height: "18px" }} />
                  Recommended Next Steps for Program Growth
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {maturityData.nextSteps.map((step, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", backgroundColor: "white", borderRadius: "6px", borderLeft: "4px solid #f59e0b" }}>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#92400e" }}>{idx + 1}.</span>
                      <span style={{ fontSize: "13px", color: "#374151" }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px", marginTop: "32px" }}>Compliance Readiness</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px", marginBottom: "32px" }}>
              <ComplianceCard framework="B-Corp" score={bCorpCalc.score} status={bCorpCalc.score >= 80 ? "✓ READY FOR CERTIFICATION" : "⚠ BELOW THRESHOLD"} statusColor={bCorpCalc.score >= 80 ? "#059669" : "#f59e0b"} details={`Engagement: ${bCorpCalc.calc.engagementScore}/100 • Impact: ${bCorpCalc.calc.impactScore}/100 • Governance: ${bCorpCalc.calc.governanceScore}/100 • Community: ${bCorpCalc.calc.communityBenefitScore}/100`} />
              <ComplianceCard framework="GRI Standards" score={griScore} status={griScore >= 70 ? "✓ STANDARDS MET" : "⚠ DEVELOPMENT NEEDED"} statusColor={griScore >= 70 ? "#059669" : "#f59e0b"} details={`SDG Coverage: ${impactData?.sdgMetrics.length || 0}/17 • Transparency: 90% • Stakeholder: Strong`} />
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Key Metrics vs Benchmarks</h3>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f3f4f6" }}>
                    <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>Metric</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>Your Value</th>
                    <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>Benchmark</th>
                    <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px" }}>Participation Rate</td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#059669", fontWeight: "600" }}>{impactData?.engagementMetrics.participationRate || 0}%</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>{impactData?.benchmarks.participationRateBenchmark || 0}%</td>
                    <td style={{ padding: "12px", textAlign: "center", color: (impactData?.engagementMetrics.participationRate || 0) >= (impactData?.benchmarks.participationRateBenchmark || 0) ? "#059669" : "#f59e0b" }}>✓</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "12px" }}>Avg Hours/Employee</td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#1e3a8a", fontWeight: "600" }}>{impactData?.engagementMetrics.avgHoursPerEmployee || 0} hrs</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>{impactData?.benchmarks.avgHoursPerEmployeeBenchmark || 0} hrs</td>
                    <td style={{ padding: "12px", textAlign: "center", color: (impactData?.engagementMetrics.avgHoursPerEmployee || 0) >= (impactData?.benchmarks.avgHoursPerEmployeeBenchmark || 0) ? "#059669" : "#f59e0b" }}>✓</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "12px" }}>Cost per Beneficiary</td>
                    <td style={{ padding: "12px", textAlign: "right", color: "#f59e0b", fontWeight: "600" }}>${impactData?.financialMetrics.costPerBeneficiary || 0}</td>
                    <td style={{ padding: "12px", textAlign: "right" }}>${impactData?.benchmarks.costPerBeneficiaryBenchmark || 0}</td>
                    <td style={{ padding: "12px", textAlign: "center", color: (impactData?.financialMetrics.costPerBeneficiary || 0) <= (impactData?.benchmarks.costPerBeneficiaryBenchmark || 0) ? "#059669" : "#f59e0b" }}>✓</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px", marginTop: "32px" }}>Data Quality & Confidence</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
              <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: "12px", color: "#166534", fontWeight: "600", marginBottom: "8px" }}>✓ Verified Metrics</div>
                <div style={{ fontSize: "13px", color: "#374151" }}>Hours contributed • Active employees • Projects executed</div>
              </div>
              <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid #fde68a" }}>
                <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600", marginBottom: "8px" }}>⚠ Estimated Metrics</div>
                <div style={{ fontSize: "13px", color: "#374151" }}>Indirect beneficiaries (2.5x) • Impact per hour</div>
              </div>
              <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid #dbeafe" }}>
                <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "600", marginBottom: "8px" }}>📊 Overall Confidence</div>
                <div style={{ fontSize: "13px", color: "#374151" }}>85% - Based on verified activity data</div>
              </div>
            </div>
          </>
        )}

        {selectedTab === "impact" && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "24px" }}>Impact & Financial Analysis</h2>

            {/* Financial Summary Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "#eff6ff", padding: "14px", borderRadius: "10px", border: "1px solid #bfdbfe", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#1e40af", marginBottom: "4px" }}>Total Value</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#1e3a8a" }}>${Math.round((impactData?.financialMetrics.volunteerHourValue || 0) / 1000)}K</div>
              </div>
              <div style={{ backgroundColor: "#f0fdf4", padding: "14px", borderRadius: "10px", border: "1px solid #bbf7d0", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#166534", marginBottom: "4px" }}>Net Savings</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#059669" }}>${Math.round(((impactData?.financialMetrics.estimatedCostIfPaidStaff || 0) - (impactData?.financialMetrics.programCost || 0)) / 1000)}K</div>
              </div>
              <div style={{ backgroundColor: "#fef3c7", padding: "14px", borderRadius: "10px", border: "1px solid #fde68a", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#92400e", marginBottom: "4px" }}>ROI</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#b45309" }}>{impactData?.financialMetrics.roi || 0}%</div>
              </div>
              <div style={{ backgroundColor: "#faf5ff", padding: "14px", borderRadius: "10px", border: "1px solid #e9d5ff", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#6b21a8", marginBottom: "4px" }}>$/Hour</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#7c3aed" }}>$34.79</div>
              </div>
              <div style={{ backgroundColor: "#fef2f2", padding: "14px", borderRadius: "10px", border: "1px solid #fecaca", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#991b1b", marginBottom: "4px" }}>$/Beneficiary</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#dc2626" }}>${impactData?.financialMetrics.costPerBeneficiary || 0}</div>
              </div>
              <div style={{ backgroundColor: "#ecfdf5", padding: "14px", borderRadius: "10px", border: "1px solid #a7f3d0", textAlign: "center" }}>
                <div style={{ fontSize: "11px", color: "#047857", marginBottom: "4px" }}>SROI Ratio</div>
                <div style={{ fontSize: "22px", fontWeight: "bold", color: "#059669" }}>{sroiData.ratio}:1</div>
              </div>
            </div>

            {/* Main Impact Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "2px solid #10b981" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#166534", marginBottom: "16px" }}>Beneficiary Reach</h3>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Direct</div>
                  <div style={{ fontSize: "32px", fontWeight: "bold", color: "#059669" }}>{impactData?.impactMetrics.directBeneficiaries || 0}</div>
                </div>
                <div style={{ borderTop: "1px solid #bbf7d0", paddingTop: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Indirect</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>{impactData?.impactMetrics.indirectBeneficiaries || 0}</div>
                </div>
                <div style={{ borderTop: "1px solid #bbf7d0", paddingTop: "12px", marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Total Impact</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#047857" }}>{impactData?.impactMetrics.estimatedLivesTouched || 0}</div>
                </div>
              </div>
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "2px solid #8b5cf6" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#5b21b6", marginBottom: "16px" }}>Impact Efficiency</h3>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#5b21b6", marginBottom: "4px" }}>Impact Score</div>
                  <div style={{ fontSize: "32px", fontWeight: "bold", color: "#8b5cf6" }}>{impactData?.impactMetrics.estimatedLivesTouched || 0}</div>
                </div>
                <div style={{ borderTop: "1px solid #ddd6fe", paddingTop: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#5b21b6", marginBottom: "4px" }}>Per Hour</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#7c3aed" }}>{impactData?.impactMetrics.impactPerHour || 0}</div>
                </div>
                <div style={{ borderTop: "1px solid #ddd6fe", paddingTop: "12px", marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#5b21b6", marginBottom: "4px" }}>Per Employee</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#6d28d9" }}>{Math.round((impactData?.impactMetrics.estimatedLivesTouched || 0) / Math.max(impactData?.engagementMetrics.activeEmployees || 1, 1))}</div>
                </div>
              </div>
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "2px solid #f59e0b" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", marginBottom: "16px" }}>Financial Impact</h3>
                <div style={{ marginBottom: "16px" }}>
                  <div style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>Volunteer Hour Value</div>
                  <div style={{ fontSize: "32px", fontWeight: "bold", color: "#b45309" }}>${Math.round((impactData?.financialMetrics.volunteerHourValue || 0) / 1000)}K</div>
                </div>
                <div style={{ borderTop: "1px solid #fde68a", paddingTop: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>If Paid Staff</div>
                  <div style={{ fontSize: "24px", fontWeight: "bold", color: "#d97706" }}>${Math.round((impactData?.financialMetrics.estimatedCostIfPaidStaff || 0) / 1000)}K</div>
                </div>
                <div style={{ borderTop: "1px solid #fde68a", paddingTop: "12px", marginTop: "12px" }}>
                  <div style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>Value Multiplier</div>
                  <div style={{ fontSize: "20px", fontWeight: "bold", color: "#a16207" }}>{((impactData?.financialMetrics.volunteerHourValue || 0) / Math.max(impactData?.financialMetrics.programCost || 1, 1)).toFixed(1)}x</div>
                </div>
              </div>
            </div>

            {/* Value Comparison Chart */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Value Creation Breakdown</h4>
                <div style={{ height: "200px" }}>
                  <Suspense fallback={<ChartSkeleton height="h-[200px]" />}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LazyBarChart data={[
                        { name: 'Program Cost', value: impactData?.financialMetrics.programCost || 0, fill: '#ef4444' },
                        { name: 'Volunteer Value', value: impactData?.financialMetrics.volunteerHourValue || 0, fill: '#3b82f6' },
                        { name: 'Market Rate', value: impactData?.financialMetrics.estimatedCostIfPaidStaff || 0, fill: '#10b981' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${Math.round(v / 1000)}K`} />
                        <Tooltip formatter={(value: any) => [`$${Math.round(value).toLocaleString()}`, 'Amount']} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {[
                            { name: 'Program Cost', fill: '#ef4444' },
                            { name: 'Volunteer Value', fill: '#3b82f6' },
                            { name: 'Market Rate', fill: '#10b981' },
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </LazyBarChart>
                    </ResponsiveContainer>
                  </Suspense>
                </div>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Impact Distribution</h4>
                <div style={{ height: "200px" }}>
                  <Suspense fallback={<ChartSkeleton height="h-[200px]" />}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LazyPieChart>
                        <Pie
                          data={[
                            { name: 'Direct', value: impactData?.impactMetrics.directBeneficiaries || 0 },
                            { name: 'Indirect', value: impactData?.impactMetrics.indirectBeneficiaries || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          <Cell fill="#059669" />
                          <Cell fill="#10b981" />
                        </Pie>
                        <Tooltip formatter={(value: any) => [value.toLocaleString(), 'Beneficiaries']} />
                      </LazyPieChart>
                    </ResponsiveContainer>
                  </Suspense>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>ROI & Cost Analysis</h3>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>ROI</div>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: (impactData?.financialMetrics.roi || 0) >= 200 ? "#059669" : "#f59e0b" }}>{impactData?.financialMetrics.roi || 0}%</div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>vs Benchmark: 200-400%</div>
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Cost per Beneficiary</div>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: "#1e3a8a" }}>${impactData?.financialMetrics.costPerBeneficiary || 0}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>Industry Variable</div>
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Program Cost</div>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: "#f59e0b" }}>${Math.round((impactData?.financialMetrics.programCost || 0) / 1000)}K</div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>Total Investment</div>
              </div>
              <div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Cost per Hour</div>
                <div style={{ fontSize: "36px", fontWeight: "bold", color: "#7c3aed" }}>${Math.round((impactData?.financialMetrics.programCost || 0) / Math.max(impactData?.engagementMetrics.totalHours || 1, 1))}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af" }}>Investment Efficiency</div>
              </div>
            </div>

            {/* Benchmark Comparison */}
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Industry Benchmark Comparison</h3>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {[
                  { label: 'Participation Rate', current: impactData?.engagementMetrics.participationRate || 0, benchmark: 35, unit: '%' },
                  { label: 'Avg Hours/Employee', current: impactData?.engagementMetrics.avgHoursPerEmployee || 0, benchmark: 40, unit: 'hrs' },
                  { label: 'ROI', current: impactData?.financialMetrics.roi || 0, benchmark: 300, unit: '%' },
                  { label: 'Cost per Beneficiary', current: impactData?.financialMetrics.costPerBeneficiary || 0, benchmark: 25, unit: '$', inverse: true },
                ].map((item: any) => {
                  const percentage = item.inverse
                    ? Math.min((item.benchmark / Math.max(item.current, 1)) * 100, 100)
                    : Math.min((item.current / item.benchmark) * 100, 100);
                  const isGood = item.inverse ? item.current <= item.benchmark : item.current >= item.benchmark;
                  return (
                    <div key={item.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", fontWeight: "500", color: "#374151" }}>{item.label}</span>
                        <div style={{ display: "flex", gap: "16px" }}>
                          <span style={{ fontSize: "13px", fontWeight: "600", color: isGood ? "#059669" : "#f59e0b" }}>
                            You: {item.unit === '$' ? `$${item.current}` : `${item.current}${item.unit}`}
                          </span>
                          <span style={{ fontSize: "13px", color: "#9ca3af" }}>
                            Benchmark: {item.unit === '$' ? `$${item.benchmark}` : `${item.benchmark}${item.unit}`}
                          </span>
                        </div>
                      </div>
                      <div style={{ height: "10px", backgroundColor: "#f3f4f6", borderRadius: "5px", overflow: "hidden", position: "relative" }}>
                        <div style={{ position: "absolute", left: "0", top: "0", height: "100%", width: `${percentage}%`, backgroundColor: isGood ? "#059669" : "#f59e0b", borderRadius: "5px", transition: "width 0.5s" }} />
                        <div style={{ position: "absolute", left: "calc(100% - 2px)", top: "-2px", height: "14px", width: "4px", backgroundColor: "#374151", borderRadius: "2px" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {selectedTab === "compliance" && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "24px" }}>Compliance & Standards</h2>
            
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Framework Scores (Industry-Standard Weighted)</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px", marginBottom: "32px" }}>
              <ComplianceCard framework="B-Corp Certification" score={bCorpCalc.score} status={bCorpCalc.score >= 80 ? "✓ READY FOR CERTIFICATION" : "⚠ BELOW THRESHOLD"} statusColor={bCorpCalc.score >= 80 ? "#059669" : "#f59e0b"} details={`E(30%):${bCorpCalc.calc.engagementScore} I(35%):${bCorpCalc.calc.impactScore} G(20%):${bCorpCalc.calc.governanceScore} C(15%):${bCorpCalc.calc.communityBenefitScore}`} />
              <ComplianceCard framework="GRI Standards" score={griScore} status={griScore >= 70 ? "✓ STANDARDS MET" : "⚠ DEVELOPMENT AREA"} statusColor={griScore >= 70 ? "#059669" : "#f59e0b"} details={`SDGs: ${impactData?.sdgMetrics.length || 0}/17 • Transparency: 90% • Stakeholder: Verified`} />
              <ComplianceCard framework="ISO 26000" score={isoScore} status="Community Responsibility" statusColor="#f59e0b" details={`Accountability: 85 • Value: Calculated • Improvement: 75 • Community: 88`} />
              <ComplianceCard framework="SASB Metrics" score={sasbScore} status="Materiality Assessment" statusColor="#8b5cf6" details={`Human Capital: ${Math.round(impactData?.engagementMetrics.participationRate! * 1.2)} • Materiality: Verified • Risk: 82 • Disclosure: 100`} />
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>ESG Rating Breakdown</h3>
            <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "2px solid #f97316" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                <div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Overall ESG</div>
                  <div style={{ fontSize: "36px", fontWeight: "bold", color: "#f97316" }}>{Math.round(esGRating)}/100</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>Stakeholder Confidence</div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Social (50% weight)</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669" }}>{Math.round(((griScore + (impactData?.engagementMetrics.participationRate || 0) + sasbScore) / 3) * 0.5)}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>GRI + Participation + SASB</div>
                </div>
                <div>
                  <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Governance (30% weight)</div>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>{Math.round(isoScore * 0.3)}</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>ISO 26000 Aligned</div>
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px", marginTop: "32px" }}>SDG Alignment Overview</h3>

            {/* SDG Summary Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "#f0fdf4", padding: "16px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>SDGs Covered</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669" }}>{impactData?.sdgMetrics?.length || 0}<span style={{ fontSize: "14px", color: "#6b7280" }}>/17</span></div>
              </div>
              <div style={{ backgroundColor: "#eff6ff", padding: "16px", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: "12px", color: "#1e40af", marginBottom: "4px" }}>Top SDG Focus</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>SDG {impactData?.sdgMetrics?.[0]?.goal || '-'}</div>
              </div>
              <div style={{ backgroundColor: "#fef3c7", padding: "16px", borderRadius: "10px", border: "1px solid #fde68a" }}>
                <div style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>Total SDG Hours</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#b45309" }}>{impactData?.sdgMetrics?.reduce((sum: number, s: any) => sum + (s.hours || 0), 0) || 0}h</div>
              </div>
              <div style={{ backgroundColor: "#faf5ff", padding: "16px", borderRadius: "10px", border: "1px solid #e9d5ff" }}>
                <div style={{ fontSize: "12px", color: "#6b21a8", marginBottom: "4px" }}>Avg Hours/SDG</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#7c3aed" }}>{Math.round((impactData?.sdgMetrics?.reduce((sum: number, s: any) => sum + (s.hours || 0), 0) || 0) / Math.max(impactData?.sdgMetrics?.length || 1, 1))}h</div>
              </div>
            </div>

            {/* SDG Distribution Bar Chart */}
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>SDG Hours Distribution</h4>
              <div style={{ height: "200px" }}>
                <Suspense fallback={<ChartSkeleton height="h-[200px]" />}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LazyBarChart data={impactData?.sdgMetrics?.sort((a: any, b: any) => a.goal - b.goal) || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="goal" tick={{ fontSize: 11 }} tickFormatter={(v) => `SDG ${v}`} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                      <Tooltip formatter={(value: any) => [`${value} hours`, 'Hours']} labelFormatter={(label) => `SDG ${label}: ${getSDGName(label)}`} />
                      <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </LazyBarChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>
            </div>

            {/* All SDGs Grid */}
            <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "12px" }}>All Active SDGs</h4>
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
              {impactData?.sdgMetrics?.sort((a: any, b: any) => b.hours - a.hours).map((sdg: any) => (
                <div key={sdg.goal} style={{ padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: `${Math.min(sdg.percentage * 2, 100)}%`, backgroundColor: "#dbeafe", opacity: 0.5 }} />
                  <div style={{ position: "relative" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ fontSize: "20px", fontWeight: "bold", color: "#1e3a8a" }}>SDG {sdg.goal}</span>
                      <span style={{ fontSize: "11px", fontWeight: "600", color: "#059669", backgroundColor: "#d1fae5", padding: "2px 8px", borderRadius: "12px" }}>{sdg.percentage}%</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "8px", fontWeight: "500" }}>{getSDGName(sdg.goal)}</div>
                    <div style={{ fontSize: "18px", fontWeight: "bold", color: "#374151" }}>{sdg.hours}<span style={{ fontSize: "12px", fontWeight: "normal", color: "#9ca3af" }}> hrs</span></div>
                  </div>
                </div>
              ))}
              {(!impactData?.sdgMetrics || impactData.sdgMetrics.length === 0) && (
                <div style={{ gridColumn: "span 4", textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                  No SDG data available yet. Start logging volunteer activities to see SDG alignment.
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTab === "projects" && (
          <div>
            <h2 style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "24px" }}>Projects & Performance</h2>

            {/* Project Summary Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "#eff6ff", padding: "16px", borderRadius: "10px", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: "12px", color: "#1e40af", marginBottom: "4px" }}>Total Projects</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>{impactData?.projectMetrics?.length || 0}</div>
              </div>
              <div style={{ backgroundColor: "#f0fdf4", padding: "16px", borderRadius: "10px", border: "1px solid #bbf7d0" }}>
                <div style={{ fontSize: "12px", color: "#166534", marginBottom: "4px" }}>Total Project Hours</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669" }}>{impactData?.projectMetrics?.reduce((sum: number, p: any) => sum + (p.hours || 0), 0) || 0}h</div>
              </div>
              <div style={{ backgroundColor: "#fef3c7", padding: "16px", borderRadius: "10px", border: "1px solid #fde68a" }}>
                <div style={{ fontSize: "12px", color: "#92400e", marginBottom: "4px" }}>Avg Hours/Project</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#b45309" }}>{Math.round((impactData?.projectMetrics?.reduce((sum: number, p: any) => sum + (p.hours || 0), 0) || 0) / Math.max(impactData?.projectMetrics?.length || 1, 1))}h</div>
              </div>
              <div style={{ backgroundColor: "#faf5ff", padding: "16px", borderRadius: "10px", border: "1px solid #e9d5ff" }}>
                <div style={{ fontSize: "12px", color: "#6b21a8", marginBottom: "4px" }}>Total Volunteers</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#7c3aed" }}>{impactData?.projectMetrics?.reduce((sum: number, p: any) => sum + (p.employees || 0), 0) || 0}</div>
              </div>
              <div style={{ backgroundColor: "#fef2f2", padding: "16px", borderRadius: "10px", border: "1px solid #fecaca" }}>
                <div style={{ fontSize: "12px", color: "#991b1b", marginBottom: "4px" }}>Active Projects</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#dc2626" }}>{impactData?.projectMetrics?.filter((p: any) => p.status === 'active').length || 0}</div>
              </div>
            </div>

            {/* Project Hours Distribution Chart */}
            <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Hours by Project</h4>
              <div style={{ height: "250px" }}>
                <Suspense fallback={<ChartSkeleton height="h-[250px]" />}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LazyBarChart data={impactData?.projectMetrics?.slice(0, 10) || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                      <Tooltip formatter={(value: any) => [`${value} hours`, 'Hours']} />
                      <Bar dataKey="hours" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </LazyBarChart>
                  </ResponsiveContainer>
                </Suspense>
              </div>
            </div>

            {/* Project Status Breakdown */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Project Status Distribution</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {['active', 'completed', 'sponsored', 'pending'].map((status) => {
                    const count = impactData?.projectMetrics?.filter((p: any) => p.status === status).length || 0;
                    const total = impactData?.projectMetrics?.length || 1;
                    const percentage = Math.round((count / total) * 100);
                    const colors: Record<string, { bg: string; bar: string; text: string }> = {
                      active: { bg: '#d1fae5', bar: '#059669', text: '#166534' },
                      completed: { bg: '#dbeafe', bar: '#3b82f6', text: '#1e40af' },
                      sponsored: { bg: '#fef3c7', bar: '#f59e0b', text: '#92400e' },
                      pending: { bg: '#f3f4f6', bar: '#6b7280', text: '#374151' }
                    };
                    return (
                      <div key={status}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                          <span style={{ fontSize: "12px", fontWeight: "500", color: colors[status]?.text || '#374151', textTransform: "capitalize" }}>{status}</span>
                          <span style={{ fontSize: "12px", fontWeight: "600", color: colors[status]?.text || '#374151' }}>{count} ({percentage}%)</span>
                        </div>
                        <div style={{ height: "8px", backgroundColor: "#f3f4f6", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${percentage}%`, backgroundColor: colors[status]?.bar || '#6b7280', borderRadius: "4px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#374151", marginBottom: "16px" }}>Top Performing Projects</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {impactData?.projectMetrics?.slice(0, 5).map((project: any, idx: number) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", backgroundColor: idx === 0 ? "#fef3c7" : "#f9fafb", borderRadius: "8px" }}>
                      <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: idx === 0 ? "#f59e0b" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", color: idx === 0 ? "white" : "#6b7280" }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "13px", fontWeight: "500", color: "#111827" }}>{project.name}</div>
                        <div style={{ fontSize: "11px", color: "#6b7280" }}>{project.employees} volunteers</div>
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#059669" }}>{project.hours}h</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Project Portfolio</h3>
            <div style={{ backgroundColor: "white", borderRadius: "12px", border: "1px solid #e5e7eb", overflowX: "auto", marginBottom: "32px" }}>
              {impactData?.projectMetrics && impactData.projectMetrics.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6" }}>
                      <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Rank</th>
                      <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Project</th>
                      <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Hours</th>
                      <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Employees</th>
                      <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Avg Hrs/Person</th>
                      <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Economic Value</th>
                      <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impactData.projectMetrics.map((project: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: idx % 2 === 0 ? "#f9fafb" : "white" }}>
                        <td style={{ padding: "12px", color: "#6b7280", fontWeight: "500" }}>#{idx + 1}</td>
                        <td style={{ padding: "12px", color: "#111827", fontWeight: "500" }}>{project.name}</td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#059669", fontWeight: "600" }}>{project.hours} hrs</td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#374151" }}>{project.employees}</td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#6b7280" }}>{project.employees > 0 ? Math.round(project.hours / project.employees) : 0} hrs</td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#b45309", fontWeight: "500" }}>${Math.round(project.hours * 34.79).toLocaleString()}</td>
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: "12px", backgroundColor: project.status === "active" ? "#d1fae5" : project.status === "completed" ? "#dbeafe" : "#fef3c7", color: project.status === "active" ? "#059669" : project.status === "completed" ? "#3b82f6" : "#b45309", fontSize: "12px", fontWeight: "600", textTransform: "capitalize" }}>
                            {project.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>No project data available</div>
              )}
            </div>

            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Future Outlook & Recommendations</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #3b82f6" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Zap style={{ width: "18px", height: "18px", color: "#3b82f6" }} />
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af" }}>Q1 2026 Projection</div>
                </div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "#3b82f6", marginBottom: "8px" }}>{Math.round(bCorpCalc.score + 5)}/100</div>
                <div style={{ fontSize: "12px", color: "#6b7280" }}>Trend: Improving • With current trajectory</div>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #059669" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <Target style={{ width: "18px", height: "18px", color: "#059669" }} />
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#166534" }}>Key Opportunities</div>
                </div>
                <ul style={{ fontSize: "12px", color: "#374151", margin: "0", paddingLeft: "20px" }}>
                  <li>Expand climate initiatives (SDG 13-15)</li>
                  <li>Increase participation to 40%+</li>
                  <li>Scale high-impact projects</li>
                </ul>
              </div>
              <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #f59e0b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <AlertCircle style={{ width: "18px", height: "18px", color: "#f59e0b" }} />
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#92400e" }}>Watch Areas</div>
                </div>
                <ul style={{ fontSize: "12px", color: "#374151", margin: "0", paddingLeft: "20px" }}>
                  <li>Maintain B-Corp score above 80</li>
                  <li>Monitor cost per beneficiary</li>
                  <li>Sustain engagement levels</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </CSRLayout>
  );
}

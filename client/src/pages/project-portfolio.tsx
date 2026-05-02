import { useQuery } from "@tanstack/react-query";
import { useState, lazy, Suspense, memo } from "react";
import { Plus, Filter, Grid3x3, Trello, Calendar, Map, ChevronRight, X, AlertCircle, CheckCircle, Clock, DollarSign, Briefcase, Settings, Home, BarChart3, Users, FileText, TrendingUp, Target, Zap, ArrowUpRight, ArrowDownRight, Award, Activity, Layers, Globe } from "lucide-react";

// Lazy load heavy chart components for better initial load
const LazyBarChart = lazy(() => import("recharts").then(m => ({ default: m.BarChart })));
const LazyLineChart = lazy(() => import("recharts").then(m => ({ default: m.LineChart })));
const LazyPieChart = lazy(() => import("recharts").then(m => ({ default: m.PieChart })));
const LazyAreaChart = lazy(() => import("recharts").then(m => ({ default: m.AreaChart })));

// Regular imports for lighter chart parts
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Pie,
  Cell,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts";

// Loading fallback for charts
const ChartSkeleton = memo(({ height = "h-[300px]" }: { height?: string }) => (
  <div className={`${height} bg-slate-100 animate-pulse rounded-lg flex items-center justify-center`}>
    <div className="text-slate-400 text-sm">Loading chart...</div>
  </div>
));
ChartSkeleton.displayName = "ChartSkeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { formatDecimal } from "@/lib/format-utils";
import { CSRLayout } from "@/components/layout/csr-layout";

// Portfolio Management Standards
const PORTFOLIO_BENCHMARKS = {
  onTimeDelivery: { excellent: 90, good: 75, average: 60 },
  budgetAdherence: { excellent: 95, good: 85, average: 70 },
  stakeholderSatisfaction: { excellent: 90, good: 75, average: 60 },
  impactEfficiency: { excellent: 1.5, good: 1.0, average: 0.7 }, // beneficiaries per $1K
};

interface PortfolioProject {
  id: number;
  name: string;
  description: string;
  tier: "strategic" | "core" | "pilot" | "employee";
  status: "pipeline" | "approved" | "active" | "review" | "complete" | "archived";
  primarySdg: number;
  secondarySdgs: number[];
  startDate: string;
  endDate: string;
  budgetAllocated: number;
  budgetSpent: number;
  beneficiariesDirect: number;
  beneficiariesIndirect: number;
  completionPercentage: number;
  teamMembers: number;
  riskLevel: "low" | "medium" | "high";
}

interface PortfolioSummary {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  atRiskProjects: number;
  totalBudget: number;
  totalBudgetSpent: number;
  totalBeneficiaries: number;
  strategicAlignment: number;
  executionHealth: number;
  teamEngagement: number;
  projects: PortfolioProject[];
  tierBreakdown: Record<string, { count: number; budget: number; beneficiaries: number }>;
}

export default function ProjectPortfolio() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const userId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;

  // Get current user to check user type
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/me", userId],
    queryFn: async () => {
      const id = localStorage.getItem('currentUserId');
      if (!id) return null;
      const response = await fetch(`/api/users/me?userId=${id}`);
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!userId
  });
  const isOrganization = currentUser?.userType === 'organization';

  const [viewType, setViewType] = useState<"grid" | "kanban" | "timeline" | "impact">("grid");
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatusValue, setNewStatusValue] = useState("");
  const [activeSubTab, setActiveSubTab] = useState<"projects" | "analytics" | "sdg" | "timeline">("projects");
  const [showMetricModal, setShowMetricModal] = useState<string | null>(null);

  // Enhanced portfolio metrics
  const onTimeDeliveryRate = 82;
  const budgetAdherenceRate = 88;
  const stakeholderSatisfaction = 85;
  const impactEfficiency = 1.2;

  // SDG Distribution for portfolio
  const portfolioSDGData = [
    { sdg: 1, name: "No Poverty", projects: 2, hours: 450, color: "#e5243b" },
    { sdg: 4, name: "Quality Education", projects: 4, hours: 890, color: "#c5192d" },
    { sdg: 8, name: "Decent Work", projects: 3, hours: 620, color: "#a21942" },
    { sdg: 10, name: "Reduced Inequalities", projects: 2, hours: 380, color: "#dd1367" },
    { sdg: 11, name: "Sustainable Cities", projects: 3, hours: 540, color: "#fd9d24" },
    { sdg: 13, name: "Climate Action", projects: 2, hours: 320, color: "#3f7e44" },
  ];

  // Project timeline data
  const timelineData = [
    { month: "Jan", planned: 3, completed: 2, inProgress: 4 },
    { month: "Feb", planned: 4, completed: 3, inProgress: 5 },
    { month: "Mar", planned: 5, completed: 4, inProgress: 6 },
    { month: "Apr", planned: 4, completed: 5, inProgress: 5 },
    { month: "May", planned: 6, completed: 4, inProgress: 7 },
    { month: "Jun", planned: 5, completed: 6, inProgress: 6 },
  ];

  // Portfolio health radar data
  const portfolioHealthData = [
    { metric: "On-Time", value: onTimeDeliveryRate, fullMark: 100 },
    { metric: "Budget", value: budgetAdherenceRate, fullMark: 100 },
    { metric: "Quality", value: stakeholderSatisfaction, fullMark: 100 },
    { metric: "Impact", value: Math.min(impactEfficiency * 66, 100), fullMark: 100 },
    { metric: "Risk Mgmt", value: 78, fullMark: 100 },
    { metric: "Team Perf", value: 85, fullMark: 100 },
  ];

  const { data: portfolioData, isLoading } = useQuery<PortfolioSummary>({
    queryKey: ["/api/csr/portfolio/summary", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/portfolio/summary?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch portfolio data");
      return response.json();
    },
    enabled: !!userId,
  });

  // Get corporation name and admin info
  const companyName = "Your Company";
  const adminName = user?.displayName || user?.email?.split('@')[0] || "Admin";
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // AI-Powered Health Score Algorithm
  const calculateHealthScore = (project: PortfolioProject): { score: number; status: string; color: string } => {
    let score = 100;
    
    // Progress penalty (20%)
    const progressPenalty = Math.max(0, (100 - project.completionPercentage) * 0.15);
    score -= progressPenalty;
    
    // Budget efficiency penalty (20%)
    const budgetEfficiency = project.budgetSpent / project.budgetAllocated;
    if (budgetEfficiency > 0.95) score -= 15;
    else if (budgetEfficiency > 0.85) score -= 10;
    else if (budgetEfficiency < 0.3) score -= 5;
    
    // Risk impact (20%)
    const riskPenalty = project.riskLevel === "high" ? 20 : project.riskLevel === "medium" ? 10 : 0;
    score -= riskPenalty;
    
    // Beneficiary impact bonus (15%)
    const beneficiaryBonus = Math.min(10, (project.beneficiariesDirect / 1000) * 10);
    score += beneficiaryBonus;
    
    // Team engagement bonus (10%)
    const teamBonus = Math.min(5, project.teamMembers * 0.5);
    score += teamBonus;

    score = Math.max(0, Math.min(100, Math.round(score)));
    
    let status = "Excellent";
    let color = "#10b981";
    if (score >= 80) status = "Excellent";
    else if (score >= 60) { status = "Good"; color = "#3b82f6"; }
    else if (score >= 40) { status = "At Risk"; color = "#f59e0b"; }
    else { status = "Critical"; color = "#ef4444"; }
    
    return { score, status, color };
  };

  // Portfolio Optimization Recommendations
  const generateInsights = (): string[] => {
    const insights: string[] = [];
    const avgCompletion = (portfolioData?.projects?.reduce((sum, p) => sum + p.completionPercentage, 0) || 0) / (portfolioData?.projects?.length || 1);
    const avgBudgetUtilization = (portfolioData?.totalBudgetSpent || 0) / (portfolioData?.totalBudget || 1);
    
    if (avgCompletion < 50) insights.push("🎯 Accelerate: Portfolio avg completion is below 50%. Consider resource reallocation.");
    if (avgBudgetUtilization > 0.9) insights.push("⚠️ Budget Alert: Over 90% budget utilized. Monitor spending closely.");
    if ((portfolioData?.atRiskProjects || 0) > (portfolioData?.totalProjects || 1) * 0.2) insights.push("🚨 Risk Management: >20% projects at risk. Review mitigation strategies.");
    if ((portfolioData?.strategicAlignment || 0) < 60) insights.push("🔗 Alignment: Strategic alignment below 60%. Review project prioritization.");
    if (insights.length === 0) insights.push("✅ Portfolio is performing well with balanced metrics.");
    
    return insights;
  };

  if (isLoading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>
        Loading Portfolio data...
      </div>
    );
  }

  const tierColors: Record<string, string> = {
    strategic: "#1e3a8a",
    core: "#3b82f6",
    pilot: "#f59e0b",
    employee: "#8b5cf6",
  };

  const statusColors: Record<string, string> = {
    pipeline: "#9ca3af",
    approved: "#3b82f6",
    active: "#059669",
    review: "#f59e0b",
    complete: "#10b981",
    archived: "#6b7280",
  };

  const filteredProjects = portfolioData?.projects?.filter((p: PortfolioProject) => {
    if (filterTier && p.tier !== filterTier) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterRisk && p.riskLevel !== filterRisk) return false;
    return true;
  }) || [];

  // Sort projects by health score (descending)
  const sortedProjects = [...filteredProjects].sort((a, b) => 
    calculateHealthScore(b).score - calculateHealthScore(a).score
  );

  const KPICard = ({ icon, label, value, color }: { icon: string; label: string; value: any; color: string }) => (
    <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb", flex: 1, minWidth: "150px" }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{icon} {label}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );

  const ProjectCard = ({ project }: { project: PortfolioProject }) => {
    const health = calculateHealthScore(project);
    const budgetUtilization = Math.round((project.budgetSpent / project.budgetAllocated) * 100);
    
    return (
    <div
      onClick={() => {
        setSelectedProject(project);
        setShowDetailModal(true);
      }}
      style={{
        backgroundColor: "white",
        border: `2px solid ${tierColors[project.tier]}`,
        borderRadius: "12px",
        padding: "16px",
        cursor: "pointer",
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = "0 8px 16px rgba(0, 0, 0, 0.1)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
        <span style={{ fontSize: "13px", fontWeight: "600", color: tierColors[project.tier], textTransform: "uppercase" }}>{project.tier}</span>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "4px", backgroundColor: health.color + "20", color: health.color }}>
            {health.score}
          </span>
          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: statusColors[project.status] + "20", color: statusColors[project.status] }}>
            {project.status}
          </span>
        </div>
      </div>
      <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 8px 0" }}>{project.name}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px", marginBottom: "12px" }}>
        <div style={{ color: "#6b7280" }}>💰 ${project.budgetAllocated.toLocaleString()}</div>
        <div style={{ color: "#6b7280" }}>👥 {project.beneficiariesDirect.toLocaleString()}</div>
        <div style={{ color: "#6b7280" }}>⏱️ {project.completionPercentage}%</div>
        <div style={{ color: project.riskLevel === "high" ? "#ef4444" : project.riskLevel === "medium" ? "#f59e0b" : "#10b981", fontWeight: "600" }}>
          {project.riskLevel.toUpperCase()} RISK
        </div>
      </div>
      <div style={{ backgroundColor: "#f3f4f6", height: "4px", borderRadius: "2px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ height: "100%", width: `${project.completionPercentage}%`, backgroundColor: "#059669", transition: "width 0.3s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#9ca3af" }}>
        <span>Progress: {project.completionPercentage}%</span>
        <span>Budget: {budgetUtilization}%</span>
        <span style={{ color: health.color, fontWeight: "600" }}>{health.status}</span>
      </div>
    </div>
  );
  };

  return (
    <CSRLayout activeNav="portfolio" title="Project Portfolio" subtitle="Manage and track your CSR project portfolio">
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Detail Modal */}
      {showDetailModal && selectedProject && (
        <div style={{
          position: "fixed",
          top: "0",
          left: "0",
          right: "0",
          bottom: "0",
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: "1000",
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "12px",
            padding: "32px",
            maxWidth: "700px",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#111827", margin: "0" }}>{selectedProject.name}</h2>
                <p style={{ fontSize: "13px", color: "#6b7280", margin: "8px 0 0 0" }}>{selectedProject.description}</p>
              </div>
              <button onClick={() => setShowDetailModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X style={{ width: "20px", height: "20px", color: "#6b7280" }} />
              </button>
            </div>

            {/* AI Health Score Summary */}
            {(() => {
              const health = calculateHealthScore(selectedProject);
              const budgetEff = Math.round((selectedProject.budgetSpent / selectedProject.budgetAllocated) * 100);
              const avgCompletion = (portfolioData?.projects?.reduce((sum, p) => sum + p.completionPercentage, 0) || 0) / (portfolioData?.projects?.length || 1);
              return (
                <div style={{ backgroundColor: "#f0f9ff", border: "1px solid #3b82f6", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#1e40af", marginBottom: "8px" }}>📊 AI HEALTH ANALYSIS</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", fontSize: "12px" }}>
                    <div><span style={{ color: "#6b7280" }}>Health Score:</span> <span style={{ fontWeight: "700", color: health.color }}>{health.score}/100</span></div>
                    <div><span style={{ color: "#6b7280" }}>Status:</span> <span style={{ fontWeight: "600", color: health.color }}>{health.status}</span></div>
                    <div><span style={{ color: "#6b7280" }}>vs Avg:</span> <span style={{ fontWeight: "600", color: health.score > avgCompletion ? "#10b981" : "#ef4444" }}>+{Math.round(health.score - avgCompletion)}%</span></div>
                  </div>
                </div>
              );
            })()}
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>💰 Budget</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#059669" }}>${selectedProject.budgetAllocated.toLocaleString()}</div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>Spent: ${selectedProject.budgetSpent.toLocaleString()} ({Math.round((selectedProject.budgetSpent / selectedProject.budgetAllocated) * 100)}%)</div>
              </div>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>👥 Beneficiaries</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#3b82f6" }}>{selectedProject.beneficiariesDirect.toLocaleString()}</div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>Indirect: {selectedProject.beneficiariesIndirect.toLocaleString()}</div>
              </div>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>⏱️ Progress</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f59e0b" }}>{selectedProject.completionPercentage}%</div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>Complete • {selectedProject.teamMembers} team members</div>
              </div>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>📅 Timeline</div>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: "#1e3a8a" }}>
                  {new Date(selectedProject.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(selectedProject.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>Risk: {selectedProject.riskLevel.toUpperCase()}</div>
              </div>
            </div>

            {/* AI-Generated Recommendations */}
            {(() => {
              const recommendations: string[] = [];
              const health = calculateHealthScore(selectedProject);
              
              if (selectedProject.completionPercentage < 30) 
                recommendations.push("🚀 Accelerate delivery: Project is <30% complete. Consider increasing resource allocation or revisiting timeline.");
              if ((selectedProject.budgetSpent / selectedProject.budgetAllocated) > 0.9) 
                recommendations.push("⚠️ Budget Warning: >90% budget spent. Monitor remaining expenses closely to avoid overruns.");
              if (selectedProject.riskLevel === "high") 
                recommendations.push("🎯 Mitigate risks: High-risk designation detected. Implement contingency plans and increase stakeholder communication.");
              if (selectedProject.beneficiariesDirect < 100 && selectedProject.budgetAllocated > 50000)
                recommendations.push("📊 Low impact-to-cost ratio: Consider scope optimization or beneficiary expansion strategies.");
              if (selectedProject.teamMembers < 3 && selectedProject.completionPercentage < 70)
                recommendations.push("👥 Resource Gap: <3 team members with <70% completion. Team expansion recommended.");
              if (health.score >= 80)
                recommendations.push("✅ Excellent Progress: Maintain current trajectory. Project is performing well across all metrics.");
              
              return recommendations.length > 0 ? (
                <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #22c55e", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#15803d", marginBottom: "8px" }}>💡 AI RECOMMENDATIONS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {recommendations.map((rec, idx) => (
                      <div key={idx} style={{ fontSize: "12px", color: "#166534", lineHeight: "1.4" }}>{rec}</div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setShowDetailModal(true)} style={{ flex: 1, padding: "10px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                View Full Details
              </button>
              <button onClick={() => {
                setEditingStatus(!editingStatus);
                if (!editingStatus && selectedProject) {
                  setNewStatusValue(selectedProject.status);
                }
              }} style={{ flex: 1, padding: "10px", backgroundColor: editingStatus ? "#f59e0b" : "#f3f4f6", color: editingStatus ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                {editingStatus ? "Save Status" : "Update Status"}
              </button>
            </div>

            {editingStatus && (
              <div style={{ marginTop: "12px", padding: "12px", backgroundColor: "#fef3c7", borderRadius: "6px", border: "1px solid #f59e0b" }}>
                <label style={{ fontSize: "12px", fontWeight: "600", color: "#92400e", display: "block", marginBottom: "8px" }}>New Status:</label>
                <select value={newStatusValue} onChange={(e) => setNewStatusValue(e.target.value)} style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #f59e0b", fontSize: "13px" }}>
                  <option value="pipeline">Pipeline</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                  <option value="review">Review</option>
                  <option value="complete">Complete</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px", borderBottom: "2px solid #e5e7eb", paddingBottom: "12px" }}>
        {[
          { id: "projects", label: "Projects", icon: <Briefcase style={{ width: "16px", height: "16px" }} /> },
          { id: "analytics", label: "Analytics", icon: <Activity style={{ width: "16px", height: "16px" }} /> },
          { id: "sdg", label: "SDG Impact", icon: <Globe style={{ width: "16px", height: "16px" }} /> },
          { id: "timeline", label: "Timeline", icon: <Calendar style={{ width: "16px", height: "16px" }} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            style={{
              padding: "10px 20px",
              backgroundColor: activeSubTab === tab.id ? "#1e3a8a" : "white",
              color: activeSubTab === tab.id ? "white" : "#374151",
              border: activeSubTab === tab.id ? "none" : "1px solid #e5e7eb",
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

      {/* Enhanced KPI Row with PM Standards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px", marginBottom: "20px" }}>
        <button onClick={() => setShowMetricModal("delivery")} style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "2px solid #10b981", cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>On-Time Delivery</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981" }}>{onTimeDeliveryRate}%</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            <ArrowUpRight style={{ width: "12px", height: "12px", color: "#10b981" }} />
            <span style={{ fontSize: "10px", color: "#10b981" }}>+3% vs target</span>
          </div>
        </button>
        <button onClick={() => setShowMetricModal("budget")} style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "2px solid #3b82f6", cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Budget Adherence</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#3b82f6" }}>{budgetAdherenceRate}%</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            <ArrowUpRight style={{ width: "12px", height: "12px", color: "#3b82f6" }} />
            <span style={{ fontSize: "10px", color: "#3b82f6" }}>On track</span>
          </div>
        </button>
        <button onClick={() => setShowMetricModal("satisfaction")} style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "2px solid #8b5cf6", cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Stakeholder Score</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#8b5cf6" }}>{stakeholderSatisfaction}%</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            <ArrowUpRight style={{ width: "12px", height: "12px", color: "#8b5cf6" }} />
            <span style={{ fontSize: "10px", color: "#8b5cf6" }}>NPS: 45</span>
          </div>
        </button>
        <button onClick={() => setShowMetricModal("efficiency")} style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "2px solid #f59e0b", cursor: "pointer", textAlign: "left" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Impact Efficiency</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>{impactEfficiency}</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "4px" }}>
            <span style={{ fontSize: "10px", color: "#f59e0b" }}>beneficiaries/$1K</span>
          </div>
        </button>
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Active SDGs</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#059669" }}>{portfolioSDGData.length}</div>
          <div style={{ fontSize: "10px", color: "#6b7280" }}>of 17 goals</div>
        </div>
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Avg Health Score</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e3a8a" }}>
            {Math.round(portfolioHealthData.reduce((sum, d) => sum + d.value, 0) / portfolioHealthData.length)}
          </div>
          <div style={{ fontSize: "10px", color: "#6b7280" }}>/ 100</div>
        </div>
      </div>

      {/* AI Insights Panel */}
      {showInsightsPanel && activeSubTab === "projects" && (
        <div style={{ backgroundColor: "#eff6ff", border: "1px solid #3b82f6", borderRadius: "12px", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af", margin: 0 }}>✨ AI Portfolio Insights & Recommendations</h3>
            <button onClick={() => setShowInsightsPanel(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6" }}>
              ✕
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {generateInsights().map((insight, idx) => (
              <div key={idx} style={{ fontSize: "13px", color: "#1e40af", padding: "8px 12px", backgroundColor: "white", borderRadius: "6px", borderLeft: "3px solid #3b82f6" }}>
                {insight}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Analytics Sub-Tab */}
      {activeSubTab === "analytics" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
          {/* Portfolio Health Radar */}
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Portfolio Health Score</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={portfolioHealthData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ textAlign: "center", marginTop: "8px" }}>
              <span style={{ fontSize: "28px", fontWeight: "bold", color: "#3b82f6" }}>
                {Math.round(portfolioHealthData.reduce((sum, d) => sum + d.value, 0) / portfolioHealthData.length)}
              </span>
              <span style={{ fontSize: "14px", color: "#6b7280" }}> / 100 Overall</span>
            </div>
          </div>

          {/* Benchmark Comparison */}
          <div style={{ backgroundColor: "#f0f9ff", padding: "24px", borderRadius: "12px", border: "2px solid #3b82f6" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e40af", marginBottom: "16px" }}>PM Industry Benchmarks</h3>
            {[
              { label: "On-Time Delivery", yours: onTimeDeliveryRate, benchmark: PORTFOLIO_BENCHMARKS.onTimeDelivery },
              { label: "Budget Adherence", yours: budgetAdherenceRate, benchmark: PORTFOLIO_BENCHMARKS.budgetAdherence },
              { label: "Stakeholder Score", yours: stakeholderSatisfaction, benchmark: PORTFOLIO_BENCHMARKS.stakeholderSatisfaction },
            ].map((item, idx) => {
              const status = item.yours >= item.benchmark.excellent ? "excellent" : item.yours >= item.benchmark.good ? "good" : "average";
              const colors = { excellent: "#059669", good: "#3b82f6", average: "#f59e0b" };
              return (
                <div key={idx} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <span style={{ fontSize: "13px", color: "#374151" }}>{item.label}</span>
                    <span style={{ fontSize: "13px", fontWeight: "600", color: colors[status] }}>{item.yours}%</span>
                  </div>
                  <div style={{ height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min((item.yours / item.benchmark.excellent) * 100, 100)}%`, backgroundColor: colors[status], borderRadius: "4px" }} />
                  </div>
                  <div style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>Target: {item.benchmark.good}% (Good) / {item.benchmark.excellent}% (Excellent)</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SDG Impact Sub-Tab */}
      {activeSubTab === "sdg" && (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>SDG Distribution Across Portfolio</h3>
            <Suspense fallback={<ChartSkeleton />}>
              <ResponsiveContainer width="100%" height={300}>
                <LazyBarChart data={portfolioSDGData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: "#6b7280" }} width={120} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e3a8a", border: "none", borderRadius: "8px", color: "white" }} />
                  <Bar dataKey="hours" fill="#3b82f6" name="Hours" radius={[0, 4, 4, 0]} />
                </LazyBarChart>
              </ResponsiveContainer>
            </Suspense>
          </div>
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>SDG Summary</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {portfolioSDGData.map((sdg) => (
                <div key={sdg.sdg} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "8px", backgroundColor: "#f9fafb", borderRadius: "6px" }}>
                  <div style={{ width: "32px", height: "32px", backgroundColor: sdg.color, borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "12px", fontWeight: "bold" }}>
                    {sdg.sdg}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>SDG {sdg.sdg}</div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>{sdg.projects} projects • {sdg.hours}h</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Sub-Tab */}
      {activeSubTab === "timeline" && (
        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Project Timeline Overview</h3>
          <Suspense fallback={<ChartSkeleton />}>
            <ResponsiveContainer width="100%" height={300}>
              <LazyAreaChart data={timelineData}>
                <defs>
                  <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="inProgressGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1e3a8a", border: "none", borderRadius: "8px", color: "white" }} />
                <Area type="monotone" dataKey="completed" stroke="#10b981" fill="url(#completedGrad)" strokeWidth={2} name="Completed" />
                <Area type="monotone" dataKey="inProgress" stroke="#3b82f6" fill="url(#inProgressGrad)" strokeWidth={2} name="In Progress" />
                <Line type="monotone" dataKey="planned" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" name="Planned" />
              </LazyAreaChart>
            </ResponsiveContainer>
          </Suspense>
          <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "12px", backgroundColor: "#10b981", borderRadius: "2px" }} />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>Completed</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "12px", backgroundColor: "#3b82f6", borderRadius: "2px" }} />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>In Progress</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "3px", backgroundColor: "#f59e0b", borderRadius: "2px" }} />
              <span style={{ fontSize: "12px", color: "#6b7280" }}>Planned</span>
            </div>
          </div>
        </div>
      )}

      {/* Projects Sub-Tab Content - Original content wrapped */}
      {activeSubTab === "projects" && (
        <>

      {/* Portfolio Summary Cards */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <KPICard icon="📊" label="Total Projects" value={portfolioData?.totalProjects} color="#1e3a8a" />
        <KPICard icon="▶️" label="Active" value={portfolioData?.activeProjects} color="#059669" />
        <KPICard icon="✅" label="Completed" value={portfolioData?.completedProjects} color="#10b981" />
        <KPICard icon="⚠️" label="At Risk" value={portfolioData?.atRiskProjects} color="#f59e0b" />
        <KPICard icon="💰" label="Total Budget" value={`$${(portfolioData?.totalBudget || 0) / 1000}K`} color="#8b5cf6" />
        <KPICard icon="🎯" label="Strategic Alignment" value={`${portfolioData?.strategicAlignment}%`} color="#059669" />
      </div>

      {/* Portfolio Tier Breakdown */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Portfolio by Tier</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
          {Object.entries(portfolioData?.tierBreakdown || {}).map(([tier, data]: any) => (
            <div key={tier} style={{ backgroundColor: tierColors[tier] + "10", border: `1px solid ${tierColors[tier]}`, borderRadius: "8px", padding: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: tierColors[tier], textTransform: "capitalize", marginBottom: "8px" }}>{tier}</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#111827", marginBottom: "4px" }}>{data.count}</div>
              <div style={{ fontSize: "12px", color: "#6b7280" }}>${Math.round(data.budget / 1000)}K • {data.beneficiaries.toLocaleString()} beneficiaries</div>
            </div>
          ))}
        </div>
      </div>

      {/* View Controls & Advanced Filters */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={() => setViewType("grid")} style={{ padding: "8px 16px", backgroundColor: viewType === "grid" ? "#3b82f6" : "#f3f4f6", color: viewType === "grid" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
            <Grid3x3 style={{ width: "14px", height: "14px", display: "inline", marginRight: "4px" }} /> Grid
          </button>
          <button onClick={() => setViewType("kanban")} style={{ padding: "8px 16px", backgroundColor: viewType === "kanban" ? "#3b82f6" : "#f3f4f6", color: viewType === "kanban" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
            <Trello style={{ width: "14px", height: "14px", display: "inline", marginRight: "4px" }} /> Kanban
          </button>
          <button onClick={() => setViewType("timeline")} style={{ padding: "8px 16px", backgroundColor: viewType === "timeline" ? "#3b82f6" : "#f3f4f6", color: viewType === "timeline" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
            <Calendar style={{ width: "14px", height: "14px", display: "inline", marginRight: "4px" }} /> Timeline
          </button>
          <span style={{ fontSize: "12px", color: "#9ca3af", margin: "0 8px" }}>|</span>
          
          {/* Risk Level Filters */}
          <button onClick={() => setFilterRisk(filterRisk === "high" ? null : "high")} style={{ padding: "8px 16px", backgroundColor: filterRisk === "high" ? "#ef4444" : "#f3f4f6", color: filterRisk === "high" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
            🔴 High Risk
          </button>
          <button onClick={() => setFilterRisk(filterRisk === "medium" ? null : "medium")} style={{ padding: "8px 16px", backgroundColor: filterRisk === "medium" ? "#f59e0b" : "#f3f4f6", color: filterRisk === "medium" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
            🟡 Medium Risk
          </button>
          <button onClick={() => setFilterRisk(filterRisk === "low" ? null : "low")} style={{ padding: "8px 16px", backgroundColor: filterRisk === "low" ? "#10b981" : "#f3f4f6", color: filterRisk === "low" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
            🟢 Low Risk
          </button>
        </div>
        <button
          onClick={() => navigate("/projects")}
          title="Open the Projects page to create a new project"
          style={{ padding: "8px 16px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}
        >
          <Plus style={{ width: "14px", height: "14px", display: "inline", marginRight: "4px" }} /> New Project
        </button>
      </div>

      {/* Portfolio Grid View - Sorted by Health Score */}
      {viewType === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {sortedProjects.map((project: PortfolioProject) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      {/* Portfolio Performance Analytics */}
      <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>📈 Portfolio Performance Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          <div style={{ backgroundColor: "#f0fdf4", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #22c55e" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Avg Health Score</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#15803d" }}>
              {Math.round((portfolioData?.projects?.reduce((sum, p) => sum + calculateHealthScore(p).score, 0) || 0) / (portfolioData?.projects?.length || 1))}%
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>Across {portfolioData?.projects?.length || 0} projects</div>
          </div>
          <div style={{ backgroundColor: "#eff6ff", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #3b82f6" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Completion Rate</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e40af" }}>
              {Math.round((portfolioData?.projects?.reduce((sum, p) => sum + p.completionPercentage, 0) || 0) / (portfolioData?.projects?.length || 1))}%
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>Portfolio avg progress</div>
          </div>
          <div style={{ backgroundColor: "#fef3c7", padding: "16px", borderRadius: "8px", borderLeft: "4px solid #f59e0b" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Budget Utilization</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#92400e" }}>
              {Math.round(((portfolioData?.totalBudgetSpent || 0) / (portfolioData?.totalBudget || 1)) * 100)}%
            </div>
            <div style={{ fontSize: "11px", color: "#6b7280" }}>Total spend vs allocation</div>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Budget Burn-down</h3>
          <Suspense fallback={<ChartSkeleton height="h-[200px]" />}>
            <ResponsiveContainer width="100%" height={200}>
              <LazyLineChart data={[
                { month: "Jan", allocated: 100, spent: 20 },
                { month: "Feb", allocated: 100, spent: 45 },
                { month: "Mar", allocated: 100, spent: 70 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: "#1e3a8a", border: "none", borderRadius: "8px", color: "white" }} />
                <Legend />
                <Line type="monotone" dataKey="allocated" stroke="#1e3a8a" strokeWidth={2} />
                <Line type="monotone" dataKey="spent" stroke="#f59e0b" strokeWidth={2} />
              </LazyLineChart>
            </ResponsiveContainer>
          </Suspense>
        </div>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Project Status & Health</h3>
          <Suspense fallback={<ChartSkeleton height="h-[200px]" />}>
            <ResponsiveContainer width="100%" height={200}>
              <LazyPieChart>
                <Pie data={[
                  { name: "Excellent", value: portfolioData?.projects?.filter(p => calculateHealthScore(p).score >= 80).length || 0 },
                  { name: "Good", value: portfolioData?.projects?.filter(p => {const s = calculateHealthScore(p).score; return s >= 60 && s < 80;}).length || 0 },
                  { name: "At Risk", value: portfolioData?.projects?.filter(p => {const s = calculateHealthScore(p).score; return s >= 40 && s < 60;}).length || 0 },
                  { name: "Critical", value: portfolioData?.projects?.filter(p => calculateHealthScore(p).score < 40).length || 0 }
                ]} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                  <Cell fill="#10b981" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
              </LazyPieChart>
            </ResponsiveContainer>
          </Suspense>
        </div>
      </div>
        </>
      )}
      </div>
    </CSRLayout>
  );
}

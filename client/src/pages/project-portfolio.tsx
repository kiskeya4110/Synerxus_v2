import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Plus, Filter, Grid3x3, Trello, Calendar, Map, ChevronRight, X, AlertCircle, CheckCircle, Clock, DollarSign, Briefcase, Settings, Home } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import Footer from "@/components/layout/footer";

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
  const [viewType, setViewType] = useState<"grid" | "kanban" | "timeline" | "impact">("grid");
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterRisk, setFilterRisk] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInsightsPanel, setShowInsightsPanel] = useState(true);
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatusValue, setNewStatusValue] = useState("");

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
  const adminName = user?.displayName || "Admin";
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Top Header Bar - Dark Navy with Blue Ribbon */}
      <div style={{ borderTop: "8px solid #0f172a", width: "100%" }} />
      <header
        style={{
          backgroundColor: "#111827",
          color: "white",
          padding: "16px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          height: "64px",
        }}
      >
        {/* Left: Synerxus Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            minWidth: "fit-content",
          }}
        >
          <span
            style={{ fontSize: "24px", fontWeight: "bold", color: "#f97316" }}
          >
            ✦
          </span>
          <span
            style={{
              fontSize: "18px",
              fontWeight: "600",
              letterSpacing: "0.025em",
              color: "#ffffff",
            }}
          >
            synerxus
          </span>
        </div>

        {/* Center: Project Portfolio Title with Company Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <span
            style={{ fontSize: "16px", fontWeight: "600", color: "#ffffff" }}
          >
            Project Portfolio
          </span>
          <span style={{ fontSize: "16px", color: "#ffffff" }}>•</span>
          <Briefcase
            style={{ width: "18px", height: "18px", color: "#ffffff" }}
          />
          <span
            style={{ fontSize: "16px", fontWeight: "500", color: "#ffffff" }}
          >
            {companyName}
          </span>
        </div>

        {/* Right: Date and Admin User */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "24px",
            minWidth: "fit-content",
          }}
        >
          <span style={{ fontSize: "14px", color: "#ffffff" }}>
            {currentDate}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                backgroundColor: "#1f2937",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "16px",
              }}
            >
              👤
            </div>
            <span style={{ fontSize: "14px", color: "#ffffff" }}>
              Admin {adminName}
            </span>
          </div>
        </div>
      </header>

      <div
        style={{ display: "flex", flex: 1, minHeight: "calc(100vh - 64px)" }}
      >
        {/* Left Sidebar - 1/5 width (20%), Dark Navy */}
        <aside
          style={{
            width: "20%",
            backgroundColor: "#111827",
            color: "white",
            padding: "24px",
            flexShrink: 0,
          }}
        >
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button
              onClick={() => navigate("/csr-dashboard")}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "#d1d5db",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1f2937";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#d1d5db";
              }}
            >
              <Home style={{ width: "20px", height: "20px" }} />
              <span>Dashboard</span>
            </button>
            <button
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "#1f2937",
                color: "#f97316",
                border: "1px solid #374151",
                fontWeight: "500",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <Briefcase style={{ width: "20px", height: "20px" }} />
              <span>Project Portfolio</span>
            </button>
            <button
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                borderRadius: "8px",
                backgroundColor: "transparent",
                color: "#d1d5db",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1f2937";
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#d1d5db";
              }}
            >
              <Settings style={{ width: "20px", height: "20px" }} />
              <span>Settings</span>
            </button>
          </nav>
        </aside>

        {/* Main Content - 4/5 width (80%) */}
        <main
          style={{
            width: "80%",
            padding: "24px",
            backgroundColor: "#f9fafb",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >

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

      {/* AI Insights Panel */}
      {showInsightsPanel && (
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
              <div style={{ fontSize: "12px", color: "#6b7280" }}>${(data.budget / 1000).toFixed(0)}K • {data.beneficiaries.toLocaleString()} beneficiaries</div>
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
        <button onClick={() => alert("New Project creation form would open here. (Feature coming soon)")} style={{ padding: "8px 16px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}>
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
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={[
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
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Project Status & Health</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
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
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
        </main>
      </div>
      
      {/* Footer */}
      <Footer />
    </div>
  );
}

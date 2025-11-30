import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Plus, Filter, Grid3x3, Trello, Calendar, Map, ChevronRight, X, AlertCircle, CheckCircle, Clock, DollarSign } from "lucide-react";

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
  const userId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;
  const [viewType, setViewType] = useState<"grid" | "kanban" | "timeline" | "impact">("grid");
  const [filterTier, setFilterTier] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<PortfolioProject | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: portfolioData, isLoading } = useQuery<PortfolioSummary>({
    queryKey: ["/api/csr/portfolio/summary", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/portfolio/summary?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch portfolio data");
      return response.json();
    },
    enabled: !!userId,
  });

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
    return true;
  }) || [];

  const KPICard = ({ icon, label, value, color }: { icon: string; label: string; value: any; color: string }) => (
    <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", border: "1px solid #e5e7eb", flex: 1, minWidth: "150px" }}>
      <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{icon} {label}</div>
      <div style={{ fontSize: "24px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );

  const ProjectCard = ({ project }: { project: PortfolioProject }) => (
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
        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: statusColors[project.status] + "20", color: statusColors[project.status] }}>
          {project.status}
        </span>
      </div>
      <h3 style={{ fontSize: "15px", fontWeight: "600", color: "#111827", margin: "0 0 8px 0" }}>{project.name}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px", marginBottom: "12px" }}>
        <div style={{ color: "#6b7280" }}>💰 ${project.budgetAllocated.toLocaleString()}</div>
        <div style={{ color: "#6b7280" }}>👥 {project.beneficiariesDirect.toLocaleString()}</div>
      </div>
      <div style={{ backgroundColor: "#f3f4f6", height: "4px", borderRadius: "2px", overflow: "hidden", marginBottom: "8px" }}>
        <div style={{ height: "100%", width: `${project.completionPercentage}%`, backgroundColor: "#059669", transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: "11px", color: "#9ca3af" }}>{project.completionPercentage}% Complete</div>
    </div>
  );

  return (
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Budget</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#059669" }}>${selectedProject.budgetAllocated.toLocaleString()}</div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>Spent: ${selectedProject.budgetSpent.toLocaleString()}</div>
              </div>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Beneficiaries</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#3b82f6" }}>{selectedProject.beneficiariesDirect.toLocaleString()}</div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>Indirect: {selectedProject.beneficiariesIndirect.toLocaleString()}</div>
              </div>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Progress</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#f59e0b" }}>{selectedProject.completionPercentage}%</div>
                <div style={{ fontSize: "10px", color: "#9ca3af" }}>Complete</div>
              </div>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px" }}>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>Timeline</div>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a8a" }}>
                  {new Date(selectedProject.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(selectedProject.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ flex: 1, padding: "10px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                View Details
              </button>
              <button style={{ flex: 1, padding: "10px", backgroundColor: "#f3f4f6", color: "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                Update Status
              </button>
            </div>
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

      {/* View Controls */}
      <div style={{ display: "flex", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => setViewType("grid")} style={{ padding: "8px 16px", backgroundColor: viewType === "grid" ? "#3b82f6" : "#f3f4f6", color: viewType === "grid" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
            <Grid3x3 style={{ width: "16px", height: "16px", display: "inline", marginRight: "4px" }} /> Grid
          </button>
          <button onClick={() => setViewType("kanban")} style={{ padding: "8px 16px", backgroundColor: viewType === "kanban" ? "#3b82f6" : "#f3f4f6", color: viewType === "kanban" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
            <Trello style={{ width: "16px", height: "16px", display: "inline", marginRight: "4px" }} /> Kanban
          </button>
          <button onClick={() => setViewType("timeline")} style={{ padding: "8px 16px", backgroundColor: viewType === "timeline" ? "#3b82f6" : "#f3f4f6", color: viewType === "timeline" ? "white" : "#111827", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
            <Calendar style={{ width: "16px", height: "16px", display: "inline", marginRight: "4px" }} /> Timeline
          </button>
        </div>
        <button style={{ padding: "8px 16px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
          <Plus style={{ width: "16px", height: "16px", display: "inline", marginRight: "4px" }} /> New Project
        </button>
      </div>

      {/* Portfolio Grid View */}
      {viewType === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
          {filteredProjects.map((project: PortfolioProject) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

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
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={[{ name: "Active", value: portfolioData?.activeProjects }, { name: "Pending", value: 3 }, { name: "Complete", value: portfolioData?.completedProjects }]} cx="50%" cy="50%" outerRadius={60} dataKey="value">
                <Cell fill="#059669" />
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

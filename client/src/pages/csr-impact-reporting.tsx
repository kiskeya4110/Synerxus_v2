import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BarChart3, TrendingUp, Users, DollarSign, Globe, CheckCircle, Home, ArrowLeft, Download, Share2 } from "lucide-react";
import { useState } from "react";

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

export function CSRImpactReporting() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedTab, setSelectedTab] = useState("overview");

  const userId = typeof window !== "undefined" ? localStorage.getItem("currentUserId") : null;
  
  const { data: impactData, isLoading } = useQuery<ImpactData>({
    queryKey: ["/api/csr/impact-reporting", userId],
    queryFn: async () => {
      const response = await fetch(`/api/csr/impact-reporting?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch impact data");
      return response.json();
    },
    enabled: !!userId
  });

  const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const companyName = "Home Corporation";

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "#f9fafb" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "32px", marginBottom: "16px" }}>⏳</div>
          <p style={{ color: "#6b7280", fontSize: "16px" }}>Loading impact metrics...</p>
        </div>
      </div>
    );
  }

  const KPICard = ({ label, value, unit, icon, trend }: any) => (
    <div style={{
      backgroundColor: "white",
      borderRadius: "12px",
      padding: "20px",
      border: "1px solid #e5e7eb",
      flex: "1",
      minWidth: "200px"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <span style={{ fontSize: "13px", color: "#6b7280", fontWeight: "500" }}>{label}</span>
        <div style={{ fontSize: "20px" }}>{icon}</div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "8px" }}>
        <span style={{ fontSize: "32px", fontWeight: "bold", color: "#1e3a8a" }}>{value}</span>
        <span style={{ fontSize: "14px", color: "#6b7280" }}>{unit}</span>
      </div>
      {trend && (
        <div style={{ fontSize: "12px", color: "#059669", display: "flex", alignItems: "center", gap: "4px" }}>
          <TrendingUp style={{ width: "14px", height: "14px" }} />
          {trend}
        </div>
      )}
    </div>
  );

  const Section = ({ title, children, icon }: any) => (
    <div style={{ marginBottom: "40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "2px solid #e5e7eb" }}>
        <span style={{ fontSize: "24px" }}>{icon}</span>
        <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#111827", margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "#ffffff" }}>
      {/* Header */}
      <header style={{
        backgroundColor: "#1e3a8a",
        color: "white",
        padding: "16px 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "64px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => navigate("/csr-dashboard")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "white", padding: "4px" }}
          >
            <ArrowLeft style={{ width: "20px", height: "20px" }} />
          </button>
          <span style={{ fontSize: "24px", fontWeight: "bold", color: "#f97316" }}>✦</span>
          <span style={{ fontSize: "18px", fontWeight: "600" }}>Impact Reporting</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "14px", color: "#d1d5db" }}>{currentDate}</span>
          <button 
            onClick={() => window.open(`/api/csr/impact-reporting/export/pdf?userId=${userId}`)}
            style={{
              backgroundColor: "#059669",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            <Download style={{ width: "16px", height: "16px" }} />
            Export PDF
          </button>
          <button 
            onClick={() => window.open(`/api/csr/impact-reporting/export/csv?userId=${userId}`)}
            style={{
              backgroundColor: "#1e3a8a",
              color: "white",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            <Download style={{ width: "16px", height: "16px" }} />
            Export CSV
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar - Dark Navy matching CSR Dashboard */}
        <aside style={{
          width: "20%",
          backgroundColor: "#1e3a8a",
          color: "white",
          padding: "24px",
          flexShrink: 0,
          overflowY: "auto"
        }}>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {[
              { id: "overview", label: "Executive Summary", icon: "📊" },
              { id: "timeseries", label: "Time-Series Analysis", icon: "📈" },
              { id: "impact", label: "Impact Deep Dive", icon: "🎯" },
              { id: "projects", label: "Projects", icon: "📁" },
              { id: "insights", label: "Insights", icon: "💡" },
              { id: "sdg", label: "SDG Alignment", icon: "🌍" },
              { id: "benchmarks", label: "Benchmarking", icon: "📍" },
              { id: "compliance", label: "Compliance", icon: "✅" }
            ].map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  backgroundColor: selectedTab === tab.id ? "rgba(59, 130, 246, 0.2)" : "transparent",
                  color: selectedTab === tab.id ? "#60a5fa" : "#d1d5db",
                  border: selectedTab === tab.id ? "1px solid rgba(59, 130, 246, 0.3)" : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: selectedTab === tab.id ? "600" : "500",
                  fontSize: "14px"
                }}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: "40px", overflowY: "auto", backgroundColor: "#ffffff" }}>
          {selectedTab === "overview" && (
            <div>
              <div style={{ marginBottom: "32px" }}>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#111827", marginBottom: "8px" }}>
                  CSR Impact Dashboard
                </h1>
                <p style={{ color: "#6b7280", fontSize: "16px" }}>
                  {companyName} • Report Period: {impactData?.reportPeriod}
                </p>
              </div>

              <Section title="Key Performance Indicators" icon="🎯">
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                  <KPICard
                    label="Total Volunteer Hours"
                    value={impactData?.engagementMetrics?.totalHours || 0}
                    unit="hrs"
                    icon="⏱️"
                    trend="+12% vs last month"
                  />
                  <KPICard
                    label="Active Employees"
                    value={impactData?.engagementMetrics?.activeEmployees || 0}
                    unit="team members"
                    icon="👥"
                  />
                  <KPICard
                    label="Lives Touched"
                    value={impactData?.impactMetrics?.estimatedLivesTouched || 0}
                    unit="people"
                    icon="❤️"
                  />
                  <KPICard
                    label="Economic Value"
                    value={`$${impactData?.financialMetrics?.volunteerHourValue || 0}`}
                    unit="generated"
                    icon="💰"
                  />
                  <KPICard
                    label="ROI"
                    value={`${impactData?.financialMetrics?.roi || 0}%`}
                    unit="return"
                    icon="📈"
                  />
                  <KPICard
                    label="ESG Rating"
                    value={impactData?.complianceStatus?.esGRating || 0}
                    unit="/ 100"
                    icon="✨"
                  />
                </div>
              </Section>

              <Section title="Participation Snapshot" icon="📊">
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Participation Rate</div>
                    <div style={{ fontSize: "32px", fontWeight: "bold", color: "#059669", marginBottom: "8px" }}>
                      {impactData?.engagementMetrics?.participationRate || 0}%
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      vs benchmark: {impactData?.benchmarks?.participationRateBenchmark}%
                    </div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Avg Hours/Employee</div>
                    <div style={{ fontSize: "32px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "8px" }}>
                      {impactData?.engagementMetrics?.avgHoursPerEmployee || 0}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      vs benchmark: {impactData?.benchmarks?.avgHoursPerEmployeeBenchmark} hrs
                    </div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Cost/Beneficiary</div>
                    <div style={{ fontSize: "32px", fontWeight: "bold", color: "#f59e0b", marginBottom: "8px" }}>
                      ${impactData?.financialMetrics?.costPerBeneficiary || 0}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9ca3af" }}>
                      vs benchmark: ${impactData?.benchmarks?.costPerBeneficiaryBenchmark}
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {selectedTab === "timeseries" && (
            <Section title="Volunteer Activity Over Time" icon="📈">
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <div style={{ display: "flex", gap: "20px", alignItems: "flex-end", height: "200px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
                  {Object.entries(impactData?.engagementMetrics?.hoursPerMonth || {}).map(([month, hours]: any) => (
                    <div key={month} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <div style={{
                        height: `${(hours / 100) * 150}px`,
                        backgroundColor: "#3b82f6",
                        borderRadius: "6px",
                        minHeight: "10px",
                        width: "100%"
                      }} />
                      <span style={{ fontSize: "12px", color: "#6b7280" }}>{month}</span>
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "#111827" }}>{hours}h</span>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: "16px", fontSize: "14px", color: "#6b7280" }}>
                  Showing monthly volunteer hour contributions across all employees
                </p>
              </div>
            </Section>
          )}

          {selectedTab === "impact" && (
            <Section title="Impact Reach Analysis" icon="🎯">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Beneficiary Reach</h3>
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Direct Beneficiaries</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669" }}>
                      {impactData?.impactMetrics?.directBeneficiaries || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Indirect Beneficiaries (2.5x multiplier)</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981" }}>
                      {impactData?.impactMetrics?.indirectBeneficiaries || 0}
                    </div>
                  </div>
                </div>
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Impact Efficiency</h3>
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Lives Touched per Hour</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#8b5cf6" }}>
                      {impactData?.impactMetrics?.impactPerHour || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "8px" }}>Total Program Cost</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>
                      ${impactData?.financialMetrics?.programCost || 0}
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {selectedTab === "projects" && (
            <Section title="Project Breakdown & Performance" icon="📁">
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb", overflowX: "auto" }}>
                {impactData?.projectMetrics && impactData.projectMetrics.length > 0 ? (
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f3f4f6" }}>
                        <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Project Name</th>
                        <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Hours</th>
                        <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Employees</th>
                        <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Avg/Employee</th>
                        <th style={{ padding: "12px", textAlign: "center", fontWeight: "600", color: "#111827", borderBottom: "2px solid #e5e7eb" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {impactData.projectMetrics.map((project: any, idx: number) => {
                        const avgHours = project.employees > 0 ? Math.round(project.hours / project.employees) : 0;
                        const statusColor = 
                          project.status === "active" ? "#059669" :
                          project.status === "completed" ? "#3b82f6" :
                          project.status === "paused" ? "#f59e0b" : "#9ca3af";
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: idx % 2 === 0 ? "#f9fafb" : "white" }}>
                            <td style={{ padding: "12px", color: "#111827", fontWeight: "500" }}>{project.name}</td>
                            <td style={{ padding: "12px", textAlign: "right", color: "#059669", fontWeight: "600" }}>{project.hours} hrs</td>
                            <td style={{ padding: "12px", textAlign: "right", color: "#374151", fontWeight: "500" }}>{project.employees}</td>
                            <td style={{ padding: "12px", textAlign: "right", color: "#6b7280", fontWeight: "500" }}>{avgHours} hrs</td>
                            <td style={{ padding: "12px", textAlign: "center" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "4px 12px",
                                borderRadius: "12px",
                                backgroundColor: statusColor + "20",
                                color: statusColor,
                                fontSize: "12px",
                                fontWeight: "600",
                                textTransform: "capitalize"
                              }}>
                                {project.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ textAlign: "center", padding: "40px", color: "#9ca3af" }}>
                    No project data available yet
                  </div>
                )}
              </div>

              <div style={{ marginTop: "32px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Project Performance Summary</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Total Projects</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a" }}>{impactData?.projectMetrics?.length || 0}</div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Combined Hours</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669" }}>
                      {impactData?.projectMetrics?.reduce((sum: number, p: any) => sum + (p.hours || 0), 0) || 0}
                    </div>
                  </div>
                  <div style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Largest Project</div>
                    <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b" }}>
                      {(impactData?.projectMetrics && impactData.projectMetrics.length > 0 ? Math.max(...impactData.projectMetrics.map((p: any) => p.hours || 0)) : 0)} hrs
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {selectedTab === "insights" && (
            <Section title="Strategic Insights & Recommendations" icon="💡">
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
                {/* Engagement Insights */}
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>👥</span> Employee Engagement
                  </h4>
                  {impactData?.engagementMetrics?.participationRate && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {impactData.engagementMetrics.participationRate >= 50 ? (
                        <div style={{ padding: "12px", backgroundColor: "#d1fae5", borderRadius: "8px", border: "1px solid #10b981", color: "#065f46", fontSize: "14px" }}>
                          ✅ <strong>Strong participation:</strong> {impactData.engagementMetrics.participationRate}% of employees are engaged. Maintain momentum with recognition programs.
                        </div>
                      ) : impactData.engagementMetrics.participationRate >= 30 ? (
                        <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "8px", border: "1px solid #f59e0b", color: "#92400e", fontSize: "14px" }}>
                          ⚠️ <strong>Moderate engagement:</strong> Focus on outreach to inactive employees and showcase impact stories.
                        </div>
                      ) : (
                        <div style={{ padding: "12px", backgroundColor: "#fee2e2", borderRadius: "8px", border: "1px solid #ef4444", color: "#991b1b", fontSize: "14px" }}>
                          🎯 <strong>Growth opportunity:</strong> Launch targeted engagement campaign. Consider new project types or flexible commitment options.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Financial Insights */}
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>💰</span> Financial Impact
                  </h4>
                  {impactData?.financialMetrics?.roi && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {impactData.financialMetrics.roi > 300 ? (
                        <div style={{ padding: "12px", backgroundColor: "#d1fae5", borderRadius: "8px", border: "1px solid #10b981", color: "#065f46", fontSize: "14px" }}>
                          ✅ <strong>Exceptional ROI:</strong> {impactData.financialMetrics.roi}% return demonstrates strong program efficiency. Scale with confidence.
                        </div>
                      ) : impactData.financialMetrics.roi > 150 ? (
                        <div style={{ padding: "12px", backgroundColor: "#dbeafe", borderRadius: "8px", border: "1px solid #3b82f6", color: "#1e40af", fontSize: "14px" }}>
                          ✅ <strong>Solid ROI:</strong> {impactData.financialMetrics.roi}% exceeds industry benchmarks. Opportunity to increase program budget.
                        </div>
                      ) : (
                        <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "8px", border: "1px solid #f59e0b", color: "#92400e", fontSize: "14px" }}>
                          💡 <strong>Optimize efficiency:</strong> Focus on high-impact projects and cost-effective delivery models.
                        </div>
                      )}
                      <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
                        Economic value generated: <strong>${impactData?.financialMetrics?.volunteerHourValue || 0}</strong> | Cost per beneficiary: <strong>${impactData?.financialMetrics?.costPerBeneficiary || 0}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* SDG Insights */}
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🌍</span> SDG Coverage
                  </h4>
                  {impactData?.sdgMetrics && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {impactData.sdgMetrics.length >= 5 ? (
                        <div style={{ padding: "12px", backgroundColor: "#d1fae5", borderRadius: "8px", border: "1px solid #10b981", color: "#065f46", fontSize: "14px" }}>
                          ✅ <strong>Broad SDG alignment:</strong> Contributing to {impactData.sdgMetrics.length} UN goals. Demonstrates comprehensive impact approach.
                        </div>
                      ) : impactData.sdgMetrics.length >= 3 ? (
                        <div style={{ padding: "12px", backgroundColor: "#dbeafe", borderRadius: "8px", border: "1px solid #3b82f6", color: "#1e40af", fontSize: "14px" }}>
                          ✅ <strong>Strong alignment:</strong> {impactData.sdgMetrics.length} SDG goals supported. Meet GRI and sustainability reporting standards.
                        </div>
                      ) : (
                        <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "8px", border: "1px solid #f59e0b", color: "#92400e", fontSize: "14px" }}>
                          💡 <strong>Expand diversity:</strong> Current focus: {impactData.sdgMetrics.map((s: any) => `SDG ${s.goal}`).join(", ")}. Consider adding complementary goals.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Compliance Insights */}
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>✅</span> Compliance Status
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {impactData?.complianceStatus?.avgComplianceScore && impactData.complianceStatus.avgComplianceScore >= 80 ? (
                      <div style={{ padding: "12px", backgroundColor: "#d1fae5", borderRadius: "8px", border: "1px solid #10b981", color: "#065f46", fontSize: "14px" }}>
                        ✅ <strong>High compliance:</strong> Score {impactData.complianceStatus.avgComplianceScore}/100. Ready for certification and investor reporting.
                      </div>
                    ) : impactData?.complianceStatus?.avgComplianceScore && impactData.complianceStatus.avgComplianceScore >= 60 ? (
                      <div style={{ padding: "12px", backgroundColor: "#dbeafe", borderRadius: "8px", border: "1px solid #3b82f6", color: "#1e40af", fontSize: "14px" }}>
                        💡 <strong>On track:</strong> Score {impactData.complianceStatus.avgComplianceScore}/100. Address gaps before certification deadline.
                      </div>
                    ) : (
                      <div style={{ padding: "12px", backgroundColor: "#fef3c7", borderRadius: "8px", border: "1px solid #f59e0b", color: "#92400e", fontSize: "14px" }}>
                        🎯 <strong>Action needed:</strong> Score {impactData.complianceStatus.avgComplianceScore || 0}/100. Focus on highest-impact improvements.
                      </div>
                    )}
                    <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>
                      B-Corp: {impactData?.complianceStatus?.complianceScores?.bCorpScore || 0}/100 | GRI: {impactData?.complianceStatus?.complianceScores?.griScore || 0}/100 | ISO: {impactData?.complianceStatus?.complianceScores?.isoScore || 0}/100
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {selectedTab === "sdg" && (
            <Section title="UN Sustainable Development Goals Alignment" icon="🌍">
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                {impactData?.sdgMetrics && impactData.sdgMetrics.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {impactData.sdgMetrics.map((sdg: any) => (
                      <div key={sdg.goal}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                          <span style={{ fontWeight: "500", color: "#111827" }}>SDG {sdg.goal}</span>
                          <span style={{ color: "#6b7280" }}>{sdg.hours} hrs ({sdg.percentage}%)</span>
                        </div>
                        <div style={{
                          height: "12px",
                          backgroundColor: "#e5e7eb",
                          borderRadius: "6px",
                          overflow: "hidden"
                        }}>
                          <div style={{
                            height: "100%",
                            width: `${sdg.percentage}%`,
                            backgroundColor: "#3b82f6",
                            transition: "width 0.3s"
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#9ca3af", textAlign: "center" }}>No SDG data available yet</p>
                )}
              </div>
            </Section>
          )}

          {selectedTab === "benchmarks" && (
            <Section title="Performance vs Industry Benchmarks" icon="📍">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280", marginBottom: "16px" }}>Hours/Employee</h3>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Your Performance</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#1e3a8a" }}>
                      {impactData?.benchmarks?.yourMetrics?.hoursPerEmployee || 0}
                    </div>
                  </div>
                  <div style={{ paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Industry Benchmark</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#9ca3af" }}>
                      {impactData?.benchmarks?.avgHoursPerEmployeeBenchmark}
                    </div>
                  </div>
                </div>
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280", marginBottom: "16px" }}>Participation Rate</h3>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Your Performance</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#059669" }}>
                      {impactData?.benchmarks?.yourMetrics?.participationRate || 0}%
                    </div>
                  </div>
                  <div style={{ paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Industry Benchmark</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#9ca3af" }}>
                      {impactData?.benchmarks?.participationRateBenchmark}%
                    </div>
                  </div>
                </div>
                <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                  <h3 style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280", marginBottom: "16px" }}>Cost/Beneficiary</h3>
                  <div style={{ marginBottom: "12px" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Your Performance</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>
                      ${impactData?.benchmarks?.yourMetrics?.costPerBeneficiary || 0}
                    </div>
                  </div>
                  <div style={{ paddingTop: "12px", borderTop: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Industry Benchmark</div>
                    <div style={{ fontSize: "24px", fontWeight: "bold", color: "#9ca3af" }}>
                      ${impactData?.benchmarks?.costPerBeneficiaryBenchmark}
                    </div>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {selectedTab === "compliance" && (
            <Section title="Compliance & Certifications" icon="✅">
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Overall Compliance Score</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "48px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "4px" }}>
                      {impactData?.complianceStatus?.avgComplianceScore || 0}
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>/ 100</div>
                  </div>
                  <div style={{ flex: 1, height: "40px", backgroundColor: "#e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${(impactData?.complianceStatus?.avgComplianceScore || 0)}%`,
                      backgroundColor: "#3b82f6",
                      transition: "width 0.3s"
                    }} />
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
                <div style={{ backgroundColor: "#f0f9ff", padding: "20px", borderRadius: "12px", border: "2px solid #3b82f6" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#1e40af", margin: "0 0 8px 0" }}>B-Corp Alignment</h4>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#1e3a8a", marginBottom: "8px" }}>
                    {impactData?.complianceStatus?.complianceScores?.bCorpScore || 0}/100
                  </div>
                  <p style={{ fontSize: "12px", color: "#374151", margin: "0" }}>
                    ROI: {impactData?.financialMetrics?.roi || 0}% | Participation: {impactData?.engagementMetrics?.participationRate || 0}%
                  </p>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: impactData?.complianceStatus?.bCorpReady ? "#059669" : "#991b1b", marginTop: "8px" }}>
                    {impactData?.complianceStatus?.bCorpReady ? "✅ Ready for certification" : "⚠️ Below threshold"}
                  </div>
                </div>

                <div style={{ backgroundColor: "#f0fdf4", padding: "20px", borderRadius: "12px", border: "2px solid #10b981" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#166534", margin: "0 0 8px 0" }}>GRI Standards</h4>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#059669", marginBottom: "8px" }}>
                    {impactData?.complianceStatus?.complianceScores?.griScore || 0}/100
                  </div>
                  <p style={{ fontSize: "12px", color: "#374151", margin: "0" }}>
                    SDGs: {impactData?.sdgMetrics?.length || 0} | Hours: {impactData?.engagementMetrics?.totalHours || 0}
                  </p>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: impactData?.complianceStatus?.griAligned ? "#059669" : "#991b1b", marginTop: "8px" }}>
                    {impactData?.complianceStatus?.griAligned ? "✅ Standards met" : "⚠️ Needs more coverage"}
                  </div>
                </div>

                <div style={{ backgroundColor: "#fef3c7", padding: "20px", borderRadius: "12px", border: "2px solid #f59e0b" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", margin: "0 0 8px 0" }}>ISO 26000</h4>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#b45309", marginBottom: "8px" }}>
                    {impactData?.complianceStatus?.complianceScores?.isoScore || 0}/100
                  </div>
                  <p style={{ fontSize: "12px", color: "#374151", margin: "0" }}>
                    Employees: {impactData?.engagementMetrics?.activeEmployees || 0} | Cost/Beneficiary: ${impactData?.financialMetrics?.costPerBeneficiary || 0}
                  </p>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#b45309", marginTop: "8px" }}>
                    Community responsibility standards
                  </div>
                </div>

                <div style={{ backgroundColor: "#f5f3ff", padding: "20px", borderRadius: "12px", border: "2px solid #8b5cf6" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#5b21b6", margin: "0 0 8px 0" }}>SASB Metrics</h4>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#7c3aed", marginBottom: "8px" }}>
                    {impactData?.complianceStatus?.complianceScores?.sasbScore || 0}/100
                  </div>
                  <p style={{ fontSize: "12px", color: "#374151", margin: "0" }}>
                    Lives Touched: {impactData?.impactMetrics?.estimatedLivesTouched || 0} | ROI: {impactData?.financialMetrics?.roi || 0}%
                  </p>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#7c3aed", marginTop: "8px" }}>
                    Sustainability accounting standards
                  </div>
                </div>

                <div style={{ backgroundColor: "#fef2f2", padding: "20px", borderRadius: "12px", border: "2px solid #f59e0b" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#92400e", margin: "0 0 8px 0" }}>ESG Overall Rating</h4>
                  <div style={{ fontSize: "28px", fontWeight: "bold", color: "#b45309", marginBottom: "8px" }}>
                    {impactData?.complianceStatus?.esGRating || 0}/100
                  </div>
                  <p style={{ fontSize: "12px", color: "#374151", margin: "0" }}>
                    Environmental, Social, Governance assessment
                  </p>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#b45309", marginTop: "8px" }}>
                    ✨ Stakeholder confidence indicator
                  </div>
                </div>
              </div>
            </Section>
          )}
        </main>
      </div>
    </div>
  );
}

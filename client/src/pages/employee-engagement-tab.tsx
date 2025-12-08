import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { Users, TrendingUp, Award, Target, CheckCircle, X, Clock, Calendar, Briefcase, Star, ArrowUpRight, ArrowDownRight, Zap, Heart, UserPlus, Activity, BarChart2 } from "lucide-react";

interface EngagementTabProps {
  userId: string | null;
}

// VMS Industry Benchmarks
const VMS_ENGAGEMENT_BENCHMARKS = {
  participationRate: { excellent: 45, good: 30, average: 15 },
  retentionRate: { excellent: 90, good: 75, average: 60 },
  avgHoursPerVolunteer: { excellent: 24, good: 16, average: 8 },
  repeatVolunteerRate: { excellent: 70, good: 50, average: 30 },
  satisfactionScore: { excellent: 90, good: 75, average: 60 },
};

export default function EmployeeEngagementTab({ userId }: EngagementTabProps) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "leaderboard" | "analytics" | "recognition">("overview");
  const [showGoalModal, setShowGoalModal] = useState(false);

  const { data: engagementData, isLoading } = useQuery({
    queryKey: ["/api/employee-engagement/summary", userId],
    queryFn: async () => {
      const response = await fetch(`/api/employee-engagement/summary?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch engagement data");
      return response.json();
    },
    enabled: !!userId,
  });

  // Enhanced engagement metrics
  const volunteerRetentionRate = 78;
  const repeatVolunteerRate = 62;
  const skillsMatchScore = 74;
  const volunteerSatisfaction = 85;

  // Engagement funnel data
  const engagementFunnelData = [
    { stage: "Eligible", count: engagementData?.totalEmployees || 500, percentage: 100 },
    { stage: "Registered", count: Math.round((engagementData?.totalEmployees || 500) * 0.65), percentage: 65 },
    { stage: "Active", count: engagementData?.activeEmployees || 125, percentage: Math.round(((engagementData?.activeEmployees || 125) / (engagementData?.totalEmployees || 500)) * 100) },
    { stage: "Regular", count: Math.round((engagementData?.activeEmployees || 125) * 0.55), percentage: Math.round((engagementData?.activeEmployees || 125) * 0.55 / (engagementData?.totalEmployees || 500) * 100) },
    { stage: "Champion", count: Math.round((engagementData?.activeEmployees || 125) * 0.15), percentage: Math.round((engagementData?.activeEmployees || 125) * 0.15 / (engagementData?.totalEmployees || 500) * 100) },
  ];

  // Top volunteers leaderboard
  const topVolunteers = [
    { rank: 1, name: "Sarah Johnson", dept: "Marketing", hours: 48, projects: 6, badge: "🥇" },
    { rank: 2, name: "Michael Chen", dept: "Engineering", hours: 42, projects: 5, badge: "🥈" },
    { rank: 3, name: "Emily Davis", dept: "HR", hours: 38, projects: 7, badge: "🥉" },
    { rank: 4, name: "James Wilson", dept: "Sales", hours: 35, projects: 4, badge: "⭐" },
    { rank: 5, name: "Lisa Park", dept: "Finance", hours: 32, projects: 5, badge: "⭐" },
  ];

  // Skills distribution
  const skillsData = [
    { skill: "Mentoring", volunteers: 45, hours: 320, color: "#3b82f6" },
    { skill: "Technical", volunteers: 38, hours: 280, color: "#10b981" },
    { skill: "Event Planning", volunteers: 32, hours: 190, color: "#f59e0b" },
    { skill: "Teaching", volunteers: 28, hours: 210, color: "#8b5cf6" },
    { skill: "Admin Support", volunteers: 22, hours: 150, color: "#ef4444" },
  ];

  // Radar data for engagement health
  const engagementHealthData = [
    { metric: "Participation", value: engagementData?.engagementRate || 25, fullMark: 100 },
    { metric: "Retention", value: volunteerRetentionRate, fullMark: 100 },
    { metric: "Satisfaction", value: volunteerSatisfaction, fullMark: 100 },
    { metric: "Skills Match", value: skillsMatchScore, fullMark: 100 },
    { metric: "Repeat Rate", value: repeatVolunteerRate, fullMark: 100 },
    { metric: "Growth", value: 68, fullMark: 100 },
  ];

  if (isLoading) {
    return (
      <div style={{ padding: "24px", textAlign: "center", color: "#9ca3af" }}>
        Loading Employee Engagement data...
      </div>
    );
  }

  const metrics = [
    {
      id: "employees",
      icon: "👥",
      label: "Active Employees",
      value: engagementData?.activeEmployees || 0,
      color: "#059669",
      bgColor: "#f0fdf4",
      details: {
        title: "Active Employees",
        description: "Employees currently engaged in volunteer activities",
        stats: [
          { label: "Current Active", value: engagementData?.activeEmployees || 0 },
          { label: "Total Roster", value: engagementData?.totalEmployees || engagementData?.activeEmployees || 0 },
          { label: "Participation Rate", value: `${engagementData?.engagementRate || 0}%` },
          { label: "New This Month", value: engagementData?.newEmployeesThisMonth || 0 },
        ],
        trend: engagementData?.employeeTrend || "stable",
      }
    },
    {
      id: "hours",
      icon: "⏱️",
      label: "Total Hours Logged",
      value: engagementData?.totalHours || 0,
      color: "#3b82f6",
      bgColor: "#f0f9ff",
      details: {
        title: "Total Hours Logged",
        description: "Cumulative volunteer hours contributed",
        stats: [
          { label: "Total Hours", value: engagementData?.totalHours || 0 },
          { label: "Average per Employee", value: (engagementData?.totalHours || 0) / (engagementData?.activeEmployees || 1) },
          { label: "Economic Value", value: `$${((engagementData?.totalHours || 0) * 35).toLocaleString()}` },
          { label: "This Month", value: engagementData?.hoursThisMonth || 0 },
        ],
        trend: engagementData?.hoursTrend || "stable",
      }
    },
    {
      id: "projects",
      icon: "✅",
      label: "Completed Projects",
      value: engagementData?.completedCommitments || 0,
      color: "#f59e0b",
      bgColor: "#fffbeb",
      details: {
        title: "Completed Projects",
        description: "Employee commitments and project completions",
        stats: [
          { label: "Completed", value: engagementData?.completedCommitments || 0 },
          { label: "In Progress", value: engagementData?.inProgressCommitments || 0 },
          { label: "Completion Rate", value: `${engagementData?.completionRate || 0}%` },
          { label: "Average Duration", value: `${engagementData?.avgProjectDuration || 0} days` },
        ],
        trend: engagementData?.projectsTrend || "stable",
      }
    },
    {
      id: "engagement",
      icon: "📈",
      label: "Engagement Rate",
      value: `${engagementData?.engagementRate || 0}%`,
      color: "#8b5cf6",
      bgColor: "#faf5ff",
      details: {
        title: "Engagement Rate",
        description: "Percentage of eligible employees actively volunteering",
        stats: [
          { label: "Current Rate", value: `${engagementData?.engagementRate || 0}%` },
          { label: "Active Employees", value: `${engagementData?.activeEmployees || 0} / ${engagementData?.totalEmployees || 0}` },
          { label: "New This Month", value: engagementData?.newEmployeesThisMonth || 0 },
          { label: "Monthly Growth", value: `${engagementData?.engagementGrowth || 0}%` },
        ],
        trend: engagementData?.engagementTrend || "stable",
      }
    },
  ];

  const getDetailContent = (metricId: string) => {
    const metric = metrics.find(m => m.id === metricId);
    if (!metric) return null;

    return (
      <div style={{ minWidth: "400px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <div>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#111827", margin: "0" }}>{metric.details.title}</h2>
            <p style={{ fontSize: "14px", color: "#6b7280", margin: "8px 0 0 0" }}>{metric.details.description}</p>
          </div>
          <button 
            onClick={() => setShowDetailModal(false)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <X style={{ width: "20px", height: "20px", color: "#6b7280" }} />
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
          {metric.details.stats.map((stat, idx) => (
            <div key={idx} style={{ backgroundColor: "#f9fafb", padding: "16px", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
              <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>{stat.label}</div>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: metric.color }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ backgroundColor: metric.bgColor, border: `1px solid ${metric.color}33`, borderRadius: "8px", padding: "16px" }}>
          <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px" }}>Trend</div>
          <div style={{ fontSize: "14px", fontWeight: "600", color: metric.color, textTransform: "capitalize" }}>
            {metric.details.trend === "increasing" && "📈 Increasing"}
            {metric.details.trend === "decreasing" && "📉 Decreasing"}
            {metric.details.trend === "stable" && "➡️ Stable"}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Detail Modal */}
      {showDetailModal && selectedMetric && (
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
            maxWidth: "600px",
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
          }}>
            {getDetailContent(selectedMetric)}
          </div>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", borderBottom: "2px solid #e5e7eb", paddingBottom: "12px" }}>
        {[
          { id: "overview", label: "Overview", icon: <BarChart2 style={{ width: "16px", height: "16px" }} /> },
          { id: "leaderboard", label: "Leaderboard", icon: <Award style={{ width: "16px", height: "16px" }} /> },
          { id: "analytics", label: "Analytics", icon: <Activity style={{ width: "16px", height: "16px" }} /> },
          { id: "recognition", label: "Recognition", icon: <Star style={{ width: "16px", height: "16px" }} /> },
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
        <button
          onClick={() => setShowGoalModal(true)}
          style={{
            marginLeft: "auto",
            padding: "10px 20px",
            backgroundColor: "#059669",
            color: "white",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Target style={{ width: "16px", height: "16px" }} />
          Set Goals
        </button>
      </div>

      {/* Goal Setting Modal */}
      {showGoalModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "32px", maxWidth: "500px", width: "90%" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "bold", color: "#111827", marginBottom: "16px" }}>Set Engagement Goals</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "6px" }}>Target Participation Rate (%)</label>
                <input type="number" defaultValue={40} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e5e7eb" }} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "6px" }}>Target Total Hours</label>
                <input type="number" defaultValue={5000} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e5e7eb" }} />
              </div>
              <div>
                <label style={{ fontSize: "13px", fontWeight: "500", color: "#374151", display: "block", marginBottom: "6px" }}>Target Active Volunteers</label>
                <input type="number" defaultValue={200} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #e5e7eb" }} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
              <button onClick={() => setShowGoalModal(false)} style={{ padding: "10px 20px", backgroundColor: "white", border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => setShowGoalModal(false)} style={{ padding: "10px 20px", backgroundColor: "#059669", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}>Save Goals</button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced KPI Cards with VMS Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "12px" }}>
        {/* Original 4 KPIs */}
        <div style={{ display: "contents" }}>
          {metrics.slice(0, 4).map((metric) => (
            <button
              key={metric.id}
              onClick={() => {
                setSelectedMetric(metric.id);
                setShowDetailModal(true);
              }}
              style={{
                backgroundColor: metric.bgColor,
                padding: "16px",
                borderRadius: "12px",
                border: `2px solid ${metric.color}`,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
                fontSize: "inherit",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 12px rgba(0, 0, 0, 0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
              }}
            >
              <div style={{ fontSize: "20px", marginBottom: "6px" }}>{metric.icon}</div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>{metric.label}</div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: metric.color, marginBottom: "4px" }}>{metric.value}</div>
              <div style={{ fontSize: "10px", color: metric.color, fontWeight: "600" }}>Click for details →</div>
            </button>
          ))}
        </div>

        {/* Additional VMS Metrics */}
        <button
          onClick={() => { setSelectedMetric("retention"); setShowDetailModal(true); }}
          style={{ backgroundColor: "#f0fdf4", padding: "16px", borderRadius: "12px", border: "2px solid #10b981", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ fontSize: "20px", marginBottom: "6px" }}>🔄</div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>Retention Rate</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#10b981", marginBottom: "4px" }}>{volunteerRetentionRate}%</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <ArrowUpRight style={{ width: "12px", height: "12px", color: "#10b981" }} />
            <span style={{ fontSize: "10px", color: "#10b981", fontWeight: "600" }}>+5% YoY</span>
          </div>
        </button>

        <button
          onClick={() => { setSelectedMetric("satisfaction"); setShowDetailModal(true); }}
          style={{ backgroundColor: "#faf5ff", padding: "16px", borderRadius: "12px", border: "2px solid #8b5cf6", cursor: "pointer", textAlign: "left" }}
        >
          <div style={{ fontSize: "20px", marginBottom: "6px" }}>😊</div>
          <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px" }}>Satisfaction</div>
          <div style={{ fontSize: "24px", fontWeight: "bold", color: "#8b5cf6", marginBottom: "4px" }}>{volunteerSatisfaction}%</div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <ArrowUpRight style={{ width: "12px", height: "12px", color: "#8b5cf6" }} />
            <span style={{ fontSize: "10px", color: "#8b5cf6", fontWeight: "600" }}>NPS: 42</span>
          </div>
        </button>
      </div>

      {/* Engagement Funnel (Overview Tab) */}
      {activeSubTab === "overview" && (
        <>
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>
              Employee Engagement Funnel
            </h3>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: "180px" }}>
              {engagementFunnelData.map((stage, idx) => {
                const maxHeight = 160;
                const barHeight = (stage.percentage / 100) * maxHeight;
                const colors = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];
                return (
                  <div key={stage.stage} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
                    <div style={{ fontSize: "14px", fontWeight: "bold", color: colors[idx], marginBottom: "8px" }}>{stage.count}</div>
                    <div
                      style={{
                        width: "80%",
                        height: `${barHeight}px`,
                        backgroundColor: colors[idx],
                        borderRadius: "8px 8px 0 0",
                        transition: "height 0.3s",
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "center",
                        paddingBottom: "8px",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "white", fontWeight: "600" }}>{stage.percentage}%</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "8px", textAlign: "center" }}>{stage.stage}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Engagement Health Radar */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
            <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Engagement Health Score</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={engagementHealthData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "#9ca3af" }} />
                  <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <div style={{ textAlign: "center", marginTop: "8px" }}>
                <span style={{ fontSize: "24px", fontWeight: "bold", color: "#3b82f6" }}>
                  {Math.round(engagementHealthData.reduce((sum, d) => sum + d.value, 0) / engagementHealthData.length)}
                </span>
                <span style={{ fontSize: "14px", color: "#6b7280" }}> / 100 Overall</span>
              </div>
            </div>

            {/* Skills Distribution */}
            <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
              <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Skills-Based Volunteering</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {skillsData.map((skill) => (
                  <div key={skill.skill} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: "100px", fontSize: "12px", color: "#374151" }}>{skill.skill}</div>
                    <div style={{ flex: 1, height: "8px", backgroundColor: "#e5e7eb", borderRadius: "4px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(skill.volunteers / 50) * 100}%`, backgroundColor: skill.color, borderRadius: "4px" }} />
                    </div>
                    <div style={{ fontSize: "12px", color: "#6b7280", minWidth: "80px", textAlign: "right" }}>{skill.volunteers} volunteers</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Leaderboard Tab */}
      {activeSubTab === "leaderboard" && (
        <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Top Volunteers Leaderboard</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6" }}>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", borderBottom: "2px solid #e5e7eb" }}>Rank</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", borderBottom: "2px solid #e5e7eb" }}>Volunteer</th>
                <th style={{ padding: "12px", textAlign: "left", fontWeight: "600", borderBottom: "2px solid #e5e7eb" }}>Department</th>
                <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", borderBottom: "2px solid #e5e7eb" }}>Hours</th>
                <th style={{ padding: "12px", textAlign: "right", fontWeight: "600", borderBottom: "2px solid #e5e7eb" }}>Projects</th>
              </tr>
            </thead>
            <tbody>
              {topVolunteers.map((volunteer) => (
                <tr key={volunteer.rank} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontSize: "18px" }}>{volunteer.badge}</span>
                  </td>
                  <td style={{ padding: "12px", fontWeight: "500", color: "#111827" }}>{volunteer.name}</td>
                  <td style={{ padding: "12px", color: "#6b7280" }}>{volunteer.dept}</td>
                  <td style={{ padding: "12px", textAlign: "right", fontWeight: "600", color: "#059669" }}>{volunteer.hours}h</td>
                  <td style={{ padding: "12px", textAlign: "right", color: "#3b82f6" }}>{volunteer.projects}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Analytics Tab */}
      {activeSubTab === "analytics" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          {/* Benchmark Comparison */}
          <div style={{ backgroundColor: "#f0f9ff", padding: "24px", borderRadius: "12px", border: "2px solid #3b82f6" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#1e40af", marginBottom: "16px" }}>VMS Industry Benchmarks</h3>
            {[
              { label: "Participation Rate", yours: engagementData?.engagementRate || 25, benchmark: VMS_ENGAGEMENT_BENCHMARKS.participationRate },
              { label: "Retention Rate", yours: volunteerRetentionRate, benchmark: VMS_ENGAGEMENT_BENCHMARKS.retentionRate },
              { label: "Satisfaction Score", yours: volunteerSatisfaction, benchmark: VMS_ENGAGEMENT_BENCHMARKS.satisfactionScore },
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

          {/* Department Analytics */}
          <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Department Performance</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={engagementData?.departmentBreakdown || [{ dept: "Marketing", active: 35, hours: 420 }, { dept: "Engineering", active: 28, hours: 380 }, { dept: "HR", active: 22, hours: 310 }, { dept: "Sales", active: 25, hours: 290 }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "#6b7280" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ backgroundColor: "#1e3a8a", border: "none", borderRadius: "8px", color: "white" }} />
                <Bar dataKey="active" fill="#3b82f6" name="Active" radius={[4, 4, 0, 0]} />
                <Bar dataKey="hours" fill="#10b981" name="Hours" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recognition Tab */}
      {activeSubTab === "recognition" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
          {(engagementData?.topMilestones || [
            { milestoneType: "50_HOURS", earnedDate: new Date().toISOString(), count: 12 },
            { milestoneType: "10_PROJECTS", earnedDate: new Date().toISOString(), count: 8 },
            { milestoneType: "FIRST_VOLUNTEER", earnedDate: new Date().toISOString(), count: 25 },
          ]).map((milestone: any, idx: number) => (
            <div key={idx} style={{ backgroundColor: "white", padding: "20px", borderRadius: "12px", border: "2px solid #f59e0b", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🏆</div>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827", marginBottom: "4px" }}>
                {milestone.milestoneType?.replace(/_/g, " ")}
              </div>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#f59e0b" }}>{milestone.count || 1}</div>
              <div style={{ fontSize: "11px", color: "#6b7280" }}>employees earned</div>
            </div>
          ))}
        </div>
      )}

      {/* Original KPI Cards - Now Clickable (keeping for backwards compatibility) */}
      {activeSubTab === "overview" && (
        <>
      <div style={{ display: "none", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {metrics.map((metric) => (
          <button
            key={metric.id}
            onClick={() => {
              setSelectedMetric(metric.id);
              setShowDetailModal(true);
            }}
            style={{
              backgroundColor: metric.bgColor,
              padding: "20px",
              borderRadius: "12px",
              border: `2px solid ${metric.color}`,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              cursor: "pointer",
              transition: "all 0.2s",
              textAlign: "left",
              fontSize: "inherit",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 8px 12px rgba(0, 0, 0, 0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)";
            }}
            data-testid={`kpi-card-${metric.id}`}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{metric.icon}</div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
              {metric.label}
            </div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: metric.color, marginBottom: "8px" }}>
              {metric.value}
            </div>
            <div style={{ fontSize: "11px", color: metric.color, fontWeight: "600" }}>
              Click to view details →
            </div>
          </button>
        ))}
      </div>

      {/* Participation Trend Chart */}
      <div
        style={{
          backgroundColor: "white",
          padding: "24px",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>
          Participation Trend
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={engagementData?.participationTrend || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" stroke="#6b7280" />
            <YAxis stroke="#6b7280" />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e3a8a",
                border: "none",
                borderRadius: "8px",
                color: "white",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="active"
              stroke="#059669"
              strokeWidth={2}
              dot={{ fill: "#059669", r: 6 }}
              activeDot={{ r: 8 }}
            />
            <Line
              type="monotone"
              dataKey="completed"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: "#f59e0b", r: 6 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Department Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div
          style={{
            backgroundColor: "white",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>
            Department Breakdown
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={engagementData?.departmentBreakdown || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="dept" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e3a8a",
                  border: "none",
                  borderRadius: "8px",
                  color: "white",
                }}
              />
              <Bar dataKey="active" fill="#059669" name="Active Employees" />
              <Bar dataKey="hours" fill="#3b82f6" name="Total Hours" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Milestones */}
        <div
          style={{
            backgroundColor: "white",
            padding: "24px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>
            Recent Milestones Earned
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {engagementData?.topMilestones?.slice(0, 5).map((milestone: any, idx: number) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px",
                  backgroundColor: "#f9fafb",
                  borderRadius: "8px",
                  borderLeft: "4px solid #059669",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#f3f4f6"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#f9fafb"}
                data-testid={`milestone-${idx}`}
              >
                <Award style={{ width: "20px", height: "20px", color: "#059669", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>
                    {milestone.milestoneType?.replace(/_/g, " ")}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    {new Date(milestone.earnedDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats - Clickable Cards */}
      <div
        style={{
          backgroundColor: "#f0f9ff",
          border: "1px solid #bfdbfe",
          borderRadius: "12px",
          padding: "24px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
        }}
      >
        <div>
          <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "600", marginBottom: "8px" }}>
            🎯 Engagement Goals
          </div>
          <div style={{ fontSize: "14px", color: "#1e3a8a", lineHeight: "1.6" }}>
            <strong>Target:</strong> 50% participation, 5,000 total hours<br />
            <strong>Progress:</strong> {engagementData?.engagementRate || 0}% employees engaged
          </div>
          <button 
            onClick={() => {
              setSelectedMetric("engagement");
              setShowDetailModal(true);
            }}
            style={{
              marginTop: "12px",
              padding: "8px 16px",
              backgroundColor: "#3b82f6",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2563eb"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#3b82f6"}
            data-testid="goal-view-details"
          >
            View Goal Details →
          </button>
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "600", marginBottom: "8px" }}>
            📊 Impact Summary
          </div>
          <div style={{ fontSize: "14px", color: "#1e3a8a", lineHeight: "1.6" }}>
            <strong>Hours Logged:</strong> {engagementData?.totalHours || 0} hours<br />
            <strong>Economic Value:</strong> ${((engagementData?.totalHours || 0) * 35).toLocaleString()} (@ $35/hr)
          </div>
          <button 
            onClick={() => {
              setSelectedMetric("hours");
              setShowDetailModal(true);
            }}
            style={{
              marginTop: "12px",
              padding: "8px 16px",
              backgroundColor: "#059669",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "600",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#047857"}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#059669"}
            data-testid="impact-view-details"
          >
            View Impact Details →
          </button>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

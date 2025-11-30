import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, TrendingUp, Award, Target, CheckCircle, X } from "lucide-react";

interface EngagementTabProps {
  userId: string | null;
}

export default function EmployeeEngagementTab({ userId }: EngagementTabProps) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data: engagementData, isLoading } = useQuery({
    queryKey: ["/api/employee-engagement/summary", userId],
    queryFn: async () => {
      const response = await fetch(`/api/employee-engagement/summary?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch engagement data");
      return response.json();
    },
    enabled: !!userId,
  });

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
          { label: "Target Rate", value: "50%" },
          { label: "vs Target", value: `${Math.max(0, (engagementData?.engagementRate || 0) - 50)}%` },
          { label: "Month-over-Month", value: `${engagementData?.engagementGrowth || 0}%` },
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

      {/* KPI Cards - Now Clickable */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
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
    </div>
  );
}

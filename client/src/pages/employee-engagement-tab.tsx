import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Users, TrendingUp, Award, Target, CheckCircle } from "lucide-react";

interface EngagementTabProps {
  userId: string | null;
}

export default function EmployeeEngagementTab({ userId }: EngagementTabProps) {
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

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
      icon: "👥",
      label: "Active Employees",
      value: engagementData?.activeEmployees || 0,
      color: "#059669",
    },
    {
      icon: "⏱️",
      label: "Total Hours Logged",
      value: engagementData?.totalHours || 0,
      color: "#3b82f6",
    },
    {
      icon: "✅",
      label: "Completed Projects",
      value: engagementData?.completedCommitments || 0,
      color: "#f59e0b",
    },
    {
      icon: "📈",
      label: "Engagement Rate",
      value: `${engagementData?.engagementRate || 0}%`,
      color: "#8b5cf6",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {metrics.map((metric, idx) => (
          <div
            key={idx}
            style={{
              backgroundColor: "white",
              padding: "20px",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
          >
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>{metric.icon}</div>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
              {metric.label}
            </div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: metric.color }}>
              {metric.value}
            </div>
          </div>
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
                }}
              >
                <Award style={{ width: "20px", height: "20px", color: "#059669" }} />
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

      {/* Summary Stats */}
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
        </div>
        <div>
          <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "600", marginBottom: "8px" }}>
            📊 Impact Summary
          </div>
          <div style={{ fontSize: "14px", color: "#1e3a8a", lineHeight: "1.6" }}>
            <strong>Hours Logged:</strong> {engagementData?.totalHours || 0} hours<br />
            <strong>Economic Value:</strong> ${(engagementData?.totalHours || 0) * 35} (@ $35/hr)
          </div>
        </div>
      </div>
    </div>
  );
}

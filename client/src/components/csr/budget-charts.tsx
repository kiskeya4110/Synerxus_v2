import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface MonthlySpendingDatum {
  month: string;
  budget: number;
  actual: number;
}

interface ExpenseCategoryDatum {
  name: string;
  value: number;
  color: string;
}

interface BudgetChartsProps {
  monthlySpendingData: MonthlySpendingDatum[];
  expenseCategoriesData: ExpenseCategoryDatum[];
}

export default function BudgetCharts({
  monthlySpendingData,
  expenseCategoriesData,
}: BudgetChartsProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "24px" }}>
      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Budget vs Actual Spending</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlySpendingData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#6b7280" }} />
            <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => `$${v / 1000}K`} />
            <Tooltip contentStyle={{ backgroundColor: "#1e3a8a", border: "none", borderRadius: "8px", color: "white" }} formatter={(value: number) => `$${value.toLocaleString()}`} />
            <Bar dataKey="budget" fill="#e5e7eb" name="Budget" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" fill="#3b82f6" name="Actual" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
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

      <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
        <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginBottom: "16px" }}>Spending by Category</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
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
          </PieChart>
        </ResponsiveContainer>
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
  );
}

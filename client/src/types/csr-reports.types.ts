/**
 * Shared types and static data for CSR Reports & Exports.
 * Imported by csr-reports-exports.tsx, csr-report-generators.ts,
 * csr-reports-mobile.tsx, and csr-reports-desktop.tsx.
 */

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: "compliance" | "executive" | "engagement" | "impact" | "evidence" | "financial";
  icon: string;
  formats: string[];
  lastGenerated?: string;
  frequency?: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly" | "quarterly";
  nextRun: string;
  recipients: string[];
  format: string;
  active: boolean;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  category: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  project?: string;
  submittedBy: string;
}

// MVP: PDF export only - no CSV per spec
export const reportTemplates: ReportTemplate[] = [
  {
    id: "volunteer-hours",
    name: "Volunteer Hours Report",
    description: "Confirmed volunteer hours by employee with SDG breakdown.",
    category: "engagement",
    icon: "⏱️",
    formats: ["PDF"],
    frequency: "monthly",
  },
  {
    id: "sdg-impact",
    name: "SDG Evidence Summary",
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
    id: "verified-evidence-summary",
    name: "Verified Evidence Summary",
    description: "Partner-confirmed evidence records supporting ESG/CSR reporting and assurance preparation.",
    category: "evidence",
    icon: "📊",
    formats: ["PDF"],
    frequency: "quarterly",
  },
  {
    id: "esg-audit",
    name: "ESG Evidence Review Export",
    description: "Confirmed ESG activity records with evidence timestamps for assurance preparation.",
    category: "evidence",
    icon: "✅",
    formats: ["PDF"],
    frequency: "quarterly",
  },
];

// Monthly spending chart data
export const monthlySpendingData = [
  { month: "Jan", budget: 15000, actual: 12500, projected: 13000 },
  { month: "Feb", budget: 15000, actual: 14200, projected: 14500 },
  { month: "Mar", budget: 18000, actual: 16800, projected: 17000 },
  { month: "Apr", budget: 18000, actual: 17500, projected: 18000 },
  { month: "May", budget: 20000, actual: 18200, projected: 19000 },
  { month: "Jun", budget: 20000, actual: 19500, projected: 20000 },
];

// Expense categories breakdown
export const expenseCategoriesData = [
  { name: "Program Costs", value: 45000, color: "#3b82f6" },
  { name: "Volunteer Support", value: 25000, color: "#10b981" },
  { name: "Marketing", value: 12000, color: "#f59e0b" },
  { name: "Technology", value: 8000, color: "#8b5cf6" },
  { name: "Admin", value: 5000, color: "#ef4444" },
];

// Sample expense records for demo/initial state
export const sampleExpenses: ExpenseRecord[] = [
  { id: "EXP001", date: "2024-06-15", category: "Program Costs", description: "Community event supplies", amount: 1250, status: "approved", project: "Youth Mentorship", submittedBy: "Sarah Johnson" },
  { id: "EXP002", date: "2024-06-12", category: "Volunteer Support", description: "Volunteer training materials", amount: 850, status: "approved", project: "Skills Training", submittedBy: "Michael Chen" },
  { id: "EXP003", date: "2024-06-10", category: "Technology", description: "Volunteer management software", amount: 2500, status: "pending", submittedBy: "Admin" },
  { id: "EXP004", date: "2024-06-08", category: "Marketing", description: "Campaign materials", amount: 1800, status: "approved", project: "Food Bank Initiative", submittedBy: "Emily Davis" },
  { id: "EXP005", date: "2024-06-05", category: "Program Costs", description: "Transportation for volunteers", amount: 650, status: "pending", project: "Environmental Cleanup", submittedBy: "James Wilson" },
];

export const reportCategories = [
  { id: "all", label: "All Reports", icon: "📄" },
  { id: "executive", label: "Executive", icon: "📊" },
  { id: "engagement", label: "Engagement", icon: "👥" },
  { id: "impact", label: "Impact", icon: "🌍" },
  { id: "evidence", label: "Evidence", icon: "🧾" },
  { id: "compliance", label: "Compliance", icon: "✅" },
  { id: "financial", label: "Financial", icon: "💰" },
];

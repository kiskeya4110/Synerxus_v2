/**
 * Shared Type Definitions
 * Common types used across frontend and backend
 */

// ============================================
// User Types
// ============================================

export type UserType = "volunteer" | "organization" | "corporate-partner";

export interface User {
  id: number;
  email: string;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  userType: UserType | null;
  organizationId?: number | null;
  firebaseUid?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// Organization Types
// ============================================

export interface Organization {
  id: number;
  name: string;
  description?: string | null;
  logo?: string | null;
  website?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  primarySdgs?: number[] | null;
  needs?: string[] | null;
  goals?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// Project Types
// ============================================

export type ProjectStatus = "draft" | "active" | "completed" | "archived";

export interface Project {
  id: number;
  name: string;
  description?: string | null;
  organizationId?: number | null;
  status: ProjectStatus;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  location?: string | null;
  sdgGoals?: number[] | null;
  primarySdg?: number | null;
  coverImage?: string | null;
  completionPercentage: number;
  totalHoursLogged: number;
  livesTouched: number;
  volunteersNeeded: number;
  requiredSkills?: string[] | null;
  engagementType?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// Volunteer Activity Types
// ============================================

export type VerificationStatus = "pending" | "approved" | "rejected" | "verified" | "self_reported";

export interface VolunteerActivity {
  id: number;
  userId?: number | null;
  projectId?: number | null;
  taskId?: number | null;
  hours: number;
  date: Date | string;
  description?: string | null;
  skillsApplied?: string[] | null;
  outcomes?: string | null;
  verificationStatus: VerificationStatus;
  evidenceUrls?: string[] | null;
  isDuplicated: boolean;
  dedupGroupId?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// Impact Types
// ============================================

export interface ProjectImpact {
  id: number;
  projectId: number;
  metricId?: number | null;
  userId?: number | null;
  value: number;
  notes?: string | null;
  verificationStatus: VerificationStatus;
  evidenceUrls?: string[] | null;
  reportedAt: Date | string;
  verifiedAt?: Date | string | null;
  verifiedBy?: number | null;
}

export interface ImpactMetric {
  id: number;
  name: string;
  description?: string | null;
  category?: string | null;
  unit?: string | null;
  sdgAlignment?: number[] | null;
  aggregationType: "sum" | "average" | "max" | "min" | "count";
  isActive: boolean;
}

// ============================================
// CSR Types
// ============================================

export interface CSRPartner {
  id: number;
  userId: number;
  companyName: string;
  contactEmail?: string | null;
  contactPhone?: string | null;
  industryType?: string | null;
  employeeCount?: number | null;
  annualCSRBudget?: number | null;
  primarySdgs?: number[] | null;
  logoUrl?: string | null;
  vtoTrackingEnabled: boolean;
  rosterSyncStatus?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface EmployeeEngagement {
  id: number;
  partnerId: number;
  employeeEmail: string;
  employeeName?: string | null;
  projectId?: number | null;
  hoursVolunteered: number;
  engagementType?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// Application Types
// ============================================

export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

export interface Application {
  id: number;
  volunteerId: number;
  opportunityId: number;
  status: ApplicationStatus;
  coverLetter?: string | null;
  appliedAt: Date | string;
  reviewedAt?: Date | string | null;
  reviewedBy?: number | null;
}

// ============================================
// Task Types
// ============================================

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: number;
  title: string;
  description?: string | null;
  projectId?: number | null;
  assigneeId?: number | null;
  status: TaskStatus;
  priority?: TaskPriority | null;
  dueDate?: Date | string | null;
  estimatedHours?: number | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardMetrics {
  totalHours: number;
  totalProjects: number;
  activeProjects: number;
  totalVolunteers: number;
  sdgsAddressed: number;
  livesTouched: number;
  aiuEarned: number;
}

export interface SDGDistribution {
  goal: number;
  name: string;
  hours: number;
  projects: number;
  volunteers: number;
  percentage: number;
}

export interface TrendData {
  direction: "up" | "down" | "stable";
  value: number;
  percentage: number;
}

// ============================================
// Pagination Types
// ============================================

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// API Response Types
// ============================================

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export interface ApiSuccess<T> {
  data: T;
  message?: string;
}

// ============================================
// SDG Types
// ============================================

export type SDGGoal = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17;

export interface SDGInfo {
  goal: SDGGoal;
  name: string;
  fullName: string;
  color: string;
  icon?: string;
}

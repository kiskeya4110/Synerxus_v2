import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema - unified for both volunteers and organizations
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").notNull(), // 'volunteer' or 'organization'
  displayName: text("display_name"),
  avatar: text("avatar"),
  bio: text("bio"),
  skills: text("skills").array(), // For volunteers
  availability: jsonb("availability"), // For volunteers
  credentials: jsonb("credentials"), // For volunteers
  organizationId: integer("organization_id").references(() => organizations.id), // Link to organization if user is org admin
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organization schema
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  logo: text("logo"),
  website: text("website"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  organizationId: integer("organization_id").references(() => organizations.id),
  status: text("status").notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  location: text("location"),
  goals: jsonb("goals"),
  sdgGoals: integer("sdg_goals").array(),
  coverImage: text("cover_image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Task schema
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
  assigneeId: integer("assignee_id").references(() => users.id),
  status: text("status").notNull(),
  priority: text("priority"),
  dueDate: timestamp("due_date"),
  estimatedHours: integer("estimated_hours"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Volunteer Activity schema
export const volunteerActivities = pgTable("volunteer_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  taskId: integer("task_id").references(() => tasks.id),
  hours: integer("hours").notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  skillsApplied: text("skills_applied").array(),
  outcomes: text("outcomes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Impact Metrics schema
export const impactMetrics = pgTable("impact_metrics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  unit: text("unit"),
  category: text("category"),
  sdgGoal: integer("sdg_goal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project Impact schema
export const projectImpacts = pgTable("project_impacts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  metricId: integer("metric_id").references(() => impactMetrics.id),
  value: integer("value").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  evidenceUrls: text("evidence_urls").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Calendar Event schema
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: integer("project_id").references(() => projects.id),
  eventType: text("event_type").notNull(), // volunteer_shift, meeting, deadline, etc
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  location: text("location"),
  attendees: integer("attendees").array(), // user IDs
  isRecurring: boolean("is_recurring").default(false),
  recurrenceRule: text("recurrence_rule"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Volunteer Opportunities schema
export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  requiredSkills: text("required_skills").array(),
  location: text("location"),
  isRemote: boolean("is_remote").default(false),
  timeCommitment: text("time_commitment"), // e.g., "10 hours/week", "Weekend only"
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  volunteersNeeded: integer("volunteers_needed").default(1),
  status: text("status").notNull().default("open"), // open, closed, filled
  category: text("category"), // healthcare, education, environment, etc.
  sdgGoals: integer("sdg_goals").array(),
  benefits: text("benefits"), // What volunteers will gain
  requirements: text("requirements"), // Specific requirements or qualifications
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Applications schema - volunteers applying to opportunities
export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id).notNull(),
  volunteerId: integer("volunteer_id").references(() => users.id).notNull(),
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, withdrawn
  coverLetter: text("cover_letter"),
  matchScore: integer("match_score"), // AI-calculated match score (0-100)
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  notes: text("notes"), // Organization's notes about the application
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Volunteer Profiles - Extended volunteer information
export const volunteerProfiles = pgTable("volunteer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  location: text("location"),
  languages: text("languages").array(),
  interests: text("interests").array(),
  experience: jsonb("experience"), // Array of experience objects
  education: jsonb("education"), // Array of education objects
  preferredCauses: text("preferred_causes").array(),
  weeklyAvailability: integer("weekly_availability"), // hours per week
  preferredWorkStyle: text("preferred_work_style"), // remote, in-person, hybrid
  achievements: text("achievements").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organization Profiles - Extended organization information
export const organizationProfiles = pgTable("organization_profiles", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull().unique(),
  missionStatement: text("mission_statement"),
  focusAreas: text("focus_areas").array(),
  size: text("size"), // small, medium, large
  yearFounded: integer("year_founded"),
  impactStats: jsonb("impact_stats"),
  socialMedia: jsonb("social_media"),
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Create insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVolunteerActivitySchema = createInsertSchema(volunteerActivities).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertImpactMetricSchema = createInsertSchema(impactMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProjectImpactSchema = createInsertSchema(projectImpacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertOpportunitySchema = createInsertSchema(opportunities).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVolunteerProfileSchema = createInsertSchema(volunteerProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertOrganizationProfileSchema = createInsertSchema(organizationProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Organization = typeof organizations.$inferSelect;
export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type VolunteerActivity = typeof volunteerActivities.$inferSelect;
export type InsertVolunteerActivity = z.infer<typeof insertVolunteerActivitySchema>;

export type ImpactMetric = typeof impactMetrics.$inferSelect;
export type InsertImpactMetric = z.infer<typeof insertImpactMetricSchema>;

export type ProjectImpact = typeof projectImpacts.$inferSelect;
export type InsertProjectImpact = z.infer<typeof insertProjectImpactSchema>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

export type Opportunity = typeof opportunities.$inferSelect;
export type InsertOpportunity = z.infer<typeof insertOpportunitySchema>;

export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;

export type VolunteerProfile = typeof volunteerProfiles.$inferSelect;
export type InsertVolunteerProfile = z.infer<typeof insertVolunteerProfileSchema>;

export type OrganizationProfile = typeof organizationProfiles.$inferSelect;
export type InsertOrganizationProfile = z.infer<typeof insertOrganizationProfileSchema>;

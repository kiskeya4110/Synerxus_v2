import { pgTable, text, serial, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatar: text("avatar"),
  bio: text("bio"),
  skills: text("skills").array(),
  availability: jsonb("availability"),
  credentials: jsonb("credentials"),
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

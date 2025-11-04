import { pgTable, text, serial, integer, timestamp, boolean, jsonb, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema - unified for both volunteers and organizations
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").unique(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional since Firebase handles auth
  userType: text("user_type"), // 'volunteer' or 'organization' - nullable until intake completed
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
  completionPercentage: integer("completion_percentage").default(0),
  aiTrackingEnabled: boolean("ai_tracking_enabled").default(false),
  completionPreferences: jsonb("completion_preferences"),
  // Matching algorithm fields (from Core Opportunity Form)
  requiredSkills: text("required_skills").array(), // Skills needed (35% weight in matching)
  optionalSkills: text("optional_skills").array(), // Nice to have skills
  experienceLevel: text("experience_level"), // entry-level, intermediate, expert
  engagementType: text("engagement_type"), // remote, in-person, hybrid
  // Time commitment fields
  commitmentType: text("commitment_type"), // ongoing, project-based, event
  ongoingHoursPerWeek: integer("ongoing_hours_per_week"), // For ongoing commitments
  projectTotalHours: integer("project_total_hours"), // For project-based work
  totalHoursLogged: integer("total_hours_logged").default(0), // Actual hours logged by volunteers
  // Impact tracking fields
  primarySdg: integer("primary_sdg"), // Main SDG alignment for the project
  impactMetricName: text("impact_metric_name"), // e.g., "Students Tutored", "Trees Planted"
  impactMetricUnit: text("impact_metric_unit"), // e.g., "students", "trees"
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
  optionalSkills: text("optional_skills").array(), // Nice to have skills
  location: text("location"),
  isRemote: boolean("is_remote").default(false),
  engagementType: text("engagement_type"), // remote, in-person, hybrid
  timeCommitment: text("time_commitment"), // e.g., "10 hours/week", "Weekend only"
  commitmentType: text("commitment_type"), // ongoing, project-based, event
  ongoingHoursPerWeek: integer("ongoing_hours_per_week"),
  projectTotalHours: integer("project_total_hours"),
  eventDate: timestamp("event_date"),
  eventStartTime: text("event_start_time"),
  eventEndTime: text("event_end_time"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  volunteersNeeded: integer("volunteers_needed").default(1),
  status: text("status").notNull().default("open"), // open, closed, filled
  category: text("category"), // healthcare, education, environment, etc.
  sdgGoals: integer("sdg_goals").array(),
  primarySdg: integer("primary_sdg"), // Main SDG alignment for matching
  impactMetricName: text("impact_metric_name"), // e.g., "Students Tutored"
  impactMetricUnit: text("impact_metric_unit"), // e.g., "students"
  benefits: text("benefits"), // What volunteers will gain
  requirements: text("requirements"), // Specific requirements or qualifications
  isUrgent: boolean("is_urgent").default(false), // For urgent needs/events
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
  city: text("city"),
  country: text("country"),
  languages: text("languages").array(),
  skills: text("skills").array(),
  interests: text("interests").array(),
  experience: jsonb("experience"), // Array of experience objects
  education: jsonb("education"), // Array of education objects
  preferredCauses: text("preferred_causes").array(),
  weeklyAvailability: integer("weekly_availability"), // hours per week
  preferredWorkStyle: text("preferred_work_style"), // remote, in-person, hybrid
  preferredSdgs: integer("preferred_sdgs").array(), // SDG goals the volunteer cares about
  motivations: text("motivations"), // Why they want to volunteer
  achievements: text("achievements").array(),
  phoneNumber: text("phone_number"),
  emergencyContact: jsonb("emergency_contact"), // {name, phone, relationship}
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Organization Profiles - Extended organization information
export const organizationProfiles = pgTable("organization_profiles", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id).notNull().unique(),
  missionStatement: text("mission_statement"),
  focusAreas: text("focus_areas").array(),
  organizationType: text("organization_type"), // nonprofit, NGO, social enterprise, etc.
  size: text("size"), // small, medium, large
  yearFounded: integer("year_founded"),
  taxId: text("tax_id"), // For verification
  registrationNumber: text("registration_number"),
  primarySdgs: integer("primary_sdgs").array(), // Main SDG focus areas
  geographicScope: text("geographic_scope"), // local, regional, national, international
  targetBeneficiaries: text("target_beneficiaries"), // Who they serve
  volunteerNeeds: text("volunteer_needs").array(), // Types of volunteers they need
  impactStats: jsonb("impact_stats"),
  socialMedia: jsonb("social_media"),
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project Assignments - Track volunteer-project relationships
export const projectAssignments = pgTable("project_assignments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  volunteerId: integer("volunteer_id").references(() => users.id).notNull(),
  role: text("role"), // Team Lead, Contributor, Coordinator, etc.
  status: text("status").notNull().default("active"), // active, completed, on-hold
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  hoursCommitted: integer("hours_committed"),
  hoursCompleted: integer("hours_completed").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Volunteers - Simplified volunteer schema for matching system
export const volunteers = pgTable("volunteers", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  profilePhotoUrl: text("profile_photo_url"),
  skills: text("skills").array().notNull(),
  interests: text("interests").array().notNull(),
  location: text("location").notNull(),
  sdgGoals: integer("sdg_goals").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Matchable Organizations - Organizations for matching with volunteers
export const matchableOrganizations = pgTable("matchable_organizations", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  profilePhotoUrl: text("profile_photo_url"),
  mission: text("mission").notNull(),
  needs: text("needs").array().notNull(),
  sdgFocus: integer("sdg_focus").array().notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Matches - Volunteer-Organization matches
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  volunteerId: text("volunteer_id").references(() => volunteers.id).notNull(),
  organizationId: text("organization_id").references(() => matchableOrganizations.id).notNull(),
  score: doublePrecision("score").notNull(),
  matchedOn: timestamp("matched_on").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  // Unique constraint: one match per volunteer-organization pair
  uniqueVolunteerOrg: uniqueIndex("unique_volunteer_org_match").on(table.volunteerId, table.organizationId),
}));

// Notifications - User notifications for SDG matches and other events
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'sdg_match', 'volunteer_joined', 'project_update', etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedUserId: integer("related_user_id").references(() => users.id), // The user this notification is about
  relatedEntityType: text("related_entity_type"), // 'project', 'opportunity', 'user', etc.
  relatedEntityId: integer("related_entity_id"), // ID of the related entity
  sdgGoals: integer("sdg_goals").array(), // SDGs related to this notification
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Messages - Communication between organizations and volunteers
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  projectId: integer("project_id").references(() => projects.id), // Optional project context
  messageType: text("message_type").notNull().default("general"), // general, project_invite, project_removal, volunteer_request
  read: boolean("read").default(false).notNull(),
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

export const insertTaskSchema = createInsertSchema(tasks)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    dueDate: z.coerce.date().optional().nullable()
  });

export const insertVolunteerActivitySchema = createInsertSchema(volunteerActivities)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    date: z.coerce.date(),
  });

export const insertImpactMetricSchema = createInsertSchema(impactMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertProjectImpactSchema = createInsertSchema(projectImpacts)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    date: z.coerce.date(),
  });

export const insertCalendarEventSchema = createInsertSchema(calendarEvents)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    startTime: z.coerce.date(),
    endTime: z.coerce.date(),
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

export const insertProjectAssignmentSchema = createInsertSchema(projectAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVolunteerSchema = createInsertSchema(volunteers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMatchableOrganizationSchema = createInsertSchema(matchableOrganizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMatchSchema = createInsertSchema(matches).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
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

export type ProjectAssignment = typeof projectAssignments.$inferSelect;
export type InsertProjectAssignment = z.infer<typeof insertProjectAssignmentSchema>;

export type Volunteer = typeof volunteers.$inferSelect;
export type InsertVolunteer = z.infer<typeof insertVolunteerSchema>;

export type MatchableOrganization = typeof matchableOrganizations.$inferSelect;
export type InsertMatchableOrganization = z.infer<typeof insertMatchableOrganizationSchema>;

export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

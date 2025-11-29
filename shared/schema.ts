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
  primarySdgs: integer("primary_sdgs").array(), // Organization's selected primary SDG focus areas
  needs: text("needs").array(), // Organization's volunteer needs
  goals: text("goals"), // Organization's goals/mission beyond just mission statement
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
  // AI Matching override fields (inherit from project if not set)
  requiredSkillsOverride: text("required_skills_override").array(),
  sdgGoalsOverride: integer("sdg_goals_override").array(),
  isRemoteOverride: boolean("is_remote_override"),
  locationOverride: text("location_override"),
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
  // Deduplication fields
  outcomeType: text("outcome_type").default("individual"), // individual, shared, system
  role: text("role").default("support"), // lead, support, observer
  verificationStatus: text("verification_status").default("pending"), // pending, approved, rejected
  evidenceUrls: text("evidence_urls").array(), // URLs for photo/geo evidence
  dedupGroupId: integer("dedup_group_id"), // Groups duplicated impacts together
  isDuplicated: boolean("is_duplicated").default(false), // Flag if this is a duplicate
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
  userId: integer("user_id").references(() => users.id), // Track who logged it
  value: integer("value").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  evidenceUrls: text("evidence_urls").array(),
  // Deduplication fields
  outcomeType: text("outcome_type").default("individual"), // individual, shared, system
  role: text("role").default("support"), // lead, support, observer
  verificationStatus: text("verification_status").default("pending"), // pending, approved, rejected
  dedupGroupId: integer("dedup_group_id"), // Groups duplicated impacts together
  isDuplicated: boolean("is_duplicated").default(false), // Flag if this is a duplicate
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
  resumeUrl: text("resume_url"), // URL or path to uploaded resume
  matchScore: integer("match_score"), // AI-calculated match score (0-100)
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  notes: text("notes"), // Organization's notes about the application
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Saved Opportunities - track opportunities that volunteers have saved for later
export const savedOpportunities = pgTable("saved_opportunities", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id).notNull(),
  volunteerId: integer("volunteer_id").references(() => users.id).notNull(),
  savedAt: timestamp("saved_at").defaultNow().notNull(),
  notes: text("notes"), // Personal notes about why they saved it
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Rejected Opportunities - track opportunities that volunteers have explicitly rejected
export const rejectedOpportunities = pgTable("rejected_opportunities", {
  id: serial("id").primaryKey(),
  opportunityId: integer("opportunity_id").references(() => opportunities.id).notNull(),
  volunteerId: integer("volunteer_id").references(() => users.id).notNull(),
  rejectedAt: timestamp("rejected_at").defaultNow().notNull(),
  reason: text("reason"), // Optional reason for rejection
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Feedback - MVP Feedback Loop for learning and optimization
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // "volunteer" or "organization"
  senderId: integer("sender_id").references(() => users.id).notNull(),
  receiverId: integer("receiver_id").references(() => users.id).notNull(),
  applicationId: integer("application_id").references(() => applications.id),
  assignmentId: integer("assignment_id").references(() => projectAssignments.id),
  rating: integer("rating").notNull(), // 1-5 star rating
  fitQuestion: text("fit_question"), // "Was the volunteer a Strong Fit?" or "Would you volunteer again?"
  fitResponse: text("fit_response"), // yes, no, maybe
  additionalComments: text("additional_comments"), // Optional free-form feedback
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Badges - Gamification achievements for volunteers and organizations
export const badges = pgTable("badges", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "First Step", "Century Club", "Impact Champion"
  description: text("description").notNull(),
  icon: text("icon"), // Emoji or icon identifier
  category: text("category").notNull(), // volunteer, organization, team
  tier: text("tier").default("bronze"), // bronze, silver, gold, platinum
  condition: text("condition").notNull(), // Description of how to earn
  thresholdType: text("threshold_type"), // hours, tasks, impacts, streak, projects
  thresholdValue: integer("threshold_value"), // Numeric value to reach
  displayOrder: integer("display_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Badges - Track which badges a volunteer or organization has earned
export const userBadges = pgTable("user_badges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  badgeId: integer("badge_id").references(() => badges.id).notNull(),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
  progressPercentage: integer("progress_percentage").default(0), // For in-progress badges
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserBadge: uniqueIndex("unique_user_badge").on(table.userId, table.badgeId),
}));

// Leaderboard - Aggregate volunteer/organization stats for ranking
export const leaderboardStats = pgTable("leaderboard_stats", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  userType: text("user_type").notNull(), // volunteer, organization
  organizationId: integer("organization_id").references(() => organizations.id),
  totalHours: integer("total_hours").default(0),
  tasksCompleted: integer("tasks_completed").default(0),
  projectsCompleted: integer("projects_completed").default(0),
  impactsLogged: integer("impacts_logged").default(0),
  weeklyStreak: integer("weekly_streak").default(0),
  maxStreak: integer("max_streak").default(0),
  totalPoints: integer("total_points").default(0), // Gamification points
  badgesEarned: integer("badges_earned").default(0),
  lastActivityDate: timestamp("last_activity_date"),
  rank: integer("rank"), // Leaderboard rank (1st, 2nd, etc.)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Volunteer Spotlights - Feature showcasing a volunteer story each week
export const volunteerSpotlights = pgTable("volunteer_spotlights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  weekStartDate: timestamp("week_start_date").notNull(), // Start of the week
  story: text("story").notNull(), // Their volunteer story/impact
  impact: text("impact"), // Key impact they created
  photoUrl: text("photo_url"), // Spotlight photo
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User Data Audit Logs - Track all changes to user data for integrity monitoring
export const userDataAuditLogs = pgTable("user_data_audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  action: text("action").notNull(), // create, update, delete, name_mismatch, data_sync
  tableName: text("table_name").notNull(), // Which table was affected
  recordId: integer("record_id"), // ID of the affected record
  previousData: jsonb("previous_data"), // Snapshot before change
  newData: jsonb("new_data"), // Snapshot after change
  discrepancyType: text("discrepancy_type"), // name_mismatch, id_mismatch, data_conflict
  discrepancyDetails: text("discrepancy_details"), // Description of the issue
  resolvedAt: timestamp("resolved_at"), // When the discrepancy was resolved
  resolvedBy: integer("resolved_by").references(() => users.id), // Who resolved it
  ipAddress: text("ip_address"), // Client IP for security tracking
  userAgent: text("user_agent"), // Browser/client info
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CSR Partners - Corporate partners onboarded for volunteer program management
export const csrPartners = pgTable("csr_partners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(), // Corporate admin user who owns this partner
  companyName: text("company_name").notNull(),
  contactEmail: text("contact_email").notNull(),
  contactPhone: text("contact_phone"),
  industryType: text("industry_type"), // Technology, Finance, Healthcare, etc.
  employeeCount: integer("employee_count"),
  annualCSRBudget: doublePrecision("annual_csr_budget"),
  primarySdgs: integer("primary_sdgs").array(), // CSR focus areas
  rosterSyncStatus: text("roster_sync_status").default("pending"), // pending, synced, failed
  lastRosterSyncDate: timestamp("last_roster_sync_date"),
  vtoTrackingEnabled: boolean("vto_tracking_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Employee Engagement - Track which employees volunteered on which projects
export const employeeEngagement = pgTable("employee_engagement", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => csrPartners.id).notNull(),
  employeeEmail: text("employee_email").notNull(),
  employeeName: text("employee_name"),
  projectId: integer("project_id").references(() => projects.id),
  hoursVolunteered: integer("hours_volunteered").default(0),
  engagementType: text("engagement_type"), // vto (Volunteer Time Off), erg (Employee Resource Group), skills-based
  impactScore: integer("impact_score").default(0), // 0-100 rating
  completionStatus: text("completion_status").default("in-progress"), // in-progress, completed, pending
  certificateIssued: boolean("certificate_issued").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// CSR Challenges - Gamified challenges aligned with SDGs
export const csrChallenges = pgTable("csr_challenges", {
  id: serial("id").primaryKey(),
  partnerId: integer("partner_id").references(() => csrPartners.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  sdgGoal: integer("sdg_goal").notNull(), // Primary SDG alignment
  targetHours: integer("target_hours"), // Total hours to reach
  targetParticipants: integer("target_participants"), // Number of employees
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rewardType: text("reward_type"), // points, certificate, badge, recognition
  rewardValue: text("reward_value"), // Description of reward
  currentHours: integer("current_hours").default(0),
  currentParticipants: integer("current_participants").default(0),
  status: text("status").default("active"), // active, completed, paused
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Project Budget Links - Connect projects to company budget lines for ROI tracking
export const projectBudgetLinks = pgTable("project_budget_links", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  partnerId: integer("partner_id").references(() => csrPartners.id).notNull(),
  budgetLineItem: text("budget_line_item"), // e.g., "Community Outreach Q3 2024"
  allocatedBudget: doublePrecision("allocated_budget"), // Dollar amount
  estimatedRoi: doublePrecision("estimated_roi"), // Expected return (dollar value of impact)
  actualRoi: doublePrecision("actual_roi"), // Calculated from volunteer hours and outcomes
  volunteerHoursValue: doublePrecision("volunteer_hours_value"), // $/hour rate
  attributedTo: text("attributed_to").array(), // List of initiatives/programs
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Verified Outputs - Audit-ready outcomes with verification status
export const verifiedOutputs = pgTable("verified_outputs", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").references(() => volunteerActivities.id),
  partnerId: integer("partner_id").references(() => csrPartners.id),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  outputType: text("output_type").notNull(), // hours, people_served, outcomes_achieved
  outputValue: integer("output_value").notNull(),
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  verifiedBy: integer("verified_by").references(() => users.id), // Who verified it
  verifiedAt: timestamp("verified_at"),
  evidence: jsonb("evidence"), // {photoUrl, documentUrl, notes}
  auditTrail: jsonb("audit_trail"), // {timestamp, action, userId}
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Volunteer Employer Links - Connect volunteers to their corporate employers
export const volunteerEmployerLinks = pgTable("volunteer_employer_links", {
  id: serial("id").primaryKey(),
  volunteerId: integer("volunteer_id").references(() => volunteerProfiles.id).notNull(),
  partnerId: integer("partner_id").references(() => csrPartners.id).notNull(),
  employeeId: text("employee_id"), // Company's employee ID
  department: text("department"), // e.g., "Engineering", "HR"
  jobTitle: text("job_title"), // Employee's title at company
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Matching Weights - Admin panel for simple weight adjustments (Optimization Layer)
export const matchingWeights = pgTable("matching_weights", {
  id: serial("id").primaryKey(),
  skillWeight: doublePrecision("skill_weight").default(0.40), // Skill Match: 40%
  availabilityWeight: doublePrecision("availability_weight").default(0.30), // Availability: 30%
  sdgWeight: doublePrecision("sdg_weight").default(0.20), // SDG/Mission: 20%
  locationWeight: doublePrecision("location_weight").default(0.10), // Location: 10%
  updatedBy: integer("updated_by").references(() => users.id), // Admin who made the change
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Volunteer Profiles - Extended volunteer information
export const volunteerProfiles = pgTable("volunteer_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(),
  volunteerName: text("volunteer_name"), // Full name
  professionalTitle: text("professional_title"), // e.g., Data Scientist, Marketing Manager
  yearsOfExperience: text("years_of_experience"), // e.g., "1-2 years", "3-5 years"
  linkedinProfile: text("linkedin_profile"), // LinkedIn URL
  location: text("location"),
  city: text("city"),
  country: text("country"),
  languages: text("languages").array(),
  skills: text("skills").array(),
  skillRatings: jsonb("skill_ratings"), // { skillName: percentage } for self-assessed proficiency
  interests: text("interests").array(),
  experience: jsonb("experience"), // Array of experience objects
  education: jsonb("education"), // Array of education objects
  preferredCauses: text("preferred_causes").array(),
  weeklyAvailability: integer("weekly_availability"), // hours per week
  availability: jsonb("availability"), // Schedule: [{day, startTime, endTime}]
  timezone: text("timezone"), // e.g., "America/New_York"
  preferredCommitment: text("preferred_commitment"), // one-time, short-term, long-term, flexible
  preferredWorkStyle: text("preferred_work_style"), // remote, in-person, hybrid
  preferredSdgs: integer("preferred_sdgs").array(), // SDG goals the volunteer cares about
  matchingPriorities: jsonb("matching_priorities"), // {skillsMatch: 5, causeAlignment: 5, timeFlexibility: 5, geographicPreference: 5, impactPotential: 5}
  motivations: text("motivations"), // Why they want to volunteer
  achievements: text("achievements").array(),
  phoneNumber: text("phone_number"),
  emergencyContact: jsonb("emergency_contact"), // {name, phone, relationship}
  resumeUrl: text("resume_url"), // URL or path to default resume
  profilePhotoUrl: text("profile_photo_url"), // Profile picture URL
  overallRating: doublePrecision("overall_rating").default(0), // Overall volunteer rating (0-5 stars)
  emailDigestEnabled: boolean("email_digest_enabled").default(true), // Weekly email digests
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
  organizationLegalName: text("organization_legal_name"), // Full legal registration name
  commonName: text("common_name"), // Public-facing name (DBA)
  size: text("size"), // small, medium, large
  yearFounded: integer("year_founded"),
  taxId: text("tax_id"), // For verification
  registrationNumber: text("registration_number"),
  registrationStatus: text("registration_status"), // registered, pending, informal
  primarySdgs: integer("primary_sdgs").array(), // Main SDG focus areas
  geographicScope: text("geographic_scope"), // local, regional, national, international
  geographicLocation: text("geographic_location"), // City/Region of operation
  languages: text("languages").array(), // Languages spoken in organization
  targetBeneficiaries: text("target_beneficiaries"), // Who they serve
  volunteerNeeds: text("volunteer_needs").array(), // Types of volunteers they need
  requiredSkills: text("required_skills").array(), // Specific skills needed
  preferredVolunteerType: text("preferred_volunteer_type"), // local, diaspora, remote, on-site
  minimumCommitment: text("minimum_commitment"), // hours/week or duration
  languageRequirements: text("language_requirements"),
  techRequirements: text("tech_requirements"), // phone, laptop, internet required
  reportingPreference: text("reporting_preference"), // PDF, dashboard, infographic, narrative
  reportingFrequency: text("reporting_frequency"), // monthly, quarterly, annually
  willingToShareData: boolean("willing_to_share_data").default(false),
  willingForImpactVerification: boolean("willing_for_impact_verification").default(false),
  cobranded: boolean("cobranded").default(false), // Open to co-branded CSR campaigns
  diasporaEngagement: boolean("diaspora_engagement").default(false),
  preferredCommunication: text("preferred_communication").array(), // email, whatsapp, zoom, etc.
  timezone: text("timezone"), // Organization timezone
  bestTimeToConnect: text("best_time_to_connect"), // Preferred contact hours
  impactStats: jsonb("impact_stats"),
  socialMedia: jsonb("social_media"), // {facebook, twitter, instagram, linkedIn, website}
  websiteUrl: text("website_url"),
  verificationStatus: text("verification_status").default("pending"), // pending, verified, rejected
  emailDigestEnabled: boolean("email_digest_enabled").default(true), // Weekly email digests
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
  status: text("status").notNull().default("pending"), // pending, active, completed, on-hold, declined
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  respondedAt: timestamp("responded_at"), // When volunteer accepted/declined
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
  logo: text("logo"),
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

export const insertProjectSchema = createInsertSchema(projects)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    startDate: z.union([z.coerce.date(), z.literal(""), z.null(), z.undefined()]).optional().transform(val => val === "" ? null : val),
    endDate: z.union([z.coerce.date(), z.literal(""), z.null(), z.undefined()]).optional().transform(val => val === "" ? null : val),
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

export const insertOpportunitySchema = createInsertSchema(opportunities)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true
  })
  .extend({
    eventDate: z.union([z.string(), z.date(), z.literal(""), z.null(), z.undefined()]).optional().transform(val => {
      if (val === "" || val === null || val === undefined) return null;
      if (typeof val === 'string') return val; // Return string as-is for PostgreSQL
      if (val instanceof Date) return val.toISOString(); // Convert Date to string
      return val;
    }),
    startDate: z.union([z.string(), z.date(), z.literal(""), z.null(), z.undefined()]).optional().transform(val => {
      if (val === "" || val === null || val === undefined) return null;
      if (typeof val === 'string') return val; // Return string as-is for PostgreSQL
      if (val instanceof Date) return val.toISOString(); // Convert Date to string
      return val;
    }),
    endDate: z.union([z.string(), z.date(), z.literal(""), z.null(), z.undefined()]).optional().transform(val => {
      if (val === "" || val === null || val === undefined) return null;
      if (typeof val === 'string') return val; // Return string as-is for PostgreSQL
      if (val instanceof Date) return val.toISOString(); // Convert Date to string
      return val;
    }),
  });

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertSavedOpportunitySchema = createInsertSchema(savedOpportunities).omit({
  id: true,
  createdAt: true
});

export const insertRejectedOpportunitySchema = createInsertSchema(rejectedOpportunities).omit({
  id: true,
  createdAt: true
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

export const insertBadgeSchema = createInsertSchema(badges).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({
  id: true,
  createdAt: true,
});

export const insertLeaderboardStatsSchema = createInsertSchema(leaderboardStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVolunteerSpotlightSchema = createInsertSchema(volunteerSpotlights).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  weekStartDate: z.coerce.date(),
});

export const insertUserDataAuditLogSchema = createInsertSchema(userDataAuditLogs).omit({
  id: true,
  createdAt: true
});

export const insertCSRPartnerSchema = createInsertSchema(csrPartners).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertEmployeeEngagementSchema = createInsertSchema(employeeEngagement).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertCSRChallengeSchema = createInsertSchema(csrChallenges).omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export const insertProjectBudgetLinkSchema = createInsertSchema(projectBudgetLinks).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertVerifiedOutputSchema = createInsertSchema(verifiedOutputs).omit({
  id: true,
  createdAt: true
});

export const insertVolunteerEmployerLinkSchema = createInsertSchema(volunteerEmployerLinks).omit({
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

export type SavedOpportunity = typeof savedOpportunities.$inferSelect;
export type InsertSavedOpportunity = z.infer<typeof insertSavedOpportunitySchema>;

export type RejectedOpportunity = typeof rejectedOpportunities.$inferSelect;
export type InsertRejectedOpportunity = z.infer<typeof insertRejectedOpportunitySchema>;

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

export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;

export type LeaderboardStats = typeof leaderboardStats.$inferSelect;
export type InsertLeaderboardStats = z.infer<typeof insertLeaderboardStatsSchema>;

export type VolunteerSpotlight = typeof volunteerSpotlights.$inferSelect;
export type InsertVolunteerSpotlight = z.infer<typeof insertVolunteerSpotlightSchema>;

export type UserDataAuditLog = typeof userDataAuditLogs.$inferSelect;
export type InsertUserDataAuditLog = z.infer<typeof insertUserDataAuditLogSchema>;

export type CSRPartner = typeof csrPartners.$inferSelect;
export type InsertCSRPartner = z.infer<typeof insertCSRPartnerSchema>;

export type EmployeeEngagement = typeof employeeEngagement.$inferSelect;
export type InsertEmployeeEngagement = z.infer<typeof insertEmployeeEngagementSchema>;

export type CSRChallenge = typeof csrChallenges.$inferSelect;
export type InsertCSRChallenge = z.infer<typeof insertCSRChallengeSchema>;

export type ProjectBudgetLink = typeof projectBudgetLinks.$inferSelect;
export type InsertProjectBudgetLink = z.infer<typeof insertProjectBudgetLinkSchema>;

export type VerifiedOutput = typeof verifiedOutputs.$inferSelect;
export type InsertVerifiedOutput = z.infer<typeof insertVerifiedOutputSchema>;

export type VolunteerEmployerLink = typeof volunteerEmployerLinks.$inferSelect;
export type InsertVolunteerEmployerLink = z.infer<typeof insertVolunteerEmployerLinkSchema>;

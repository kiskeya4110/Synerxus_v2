import {
  users,
  organizations,
  organizationMembers,
  projects,
  tasks,
  volunteerActivities,
  impactMetrics,
  projectImpacts,
  projectAssignments,
  volunteers,
  matchableOrganizations,
  matches,
  calendarEvents,
  volunteerProfiles,
  organizationProfiles,
  opportunities,
  applications,
  savedOpportunities,
  rejectedOpportunities,
  conversationThreads,
  orgMessages,
  notifications,
  userDataAuditLogs,
  csrPartners,
  employeeEngagement,
  csrChallenges,
  projectBudgetLinks,
  verifiedOutputs,
  volunteerEmployerLinks,
  matchingWeights,
  matchAnalytics,
  employeeCommitments,
  employeeActivityLogs,
  employeeMilestones,
  csrCommitmentGoals,
  volunteerStories,
  storyLikes,
  type User,
  type InsertUser,
  type Organization,
  type InsertOrganization,
  type OrganizationMember,
  type InsertOrganizationMember,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type VolunteerActivity,
  type InsertVolunteerActivity,
  type ImpactMetric,
  type InsertImpactMetric,
  type ProjectImpact,
  type InsertProjectImpact,
  type ProjectAssignment,
  type InsertProjectAssignment,
  type Volunteer,
  type InsertVolunteer,
  type MatchableOrganization,
  type InsertMatchableOrganization,
  type Match,
  type InsertMatch,
  type CalendarEvent,
  type InsertCalendarEvent,
  type VolunteerProfile,
  type InsertVolunteerProfile,
  type OrganizationProfile,
  type InsertOrganizationProfile,
  type Opportunity,
  type InsertOpportunity,
  type Application,
  type InsertApplication,
  type SavedOpportunity,
  type InsertSavedOpportunity,
  type RejectedOpportunity,
  type InsertRejectedOpportunity,
  type ConversationThread,
  type InsertConversationThread,
  type OrgMessage,
  type InsertOrgMessage,
  type Notification,
  type InsertNotification,
  type UserDataAuditLog,
  type InsertUserDataAuditLog,
  type CSRPartner,
  type InsertCSRPartner,
  type EmployeeEngagement,
  type InsertEmployeeEngagement,
  type CSRChallenge,
  type InsertCSRChallenge,
  type ProjectBudgetLink,
  type InsertProjectBudgetLink,
  type VerifiedOutput,
  type InsertVerifiedOutput,
  type VolunteerEmployerLink,
  type InsertVolunteerEmployerLink,
  type MatchAnalytics,
  type InsertMatchAnalytics,
  type EmployeeCommitment,
  type InsertEmployeeCommitment,
  type EmployeeActivityLog,
  type InsertEmployeeActivityLog,
  type EmployeeMilestone,
  type InsertEmployeeMilestone,
  type CSRCommitmentGoal,
  type InsertCSRCommitmentGoal,
  type VolunteerStory,
  type InsertVolunteerStory,
  type StoryLike,
  type InsertStoryLike,
  volunteerOrganizationRelationships,
  type VolunteerOrganizationRelationship,
  type InsertVolunteerOrganizationRelationship,
  teamInvitations,
  invitationTemplates,
  type TeamInvitation,
  type InsertTeamInvitation,
  type InvitationTemplate,
  type InsertInvitationTemplate,
  invitationCodes,
  invitationCodeUsage,
  platformSettings,
  type InvitationCode,
  type InsertInvitationCode,
  type InvitationCodeUsage,
  type InsertInvitationCodeUsage,
  type PlatformSetting,
  type InsertPlatformSetting
} from "@shared/schema";
import { calculateMatchScore } from "./matching-algorithm";
import { db, withTransaction, type Transaction } from "./db";
import { eq, and, or, asc, desc, inArray, isNull, isNotNull } from "drizzle-orm";

// Custom error for duplicate project assignments
export class DuplicateAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateAssignmentError";
  }
}

// Define the storage interface with CRUD operations for all entities
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  getUserByOrganizationId(organizationId: number): Promise<User | undefined>;
  listUsersByOrganization(organizationId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;

  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationsByIds(ids: number[]): Promise<Organization[]>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined>;
  listOrganizations(): Promise<Organization[]>;

  // Organization Member operations
  getOrganizationMember(id: number): Promise<OrganizationMember | undefined>;
  getOrganizationMemberByUserAndOrg(userId: number, organizationId: number): Promise<OrganizationMember | undefined>;
  createOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember>;
  updateOrganizationMember(id: number, member: Partial<InsertOrganizationMember>): Promise<OrganizationMember | undefined>;
  deleteOrganizationMember(id: number): Promise<boolean>;
  listOrganizationMembers(organizationId: number): Promise<OrganizationMember[]>;
  listOrganizationsByMember(userId: number): Promise<Organization[]>;

  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  listProjects(): Promise<Project[]>;
  listProjectsByOrganization(organizationId: number): Promise<Project[]>;

  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  listTasks(): Promise<Task[]>;
  listTasksByProject(projectId: number): Promise<Task[]>;
  listTasksByAssignee(assigneeId: number): Promise<Task[]>;

  // Volunteer Activity operations
  getVolunteerActivity(id: number): Promise<VolunteerActivity | undefined>;
  createVolunteerActivity(activity: InsertVolunteerActivity): Promise<VolunteerActivity>;
  updateVolunteerActivity(id: number, activity: Partial<InsertVolunteerActivity>): Promise<VolunteerActivity | undefined>;
  listVolunteerActivities(): Promise<VolunteerActivity[]>;
  listVolunteerActivitiesByUser(userId: number): Promise<VolunteerActivity[]>;
  listVolunteerActivitiesByProject(projectId: number): Promise<VolunteerActivity[]>;

  // Impact Metric operations
  getImpactMetric(id: number): Promise<ImpactMetric | undefined>;
  createImpactMetric(metric: InsertImpactMetric): Promise<ImpactMetric>;
  updateImpactMetric(id: number, metric: Partial<InsertImpactMetric>): Promise<ImpactMetric | undefined>;
  listImpactMetrics(): Promise<ImpactMetric[]>;
  listImpactMetricsByCategory(category: string): Promise<ImpactMetric[]>;
  listImpactMetricsBySDG(sdgGoal: number): Promise<ImpactMetric[]>;

  // Project Impact operations
  getProjectImpact(id: number): Promise<ProjectImpact | undefined>;
  createProjectImpact(impact: InsertProjectImpact): Promise<ProjectImpact>;
  updateProjectImpact(id: number, impact: Partial<InsertProjectImpact>): Promise<ProjectImpact | undefined>;
  listProjectImpacts(): Promise<ProjectImpact[]>;
  listProjectImpactsByProject(projectId: number): Promise<ProjectImpact[]>;
  listProjectImpactsByMetric(metricId: number): Promise<ProjectImpact[]>;

  // Opportunity operations
  getOpportunity(id: number): Promise<any | undefined>;
  createOpportunity(opportunity: any): Promise<any>;
  updateOpportunity(id: number, opportunity: Partial<any>): Promise<any | undefined>;
  listOpportunities(): Promise<any[]>;
  listOpportunitiesByOrganization(organizationId: number): Promise<any[]>;

  // Application operations
  getApplication(id: number): Promise<any | undefined>;
  createApplication(application: any): Promise<any>;
  updateApplication(id: number, application: Partial<any>): Promise<any | undefined>;
  listApplications(): Promise<any[]>;
  listApplicationsByOpportunity(opportunityId: number): Promise<any[]>;
  listApplicationsByVolunteer(volunteerId: number): Promise<any[]>;
  findApplicationByVolunteerAndOpportunity(volunteerId: number, opportunityId: number): Promise<any | undefined>;

  // Volunteer-Organization Relationship operations
  getVolunteerOrganizationRelationship(volunteerId: number, organizationId: number): Promise<VolunteerOrganizationRelationship | undefined>;
  createVolunteerOrganizationRelationship(relationship: InsertVolunteerOrganizationRelationship): Promise<VolunteerOrganizationRelationship>;
  updateVolunteerOrganizationRelationship(id: number, relationship: Partial<InsertVolunteerOrganizationRelationship>): Promise<VolunteerOrganizationRelationship | undefined>;
  listVolunteerRelationshipsByOrganization(organizationId: number): Promise<VolunteerOrganizationRelationship[]>;
  listOrganizationRelationshipsByVolunteer(volunteerId: number): Promise<VolunteerOrganizationRelationship[]>;
  upsertVolunteerOrganizationRelationship(volunteerId: number, organizationId: number, updates: Partial<InsertVolunteerOrganizationRelationship>): Promise<VolunteerOrganizationRelationship>;

  // Saved Opportunity operations
  saveOpportunity(savedOpp: any): Promise<any>;
  unsaveOpportunity(volunteerId: number, opportunityId: number): Promise<void>;
  listSavedOpportunitiesByVolunteer(volunteerId: number): Promise<any[]>;
  isSavedOpportunity(volunteerId: number, opportunityId: number): Promise<boolean>;
  
  // Rejected Opportunity operations
  rejectOpportunity(rejectedOpp: any): Promise<any>;
  unrejectOpportunity(volunteerId: number, opportunityId: number): Promise<void>;
  listRejectedOpportunitiesByVolunteer(volunteerId: number): Promise<any[]>;
  isRejectedOpportunity(volunteerId: number, opportunityId: number): Promise<boolean>;

  // Match score operations
  getMatchScore(opportunityId: number, volunteerId: number): Promise<any>;

  // Project Assignment operations
  getProjectAssignment(id: number): Promise<ProjectAssignment | undefined>;
  findProjectAssignmentByVolunteerProject(volunteerId: number, projectId: number, statuses?: string[]): Promise<ProjectAssignment | undefined>;
  createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  updateProjectAssignment(id: number, assignment: Partial<InsertProjectAssignment>): Promise<ProjectAssignment | undefined>;
  listProjectAssignments(): Promise<ProjectAssignment[]>;
  listProjectAssignmentsByProject(projectId: number): Promise<ProjectAssignment[]>;
  listProjectAssignmentsByVolunteer(volunteerId: number): Promise<ProjectAssignment[]>;
  listProjectAssignmentsByProjectIds(projectIds: number[]): Promise<ProjectAssignment[]>;
  deleteProjectAssignment(id: number): Promise<boolean>;

  // === OPTIMIZED BATCH QUERY METHODS (Hyper-efficiency) ===
  // These methods reduce N+1 queries by fetching filtered data in single queries

  // Batch fetch tasks by multiple project IDs
  listTasksByProjectIds(projectIds: number[]): Promise<Task[]>;

  // Batch fetch activities by multiple project IDs
  listVolunteerActivitiesByProjectIds(projectIds: number[]): Promise<VolunteerActivity[]>;

  // Batch fetch impacts by multiple project IDs
  listProjectImpactsByProjectIds(projectIds: number[]): Promise<ProjectImpact[]>;

  // Batch fetch applications by multiple opportunity IDs
  listApplicationsByOpportunityIds(opportunityIds: number[]): Promise<Application[]>;

  // Volunteer operations (matching system)
  getVolunteer(id: string): Promise<Volunteer | undefined>;
  getVolunteerByEmail(email: string): Promise<Volunteer | undefined>;
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;
  updateVolunteer(id: string, volunteer: Partial<InsertVolunteer>): Promise<Volunteer | undefined>;
  deleteVolunteer(id: string): Promise<boolean>;
  listVolunteers(): Promise<Volunteer[]>;

  // Matchable Organization operations
  getMatchableOrganization(id: string): Promise<MatchableOrganization | undefined>;
  getMatchableOrganizationByEmail(email: string): Promise<MatchableOrganization | undefined>;
  createMatchableOrganization(organization: InsertMatchableOrganization): Promise<MatchableOrganization>;
  updateMatchableOrganization(id: string, organization: Partial<InsertMatchableOrganization>): Promise<MatchableOrganization | undefined>;
  deleteMatchableOrganization(id: string): Promise<boolean>;
  listMatchableOrganizations(): Promise<MatchableOrganization[]>;

  // Match operations
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: number, match: Partial<InsertMatch>): Promise<Match | undefined>;
  upsertMatch(match: InsertMatch): Promise<Match>;
  deleteMatch(id: number): Promise<boolean>;
  listMatches(): Promise<Match[]>;
  listMatchesByVolunteer(volunteerId: string): Promise<Match[]>;
  listMatchesByOrganization(organizationId: string): Promise<Match[]>;

  // Volunteer Profile operations
  getVolunteerProfile(id: number): Promise<VolunteerProfile | undefined>;
  getVolunteerProfileByUserId(userId: number): Promise<VolunteerProfile | undefined>;
  createVolunteerProfile(profile: InsertVolunteerProfile): Promise<VolunteerProfile>;
  updateVolunteerProfile(id: number, profile: Partial<InsertVolunteerProfile>): Promise<VolunteerProfile | undefined>;
  listVolunteerProfiles(): Promise<VolunteerProfile[]>;

  // Organization Profile operations
  getOrganizationProfile(id: number): Promise<OrganizationProfile | undefined>;
  getOrganizationProfileByOrgId(organizationId: number): Promise<OrganizationProfile | undefined>;
  createOrganizationProfile(profile: InsertOrganizationProfile): Promise<OrganizationProfile>;
  updateOrganizationProfile(id: number, profile: Partial<InsertOrganizationProfile>): Promise<OrganizationProfile | undefined>;
  listOrganizationProfiles(): Promise<OrganizationProfile[]>;

  // Calendar Event operations
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined>;
  deleteCalendarEvent(id: number): Promise<boolean>;
  listCalendarEvents(): Promise<CalendarEvent[]>;

  // Conversation Thread operations
  getConversationThread(id: number): Promise<ConversationThread | undefined>;
  createConversationThread(thread: InsertConversationThread): Promise<ConversationThread>;
  updateConversationThread(id: number, thread: Partial<InsertConversationThread>): Promise<ConversationThread | undefined>;
  listConversationThreadsByOrganization(organizationId: number): Promise<ConversationThread[]>;
  listConversationThreadsByVolunteer(volunteerId: number): Promise<ConversationThread[]>;
  getConversationThreadBetween(organizationId: number, volunteerId: number, topic?: string): Promise<ConversationThread | undefined>;
  
  // Message operations (org-volunteer messaging)
  getMessage(id: number): Promise<OrgMessage | undefined>;
  createMessage(message: InsertOrgMessage): Promise<OrgMessage>;
  updateMessage(id: number, message: Partial<InsertOrgMessage>): Promise<OrgMessage | undefined>;
  listMessages(): Promise<OrgMessage[]>;
  listMessagesBySender(senderId: number): Promise<OrgMessage[]>;
  listMessagesByReceiver(receiverId: number): Promise<OrgMessage[]>;
  listMessagesByThread(threadId: number): Promise<OrgMessage[]>;
  listConversation(userId1: number, userId2: number): Promise<OrgMessage[]>;
  markMessageAsRead(id: number): Promise<OrgMessage | undefined>;
  markMessageAsDelivered(id: number): Promise<OrgMessage | undefined>;

  // Notification operations
  getNotification(id: number): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  markNotificationRead(notificationId: number): Promise<Notification | undefined>;

  // User Data Audit Log operations
  createUserDataAuditLog(log: InsertUserDataAuditLog): Promise<UserDataAuditLog>;
  getUserDataAuditLogs(userId: number): Promise<UserDataAuditLog[]>;
  getUnresolvedDiscrepancies(userId?: number): Promise<UserDataAuditLog[]>;
  getDiscrepancyById(id: number): Promise<UserDataAuditLog | undefined>;
  resolveDiscrepancy(id: number, resolvedBy: number): Promise<UserDataAuditLog | undefined>;

  // CSR Partner operations
  createCSRPartner(partner: InsertCSRPartner): Promise<CSRPartner>;
  listCSRPartners(): Promise<CSRPartner[]>;
  getCSRPartner(id: number): Promise<CSRPartner | undefined>;
  updateCSRPartner(id: number, partner: Partial<InsertCSRPartner>): Promise<CSRPartner | undefined>;

  // Employee Engagement operations
  createEmployeeEngagement(engagement: InsertEmployeeEngagement): Promise<EmployeeEngagement>;
  listEmployeeEngagement(): Promise<EmployeeEngagement[]>;
  getEmployeeEngagement(id: number): Promise<EmployeeEngagement | undefined>;
  updateEmployeeEngagement(id: number, engagement: Partial<InsertEmployeeEngagement>): Promise<EmployeeEngagement | undefined>;

  // CSR Challenge operations
  createCSRChallenge(challenge: InsertCSRChallenge): Promise<CSRChallenge>;
  listCSRChallenges(): Promise<CSRChallenge[]>;
  getCSRChallenge(id: number): Promise<CSRChallenge | undefined>;
  updateCSRChallenge(id: number, challenge: Partial<InsertCSRChallenge>): Promise<CSRChallenge | undefined>;

  // Project Budget Link operations
  createProjectBudgetLink(link: InsertProjectBudgetLink): Promise<ProjectBudgetLink>;
  listProjectBudgetLinks(): Promise<ProjectBudgetLink[]>;
  getProjectBudgetLink(id: number): Promise<ProjectBudgetLink | undefined>;
  updateProjectBudgetLink(id: number, link: Partial<InsertProjectBudgetLink>): Promise<ProjectBudgetLink | undefined>;

  // Verified Output operations
  createVerifiedOutput(output: InsertVerifiedOutput): Promise<VerifiedOutput>;
  listVerifiedOutputs(): Promise<VerifiedOutput[]>;
  getVerifiedOutput(id: number): Promise<VerifiedOutput | undefined>;
  updateVerifiedOutput(id: number, output: Partial<InsertVerifiedOutput>): Promise<VerifiedOutput | undefined>;

  // Volunteer Employer Link operations
  createVolunteerEmployerLink(link: InsertVolunteerEmployerLink): Promise<VolunteerEmployerLink>;
  listVolunteerEmployerLinks(): Promise<VolunteerEmployerLink[]>;
  getVolunteerEmployerLink(volunteerId: number): Promise<VolunteerEmployerLink | undefined>;
  updateVolunteerEmployerLink(id: number, link: Partial<InsertVolunteerEmployerLink>): Promise<VolunteerEmployerLink | undefined>;

  // Matching Weights operations (for dynamic weight tuning)
  getLatestMatchingWeights(): Promise<{
    skillWeight: number | null;
    locationWeight: number | null;
    sdgWeight: number | null;
    availabilityWeight: number | null;
  } | undefined>;

  // Match Analytics operations (for feedback loop)
  getMatchAnalytics(volunteerId: number, opportunityId: number): Promise<MatchAnalytics | undefined>;
  createMatchAnalytics(analytics: InsertMatchAnalytics): Promise<MatchAnalytics>;
  updateMatchAnalytics(id: number, analytics: Partial<InsertMatchAnalytics>): Promise<MatchAnalytics | undefined>;
  listMatchAnalytics(): Promise<MatchAnalytics[]>;

  // Volunteer Story operations
  listVolunteerStories(): Promise<VolunteerStory[]>;
  getVolunteerStory(id: number): Promise<VolunteerStory | undefined>;
  createVolunteerStory(story: InsertVolunteerStory): Promise<VolunteerStory>;
  updateVolunteerStory(id: number, story: Partial<InsertVolunteerStory> & { viewsCount?: number; likesCount?: number }): Promise<VolunteerStory | undefined>;
  deleteVolunteerStory(id: number): Promise<boolean>;

  // Story Like operations
  getStoryLike(storyId: number, userId: number): Promise<StoryLike | undefined>;
  createStoryLike(like: InsertStoryLike): Promise<StoryLike>;
  deleteStoryLike(storyId: number, userId: number): Promise<boolean>;

  // Team Invitation operations
  listTeamInvitations(organizationId: number): Promise<TeamInvitation[]>;
  getTeamInvitation(id: number): Promise<TeamInvitation | undefined>;
  getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined>;
  createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  updateTeamInvitation(id: number, invitation: Partial<InsertTeamInvitation>): Promise<TeamInvitation | undefined>;
  deleteTeamInvitation(id: number): Promise<boolean>;

  // Invitation Template operations
  listInvitationTemplates(organizationId?: number): Promise<InvitationTemplate[]>;
  getInvitationTemplate(id: number): Promise<InvitationTemplate | undefined>;
  createInvitationTemplate(template: InsertInvitationTemplate): Promise<InvitationTemplate>;
  updateInvitationTemplate(id: number, template: Partial<InsertInvitationTemplate>): Promise<InvitationTemplate | undefined>;
  deleteInvitationTemplate(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeImpactMetrics();
  }

  private async initializeImpactMetrics() {
    const initialMetrics: InsertImpactMetric[] = [
      {
        name: "Lives Impacted",
        description: "Number of people directly impacted by volunteer activities",
        unit: "people",
        category: "general",
        sdgGoal: 1
      },
      {
        name: "People with Clean Water Access",
        description: "Number of people who gained access to clean water",
        unit: "people",
        category: "water",
        sdgGoal: 6
      },
      {
        name: "Healthcare Services Delivered",
        description: "Number of healthcare services provided",
        unit: "services",
        category: "health",
        sdgGoal: 3
      },
      {
        name: "Students Educated",
        description: "Number of students who received education services",
        unit: "students",
        category: "education",
        sdgGoal: 4
      },
      {
        name: "CO2 Emissions Reduced",
        description: "Amount of CO2 emissions reduced",
        unit: "tons",
        category: "climate",
        sdgGoal: 13
      },
      {
        name: "Meals Provided",
        description: "Number of meals provided to people in need",
        unit: "meals",
        category: "hunger",
        sdgGoal: 2
      }
    ];

    for (const metric of initialMetrics) {
      const [existing] = await db
        .select()
        .from(impactMetrics)
        .where(eq(impactMetrics.name, metric.name));
      
      if (!existing) {
        await this.createImpactMetric(metric);
      }
    }
  }


  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.username, username));
    return result || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result || undefined;
  }

  async getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    return result || undefined;
  }

  async getUserByOrganizationId(organizationId: number): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.organizationId, organizationId));
    return result || undefined;
  }

  async listUsersByOrganization(organizationId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.organizationId, organizationId));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [result] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return result || undefined;
  }

  async listUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    const [result] = await db.select().from(organizations).where(eq(organizations.id, id));
    return result || undefined;
  }

  async getOrganizationsByIds(ids: number[]): Promise<Organization[]> {
    if (ids.length === 0) return [];
    
    // Deduplicate IDs to minimize query parameters
    const uniqueIds = Array.from(new Set(ids));
    
    const results = await db
      .select()
      .from(organizations)
      .where(inArray(organizations.id, uniqueIds));
    
    return results;
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const [organization] = await db.insert(organizations).values(insertOrg).returning();
    return organization;
  }

  async updateOrganization(id: number, orgData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const [result] = await db.update(organizations).set(orgData).where(eq(organizations.id, id)).returning();
    return result || undefined;
  }

  async listOrganizations(): Promise<Organization[]> {
    return await db.select().from(organizations);
  }

  // Organization Member operations
  async getOrganizationMember(id: number): Promise<OrganizationMember | undefined> {
    const [result] = await db.select().from(organizationMembers).where(eq(organizationMembers.id, id));
    return result || undefined;
  }

  async getOrganizationMemberByUserAndOrg(userId: number, organizationId: number): Promise<OrganizationMember | undefined> {
    const [result] = await db.select().from(organizationMembers)
      .where(and(
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.organizationId, organizationId)
      ));
    return result || undefined;
  }

  async createOrganizationMember(member: InsertOrganizationMember): Promise<OrganizationMember> {
    const [result] = await db.insert(organizationMembers).values(member).returning();
    return result;
  }

  async updateOrganizationMember(id: number, member: Partial<InsertOrganizationMember>): Promise<OrganizationMember | undefined> {
    const [result] = await db.update(organizationMembers)
      .set({ ...member, updatedAt: new Date() })
      .where(eq(organizationMembers.id, id))
      .returning();
    return result || undefined;
  }

  async deleteOrganizationMember(id: number): Promise<boolean> {
    const result = await db.delete(organizationMembers).where(eq(organizationMembers.id, id)).returning();
    return result.length > 0;
  }

  async listOrganizationMembers(organizationId: number): Promise<OrganizationMember[]> {
    return await db.select().from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId));
  }

  async listOrganizationsByMember(userId: number): Promise<Organization[]> {
    const memberRecords = await db.select().from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));

    if (memberRecords.length === 0) return [];

    const orgIds = memberRecords.map(m => m.organizationId);
    return await db.select().from(organizations)
      .where(inArray(organizations.id, orgIds));
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    const [result] = await db.select().from(projects).where(eq(projects.id, id));
    return result || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const [result] = await db.update(projects).set(projectData).where(eq(projects.id, id)).returning();
    return result || undefined;
  }

  async listProjects(): Promise<Project[]> {
    return await db.select().from(projects);
  }

  async listProjectsByOrganization(organizationId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.organizationId, organizationId));
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    const [result] = await db.select().from(tasks).where(eq(tasks.id, id));
    return result || undefined;
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const [result] = await db.update(tasks).set(taskData).where(eq(tasks.id, id)).returning();
    return result || undefined;
  }

  async listTasks(): Promise<Task[]> {
    return await db.select().from(tasks);
  }

  async listTasksByProject(projectId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.projectId, projectId));
  }

  async listTasksByAssignee(assigneeId: number): Promise<Task[]> {
    return await db.select().from(tasks).where(eq(tasks.assigneeId, assigneeId));
  }

  // Volunteer Activity operations
  async getVolunteerActivity(id: number): Promise<VolunteerActivity | undefined> {
    const [result] = await db.select().from(volunteerActivities).where(eq(volunteerActivities.id, id));
    return result || undefined;
  }

  async createVolunteerActivity(insertActivity: InsertVolunteerActivity): Promise<VolunteerActivity> {
    const [activity] = await db.insert(volunteerActivities).values(insertActivity).returning();
    return activity;
  }

  async updateVolunteerActivity(id: number, activityData: Partial<InsertVolunteerActivity>): Promise<VolunteerActivity | undefined> {
    const [result] = await db.update(volunteerActivities).set(activityData).where(eq(volunteerActivities.id, id)).returning();
    return result || undefined;
  }

  async listVolunteerActivities(): Promise<VolunteerActivity[]> {
    return await db.select().from(volunteerActivities);
  }

  async listVolunteerActivitiesByUser(userId: number): Promise<VolunteerActivity[]> {
    return await db.select().from(volunteerActivities)
      .where(eq(volunteerActivities.userId, userId))
      .orderBy(desc(volunteerActivities.date));
  }

  async listVolunteerActivitiesByProject(projectId: number): Promise<VolunteerActivity[]> {
    return await db.select().from(volunteerActivities).where(eq(volunteerActivities.projectId, projectId));
  }

  // Impact Metric operations
  async getImpactMetric(id: number): Promise<ImpactMetric | undefined> {
    const [result] = await db.select().from(impactMetrics).where(eq(impactMetrics.id, id));
    return result || undefined;
  }

  async createImpactMetric(insertMetric: InsertImpactMetric): Promise<ImpactMetric> {
    const [metric] = await db.insert(impactMetrics).values(insertMetric).returning();
    return metric;
  }

  async updateImpactMetric(id: number, metricData: Partial<InsertImpactMetric>): Promise<ImpactMetric | undefined> {
    const [result] = await db.update(impactMetrics).set(metricData).where(eq(impactMetrics.id, id)).returning();
    return result || undefined;
  }

  async listImpactMetrics(): Promise<ImpactMetric[]> {
    return await db.select().from(impactMetrics);
  }

  async listImpactMetricsByCategory(category: string): Promise<ImpactMetric[]> {
    return await db.select().from(impactMetrics).where(eq(impactMetrics.category, category));
  }

  async listImpactMetricsBySDG(sdgGoal: number): Promise<ImpactMetric[]> {
    return await db.select().from(impactMetrics).where(eq(impactMetrics.sdgGoal, sdgGoal));
  }

  // Project Impact operations
  async getProjectImpact(id: number): Promise<ProjectImpact | undefined> {
    const [result] = await db.select().from(projectImpacts).where(eq(projectImpacts.id, id));
    return result || undefined;
  }

  async createProjectImpact(insertImpact: InsertProjectImpact): Promise<ProjectImpact> {
    const [impact] = await db.insert(projectImpacts).values(insertImpact).returning();
    return impact;
  }

  async updateProjectImpact(id: number, impactData: Partial<InsertProjectImpact>): Promise<ProjectImpact | undefined> {
    const [result] = await db.update(projectImpacts).set(impactData).where(eq(projectImpacts.id, id)).returning();
    return result || undefined;
  }

  async listProjectImpacts(): Promise<ProjectImpact[]> {
    return await db.select().from(projectImpacts);
  }

  async listProjectImpactsByProject(projectId: number): Promise<ProjectImpact[]> {
    return await db.select().from(projectImpacts).where(eq(projectImpacts.projectId, projectId));
  }

  async listProjectImpactsByMetric(metricId: number): Promise<ProjectImpact[]> {
    return await db.select().from(projectImpacts).where(eq(projectImpacts.metricId, metricId));
  }

  // Opportunity operations
  async getOpportunity(id: number): Promise<Opportunity | undefined> {
    const [result] = await db.select().from(opportunities).where(eq(opportunities.id, id));
    return result || undefined;
  }

  async createOpportunity(opportunity: InsertOpportunity): Promise<Opportunity> {
    const data: any = { ...opportunity };
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate);
    }
    if (data.endDate && typeof data.endDate === 'string') {
      data.endDate = new Date(data.endDate);
    }
    if (data.eventDate && typeof data.eventDate === 'string') {
      data.eventDate = new Date(data.eventDate);
    }
    const [newOpportunity] = await db.insert(opportunities).values(data).returning();
    return newOpportunity;
  }

  async updateOpportunity(id: number, opportunity: Partial<InsertOpportunity>): Promise<Opportunity | undefined> {
    const data: any = { ...opportunity };
    if (data.startDate && typeof data.startDate === 'string') {
      data.startDate = new Date(data.startDate);
    }
    if (data.endDate && typeof data.endDate === 'string') {
      data.endDate = new Date(data.endDate);
    }
    if (data.eventDate && typeof data.eventDate === 'string') {
      data.eventDate = new Date(data.eventDate);
    }
    const [result] = await db.update(opportunities).set(data).where(eq(opportunities.id, id)).returning();
    return result || undefined;
  }

  async listOpportunities(): Promise<Opportunity[]> {
    return await db.select().from(opportunities);
  }

  async listOpportunitiesByOrganization(organizationId: number): Promise<Opportunity[]> {
    return await db.select().from(opportunities).where(eq(opportunities.organizationId, organizationId));
  }

  // Application operations
  async getApplication(id: number): Promise<Application | undefined> {
    const [result] = await db.select().from(applications).where(eq(applications.id, id));
    return result || undefined;
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const [newApplication] = await db.insert(applications).values(application).returning();
    return newApplication;
  }

  async updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application | undefined> {
    const [result] = await db.update(applications).set(application).where(eq(applications.id, id)).returning();
    return result || undefined;
  }

  async listApplications(): Promise<Application[]> {
    return await db.select().from(applications);
  }

  async listApplicationsByOpportunity(opportunityId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.opportunityId, opportunityId));
  }

  async listApplicationsByVolunteer(volunteerId: number): Promise<Application[]> {
    return await db.select().from(applications).where(eq(applications.volunteerId, volunteerId));
  }

  async findApplicationByVolunteerAndOpportunity(volunteerId: number, opportunityId: number): Promise<Application | undefined> {
    const [result] = await db.select().from(applications).where(
      and(
        eq(applications.volunteerId, volunteerId),
        eq(applications.opportunityId, opportunityId)
      )
    );
    return result || undefined;
  }

  async listApplicationsByOrganization(organizationId: number): Promise<Application[]> {
    // Fetch all applications for opportunities belonging to this organization
    const results = await db
      .select({
        application: applications,
      })
      .from(applications)
      .innerJoin(opportunities, eq(applications.opportunityId, opportunities.id))
      .where(eq(opportunities.organizationId, organizationId));
    
    return results.map(r => r.application);
  }

  // Volunteer-Organization Relationship operations
  async getVolunteerOrganizationRelationship(volunteerId: number, organizationId: number): Promise<VolunteerOrganizationRelationship | undefined> {
    const [result] = await db.select().from(volunteerOrganizationRelationships).where(
      and(
        eq(volunteerOrganizationRelationships.volunteerId, volunteerId),
        eq(volunteerOrganizationRelationships.organizationId, organizationId)
      )
    );
    return result || undefined;
  }

  async createVolunteerOrganizationRelationship(relationship: InsertVolunteerOrganizationRelationship): Promise<VolunteerOrganizationRelationship> {
    const [newRelationship] = await db.insert(volunteerOrganizationRelationships).values(relationship).returning();
    return newRelationship;
  }

  async updateVolunteerOrganizationRelationship(id: number, relationship: Partial<InsertVolunteerOrganizationRelationship>): Promise<VolunteerOrganizationRelationship | undefined> {
    const [result] = await db.update(volunteerOrganizationRelationships)
      .set({ ...relationship, updatedAt: new Date() })
      .where(eq(volunteerOrganizationRelationships.id, id))
      .returning();
    return result || undefined;
  }

  async listVolunteerRelationshipsByOrganization(organizationId: number): Promise<VolunteerOrganizationRelationship[]> {
    return await db.select().from(volunteerOrganizationRelationships)
      .where(eq(volunteerOrganizationRelationships.organizationId, organizationId));
  }

  async listOrganizationRelationshipsByVolunteer(volunteerId: number): Promise<VolunteerOrganizationRelationship[]> {
    return await db.select().from(volunteerOrganizationRelationships)
      .where(eq(volunteerOrganizationRelationships.volunteerId, volunteerId));
  }

  async upsertVolunteerOrganizationRelationship(volunteerId: number, organizationId: number, updates: Partial<InsertVolunteerOrganizationRelationship>): Promise<VolunteerOrganizationRelationship> {
    // Use transaction for atomicity - prevents race conditions between check and write
    return await withTransaction(async (tx) => {
      // Try to find existing relationship within transaction
      const [existing] = await tx.select().from(volunteerOrganizationRelationships).where(
        and(
          eq(volunteerOrganizationRelationships.volunteerId, volunteerId),
          eq(volunteerOrganizationRelationships.organizationId, organizationId)
        )
      );

      if (existing) {
        // Update existing relationship
        const [updated] = await tx.update(volunteerOrganizationRelationships)
          .set({
            ...updates,
            lastActivityAt: new Date(),
            totalApplications: (existing.totalApplications || 0) + (updates.totalApplications ? 1 : 0)
          })
          .where(eq(volunteerOrganizationRelationships.id, existing.id))
          .returning();
        return updated;
      } else {
        // Create new relationship
        const [newRelationship] = await tx.insert(volunteerOrganizationRelationships).values({
          volunteerId,
          organizationId,
          relationshipType: updates.relationshipType || 'applied',
          firstContactAt: new Date(),
          lastActivityAt: new Date(),
          totalApplications: 1,
          totalProjectsCompleted: 0,
          totalHoursContributed: 0,
          totalAiuEarned: 0,
          isActive: true,
          ...updates
        }).returning();
        return newRelationship;
      }
    });
  }

  // Saved Opportunity operations
  async saveOpportunity(savedOpp: InsertSavedOpportunity): Promise<SavedOpportunity> {
    const [newSaved] = await db.insert(savedOpportunities).values(savedOpp).returning();
    return newSaved;
  }

  async unsaveOpportunity(volunteerId: number, opportunityId: number): Promise<void> {
    await db.delete(savedOpportunities).where(
      and(
        eq(savedOpportunities.volunteerId, volunteerId),
        eq(savedOpportunities.opportunityId, opportunityId)
      )
    );
  }

  async listSavedOpportunitiesByVolunteer(volunteerId: number): Promise<SavedOpportunity[]> {
    return await db.select().from(savedOpportunities).where(eq(savedOpportunities.volunteerId, volunteerId));
  }

  async isSavedOpportunity(volunteerId: number, opportunityId: number): Promise<boolean> {
    const [result] = await db.select().from(savedOpportunities).where(
      and(
        eq(savedOpportunities.volunteerId, volunteerId),
        eq(savedOpportunities.opportunityId, opportunityId)
      )
    );
    return !!result;
  }

  // Rejected Opportunity operations
  async rejectOpportunity(rejectedOpp: InsertRejectedOpportunity): Promise<RejectedOpportunity> {
    const [newRejected] = await db.insert(rejectedOpportunities).values(rejectedOpp).returning();
    return newRejected;
  }

  async unrejectOpportunity(volunteerId: number, opportunityId: number): Promise<void> {
    await db.delete(rejectedOpportunities).where(
      and(
        eq(rejectedOpportunities.volunteerId, volunteerId),
        eq(rejectedOpportunities.opportunityId, opportunityId)
      )
    );
  }

  async listRejectedOpportunitiesByVolunteer(volunteerId: number): Promise<RejectedOpportunity[]> {
    return await db.select().from(rejectedOpportunities).where(eq(rejectedOpportunities.volunteerId, volunteerId));
  }

  async isRejectedOpportunity(volunteerId: number, opportunityId: number): Promise<boolean> {
    const [result] = await db.select().from(rejectedOpportunities).where(
      and(
        eq(rejectedOpportunities.volunteerId, volunteerId),
        eq(rejectedOpportunities.opportunityId, opportunityId)
      )
    );
    return !!result;
  }

  // Match score operations
  async getMatchScore(opportunityId: number, volunteerId: number): Promise<any> {
    const opportunity = await this.getOpportunity(opportunityId);
    const volunteer = await this.getUser(volunteerId);
    
    if (!opportunity || !volunteer) {
      return {
        opportunityId,
        volunteerId,
        score: 0,
        matchReasons: ['Unable to calculate match - missing data']
      };
    }

    const matchResult = calculateMatchScore(volunteer, opportunity);
    
    return {
      opportunityId,
      volunteerId,
      score: matchResult.score,
      matchReasons: matchResult.reasons,
      breakdown: matchResult.breakdown
    };
  }

  // Project Assignment operations
  async getProjectAssignment(id: number): Promise<ProjectAssignment | undefined> {
    const [result] = await db.select().from(projectAssignments).where(eq(projectAssignments.id, id));
    return result || undefined;
  }

  async findProjectAssignmentByVolunteerProject(
    volunteerId: number,
    projectId: number,
    statuses: string[] = ['pending', 'active']
  ): Promise<ProjectAssignment | undefined> {
    // Guard against empty statuses array
    if (!statuses || statuses.length === 0) {
      return undefined;
    }

    const [result] = await db
      .select()
      .from(projectAssignments)
      .where(
        and(
          eq(projectAssignments.volunteerId, volunteerId),
          eq(projectAssignments.projectId, projectId),
          inArray(projectAssignments.status, statuses)
        )
      );
    return result;
  }

  async createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    // Use transaction for atomicity - prevents race condition where duplicate check passes
    // but another concurrent request creates an assignment before this one completes
    return await withTransaction(async (tx) => {
      // Check for duplicate pending or active assignments within transaction
      const statuses = ['pending', 'active'];
      const [existing] = await tx.select().from(projectAssignments).where(
        and(
          eq(projectAssignments.volunteerId, assignment.volunteerId),
          eq(projectAssignments.projectId, assignment.projectId),
          inArray(projectAssignments.status, statuses)
        )
      );

      if (existing) {
        throw new DuplicateAssignmentError(
          `Volunteer is already assigned to this project with status: ${existing.status}`
        );
      }

      const [newAssignment] = await tx.insert(projectAssignments).values(assignment).returning();
      return newAssignment;
    });
  }

  async updateProjectAssignment(id: number, assignment: Partial<InsertProjectAssignment>): Promise<ProjectAssignment | undefined> {
    const [result] = await db.update(projectAssignments).set(assignment).where(eq(projectAssignments.id, id)).returning();
    return result || undefined;
  }

  async listProjectAssignments(): Promise<ProjectAssignment[]> {
    return await db.select().from(projectAssignments);
  }

  async listProjectAssignmentsByProject(projectId: number): Promise<ProjectAssignment[]> {
    return await db.select().from(projectAssignments).where(eq(projectAssignments.projectId, projectId));
  }

  async listProjectAssignmentsByVolunteer(volunteerId: number): Promise<ProjectAssignment[]> {
    return await db.select().from(projectAssignments).where(eq(projectAssignments.volunteerId, volunteerId));
  }

  async deleteProjectAssignment(id: number): Promise<boolean> {
    await db.delete(projectAssignments).where(eq(projectAssignments.id, id));
    return true;
  }

  async listProjectAssignmentsByProjectIds(projectIds: number[]): Promise<ProjectAssignment[]> {
    if (projectIds.length === 0) return [];
    return await db.select().from(projectAssignments).where(inArray(projectAssignments.projectId, projectIds));
  }

  // === OPTIMIZED BATCH QUERY IMPLEMENTATIONS (Hyper-efficiency) ===
  // These methods reduce N+1 queries by fetching filtered data in single database queries

  async listTasksByProjectIds(projectIds: number[]): Promise<Task[]> {
    if (projectIds.length === 0) return [];
    return await db.select().from(tasks).where(inArray(tasks.projectId, projectIds));
  }

  async listVolunteerActivitiesByProjectIds(projectIds: number[]): Promise<VolunteerActivity[]> {
    if (projectIds.length === 0) return [];
    return await db.select().from(volunteerActivities).where(inArray(volunteerActivities.projectId, projectIds));
  }

  async listProjectImpactsByProjectIds(projectIds: number[]): Promise<ProjectImpact[]> {
    if (projectIds.length === 0) return [];
    return await db.select().from(projectImpacts).where(inArray(projectImpacts.projectId, projectIds));
  }

  async listApplicationsByOpportunityIds(opportunityIds: number[]): Promise<Application[]> {
    if (opportunityIds.length === 0) return [];
    return await db.select().from(applications).where(inArray(applications.opportunityId, opportunityIds));
  }

  // Volunteer operations (matching system)
  async getVolunteer(id: string): Promise<Volunteer | undefined> {
    const [result] = await db.select().from(volunteers).where(eq(volunteers.id, id));
    return result || undefined;
  }

  async createVolunteer(insertVolunteer: InsertVolunteer | any): Promise<Volunteer> {
    const id = insertVolunteer.id || crypto.randomUUID();
    const [volunteer] = await db.insert(volunteers).values({ ...insertVolunteer, id }).returning();
    return volunteer;
  }

  async updateVolunteer(id: string, volunteerData: Partial<InsertVolunteer>): Promise<Volunteer | undefined> {
    const [result] = await db.update(volunteers).set(volunteerData).where(eq(volunteers.id, id)).returning();
    return result || undefined;
  }

  async deleteVolunteer(id: string): Promise<boolean> {
    await db.delete(volunteers).where(eq(volunteers.id, id));
    return true;
  }

  async listVolunteers(): Promise<Volunteer[]> {
    return await db.select().from(volunteers);
  }

  async getVolunteerByEmail(email: string): Promise<Volunteer | undefined> {
    const [result] = await db.select().from(volunteers).where(eq(volunteers.email, email));
    return result || undefined;
  }

  // Matchable Organization operations
  async getMatchableOrganization(id: string): Promise<MatchableOrganization | undefined> {
    const [result] = await db.select().from(matchableOrganizations).where(eq(matchableOrganizations.id, id));
    return result || undefined;
  }

  async getMatchableOrganizationByEmail(email: string): Promise<MatchableOrganization | undefined> {
    const [result] = await db.select().from(matchableOrganizations).where(eq(matchableOrganizations.email, email));
    return result || undefined;
  }

  async createMatchableOrganization(insertOrg: InsertMatchableOrganization | any): Promise<MatchableOrganization> {
    const id = insertOrg.id || crypto.randomUUID();
    const [organization] = await db.insert(matchableOrganizations).values({ ...insertOrg, id }).returning();
    return organization;
  }

  async updateMatchableOrganization(id: string, orgData: Partial<InsertMatchableOrganization>): Promise<MatchableOrganization | undefined> {
    const [result] = await db.update(matchableOrganizations).set(orgData).where(eq(matchableOrganizations.id, id)).returning();
    return result || undefined;
  }

  async deleteMatchableOrganization(id: string): Promise<boolean> {
    await db.delete(matchableOrganizations).where(eq(matchableOrganizations.id, id));
    return true;
  }

  async listMatchableOrganizations(): Promise<MatchableOrganization[]> {
    return await db.select().from(matchableOrganizations);
  }

  // Match operations
  async getMatch(id: number): Promise<Match | undefined> {
    const [result] = await db.select().from(matches).where(eq(matches.id, id));
    return result || undefined;
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    // Use transaction for atomicity - ensures entity validation and insert are atomic
    return await withTransaction(async (tx) => {
      const [volunteer] = await tx.select().from(volunteers).where(eq(volunteers.id, insertMatch.volunteerId));
      if (!volunteer) {
        throw new Error(`Volunteer with id ${insertMatch.volunteerId} does not exist`);
      }

      const [organization] = await tx.select().from(matchableOrganizations).where(eq(matchableOrganizations.id, insertMatch.organizationId));
      if (!organization) {
        throw new Error(`Organization with id ${insertMatch.organizationId} does not exist`);
      }

      const [match] = await tx.insert(matches).values(insertMatch).returning();
      return match;
    });
  }

  async updateMatch(id: number, matchData: Partial<InsertMatch>): Promise<Match | undefined> {
    if (matchData.volunteerId) {
      const volunteer = await this.getVolunteer(matchData.volunteerId);
      if (!volunteer) {
        throw new Error(`Volunteer with id ${matchData.volunteerId} does not exist`);
      }
    }

    if (matchData.organizationId) {
      const organization = await this.getMatchableOrganization(matchData.organizationId);
      if (!organization) {
        throw new Error(`Organization with id ${matchData.organizationId} does not exist`);
      }
    }

    const [result] = await db.update(matches).set(matchData).where(eq(matches.id, id)).returning();
    return result || undefined;
  }

  async upsertMatch(insertMatch: InsertMatch): Promise<Match> {
    // Use transaction for atomicity - prevents race conditions in check-then-write
    return await withTransaction(async (tx) => {
      // Verify entities exist within transaction
      const [volunteer] = await tx.select().from(volunteers).where(eq(volunteers.id, insertMatch.volunteerId));
      if (!volunteer) {
        throw new Error(`Volunteer with id ${insertMatch.volunteerId} does not exist`);
      }

      const [organization] = await tx.select().from(matchableOrganizations).where(eq(matchableOrganizations.id, insertMatch.organizationId));
      if (!organization) {
        throw new Error(`Organization with id ${insertMatch.organizationId} does not exist`);
      }

      const [existingMatch] = await tx.select().from(matches).where(
        and(
          eq(matches.volunteerId, insertMatch.volunteerId),
          eq(matches.organizationId, insertMatch.organizationId)
        )
      );

      if (existingMatch) {
        const [updated] = await tx.update(matches)
          .set({ score: insertMatch.score, matchedOn: new Date() })
          .where(eq(matches.id, existingMatch.id))
          .returning();
        return updated;
      } else {
        const [match] = await tx.insert(matches).values(insertMatch).returning();
        return match;
      }
    });
  }

  async deleteMatch(id: number): Promise<boolean> {
    await db.delete(matches).where(eq(matches.id, id));
    return true;
  }

  async listMatches(): Promise<Match[]> {
    return await db.select().from(matches);
  }

  async listMatchesByVolunteer(volunteerId: string): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.volunteerId, volunteerId));
  }

  async listMatchesByOrganization(organizationId: string): Promise<Match[]> {
    return await db.select().from(matches).where(eq(matches.organizationId, organizationId));
  }

  // Calendar Event operations
  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [result] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return result || undefined;
  }

  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const [calendarEvent] = await db.insert(calendarEvents).values(event).returning();
    return calendarEvent;
  }

  async updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent | undefined> {
    const [result] = await db.update(calendarEvents).set(event).where(eq(calendarEvents.id, id)).returning();
    return result || undefined;
  }

  async deleteCalendarEvent(id: number): Promise<boolean> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
    return true;
  }

  async listCalendarEvents(): Promise<CalendarEvent[]> {
    return await db.select().from(calendarEvents);
  }

  // Conversation Thread operations
  async getConversationThread(id: number): Promise<ConversationThread | undefined> {
    const [result] = await db.select().from(conversationThreads).where(eq(conversationThreads.id, id));
    return result || undefined;
  }

  async createConversationThread(thread: InsertConversationThread): Promise<ConversationThread> {
    const [newThread] = await db.insert(conversationThreads).values(thread).returning();
    return newThread;
  }

  async updateConversationThread(id: number, thread: Partial<InsertConversationThread>): Promise<ConversationThread | undefined> {
    const [result] = await db.update(conversationThreads).set(thread).where(eq(conversationThreads.id, id)).returning();
    return result || undefined;
  }

  async listConversationThreadsByOrganization(organizationId: number): Promise<ConversationThread[]> {
    const { desc } = await import("drizzle-orm");
    return await db
      .select()
      .from(conversationThreads)
      .where(eq(conversationThreads.organizationId, organizationId))
      .orderBy(desc(conversationThreads.lastMessageAt));
  }

  async listConversationThreadsByVolunteer(volunteerId: number): Promise<ConversationThread[]> {
    const { desc } = await import("drizzle-orm");
    return await db
      .select()
      .from(conversationThreads)
      .where(eq(conversationThreads.volunteerId, volunteerId))
      .orderBy(desc(conversationThreads.lastMessageAt));
  }

  async getConversationThreadBetween(organizationId: number, volunteerId: number, topic?: string): Promise<ConversationThread | undefined> {
    let query = db.select().from(conversationThreads).where(
      and(
        eq(conversationThreads.organizationId, organizationId),
        eq(conversationThreads.volunteerId, volunteerId)
      )
    );
    
    if (topic) {
      const [result] = await db.select().from(conversationThreads).where(
        and(
          eq(conversationThreads.organizationId, organizationId),
          eq(conversationThreads.volunteerId, volunteerId),
          eq(conversationThreads.topic, topic)
        )
      );
      return result || undefined;
    }
    
    const results = await query;
    return results[0] || undefined;
  }

  // Message operations (org-volunteer messaging)
  async getMessage(id: number): Promise<OrgMessage | undefined> {
    const [result] = await db.select().from(orgMessages).where(eq(orgMessages.id, id));
    return result || undefined;
  }

  async createMessage(message: InsertOrgMessage): Promise<OrgMessage> {
    const [newMessage] = await db.insert(orgMessages).values(message).returning();
    return newMessage;
  }

  async updateMessage(id: number, messageData: Partial<InsertOrgMessage>): Promise<OrgMessage | undefined> {
    const [result] = await db.update(orgMessages).set(messageData).where(eq(orgMessages.id, id)).returning();
    return result || undefined;
  }

  async listMessages(): Promise<OrgMessage[]> {
    return await db.select().from(orgMessages);
  }

  async listMessagesBySender(senderId: number): Promise<OrgMessage[]> {
    return await db.select().from(orgMessages).where(eq(orgMessages.senderId, senderId));
  }

  async listMessagesByReceiver(receiverId: number): Promise<OrgMessage[]> {
    return await db.select().from(orgMessages).where(eq(orgMessages.receiverId, receiverId));
  }

  async listMessagesByThread(threadId: number): Promise<OrgMessage[]> {
    return await db
      .select()
      .from(orgMessages)
      .where(eq(orgMessages.threadId, threadId))
      .orderBy(asc(orgMessages.createdAt));
  }

  async listConversation(userId1: number, userId2: number): Promise<OrgMessage[]> {
    return await db
      .select()
      .from(orgMessages)
      .where(
        or(
          and(eq(orgMessages.senderId, userId1), eq(orgMessages.receiverId, userId2)),
          and(eq(orgMessages.senderId, userId2), eq(orgMessages.receiverId, userId1))
        )
      )
      .orderBy(asc(orgMessages.createdAt));
  }

  async markMessageAsRead(id: number): Promise<OrgMessage | undefined> {
    const [result] = await db
      .update(orgMessages)
      .set({
        read: true,
        deliveryStatus: 'read',
        readAt: new Date()
      })
      .where(eq(orgMessages.id, id))
      .returning();
    return result || undefined;
  }

  async markMessageAsDelivered(id: number): Promise<OrgMessage | undefined> {
    const [result] = await db
      .update(orgMessages)
      .set({
        deliveryStatus: 'delivered',
        deliveredAt: new Date()
      })
      .where(eq(orgMessages.id, id))
      .returning();
    return result || undefined;
  }

  async getNotification(id: number): Promise<Notification | undefined> {
    const [result] = await db.select().from(notifications).where(eq(notifications.id, id));
    return result || undefined;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    const { desc } = await import("drizzle-orm");
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(notificationId: number): Promise<Notification | undefined> {
    const [result] = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId))
      .returning();
    return result || undefined;
  }

  // Volunteer Profile operations
  async getVolunteerProfile(id: number): Promise<VolunteerProfile | undefined> {
    const [result] = await db.select().from(volunteerProfiles).where(eq(volunteerProfiles.id, id));
    return result || undefined;
  }

  async getVolunteerProfileByUserId(userId: number): Promise<VolunteerProfile | undefined> {
    const [result] = await db.select().from(volunteerProfiles).where(eq(volunteerProfiles.userId, userId));
    return result || undefined;
  }

  async createVolunteerProfile(profile: InsertVolunteerProfile): Promise<VolunteerProfile> {
    const [volunteerProfile] = await db.insert(volunteerProfiles).values(profile).returning();
    return volunteerProfile;
  }

  async updateVolunteerProfile(id: number, profile: Partial<InsertVolunteerProfile>): Promise<VolunteerProfile | undefined> {
    const [result] = await db.update(volunteerProfiles).set(profile).where(eq(volunteerProfiles.id, id)).returning();
    return result || undefined;
  }

  async listVolunteerProfiles(): Promise<VolunteerProfile[]> {
    return await db.select().from(volunteerProfiles);
  }

  // Organization Profile operations
  async getOrganizationProfile(id: number): Promise<OrganizationProfile | undefined> {
    const [result] = await db.select().from(organizationProfiles).where(eq(organizationProfiles.id, id));
    return result || undefined;
  }

  async getOrganizationProfileByOrgId(organizationId: number): Promise<OrganizationProfile | undefined> {
    const [result] = await db.select().from(organizationProfiles).where(eq(organizationProfiles.organizationId, organizationId));
    return result || undefined;
  }

  async createOrganizationProfile(profile: InsertOrganizationProfile): Promise<OrganizationProfile> {
    const [organizationProfile] = await db.insert(organizationProfiles).values(profile).returning();
    return organizationProfile;
  }

  async updateOrganizationProfile(id: number, profile: Partial<InsertOrganizationProfile>): Promise<OrganizationProfile | undefined> {
    const [result] = await db.update(organizationProfiles).set(profile).where(eq(organizationProfiles.id, id)).returning();
    return result || undefined;
  }

  async listOrganizationProfiles(): Promise<OrganizationProfile[]> {
    return await db.select().from(organizationProfiles);
  }

  // User Data Audit Log operations
  async createUserDataAuditLog(log: InsertUserDataAuditLog): Promise<UserDataAuditLog> {
    const [auditLog] = await db.insert(userDataAuditLogs).values(log).returning();
    return auditLog;
  }

  async getUserDataAuditLogs(userId: number): Promise<UserDataAuditLog[]> {
    return await db
      .select()
      .from(userDataAuditLogs)
      .where(eq(userDataAuditLogs.userId, userId))
      .orderBy(desc(userDataAuditLogs.createdAt));
  }

  async getUnresolvedDiscrepancies(userId?: number): Promise<UserDataAuditLog[]> {
    const baseCondition = and(
      isNull(userDataAuditLogs.resolvedAt),
      isNotNull(userDataAuditLogs.discrepancyType)
    );
    
    if (userId) {
      return await db
        .select()
        .from(userDataAuditLogs)
        .where(and(baseCondition, eq(userDataAuditLogs.userId, userId)))
        .orderBy(desc(userDataAuditLogs.createdAt));
    }
    
    return await db
      .select()
      .from(userDataAuditLogs)
      .where(baseCondition)
      .orderBy(desc(userDataAuditLogs.createdAt));
  }

  async getDiscrepancyById(id: number): Promise<UserDataAuditLog | undefined> {
    const [result] = await db
      .select()
      .from(userDataAuditLogs)
      .where(eq(userDataAuditLogs.id, id));
    return result || undefined;
  }

  async resolveDiscrepancy(id: number, resolvedBy: number): Promise<UserDataAuditLog | undefined> {
    const [result] = await db
      .update(userDataAuditLogs)
      .set({ resolvedAt: new Date(), resolvedBy })
      .where(eq(userDataAuditLogs.id, id))
      .returning();
    return result || undefined;
  }

  // CSR Partner operations
  async createCSRPartner(partner: InsertCSRPartner): Promise<CSRPartner> {
    const [result] = await db.insert(csrPartners).values(partner).returning();
    return result;
  }

  async listCSRPartners(): Promise<CSRPartner[]> {
    return await db.select().from(csrPartners);
  }

  async getCSRPartner(id: number): Promise<CSRPartner | undefined> {
    const [result] = await db.select().from(csrPartners).where(eq(csrPartners.id, id));
    return result || undefined;
  }

  async updateCSRPartner(id: number, partner: Partial<InsertCSRPartner>): Promise<CSRPartner | undefined> {
    const [result] = await db.update(csrPartners).set(partner).where(eq(csrPartners.id, id)).returning();
    return result || undefined;
  }

  // Employee Engagement operations
  async createEmployeeEngagement(engagement: InsertEmployeeEngagement): Promise<EmployeeEngagement> {
    const [result] = await db.insert(employeeEngagement).values(engagement).returning();
    return result;
  }

  async listEmployeeEngagement(): Promise<EmployeeEngagement[]> {
    return await db.select().from(employeeEngagement);
  }

  async getEmployeeEngagement(id: number): Promise<EmployeeEngagement | undefined> {
    const [result] = await db.select().from(employeeEngagement).where(eq(employeeEngagement.id, id));
    return result || undefined;
  }

  async updateEmployeeEngagement(id: number, engagement: Partial<InsertEmployeeEngagement>): Promise<EmployeeEngagement | undefined> {
    const [result] = await db.update(employeeEngagement).set(engagement).where(eq(employeeEngagement.id, id)).returning();
    return result || undefined;
  }

  // CSR Challenge operations
  async createCSRChallenge(challenge: InsertCSRChallenge): Promise<CSRChallenge> {
    const [result] = await db.insert(csrChallenges).values(challenge).returning();
    return result;
  }

  async listCSRChallenges(): Promise<CSRChallenge[]> {
    return await db.select().from(csrChallenges);
  }

  async getCSRChallenge(id: number): Promise<CSRChallenge | undefined> {
    const [result] = await db.select().from(csrChallenges).where(eq(csrChallenges.id, id));
    return result || undefined;
  }

  async updateCSRChallenge(id: number, challenge: Partial<InsertCSRChallenge>): Promise<CSRChallenge | undefined> {
    const [result] = await db.update(csrChallenges).set(challenge).where(eq(csrChallenges.id, id)).returning();
    return result || undefined;
  }

  // Project Budget Link operations
  async createProjectBudgetLink(link: InsertProjectBudgetLink): Promise<ProjectBudgetLink> {
    const [result] = await db.insert(projectBudgetLinks).values(link).returning();
    return result;
  }

  async listProjectBudgetLinks(): Promise<ProjectBudgetLink[]> {
    return await db.select().from(projectBudgetLinks);
  }

  async getProjectBudgetLink(id: number): Promise<ProjectBudgetLink | undefined> {
    const [result] = await db.select().from(projectBudgetLinks).where(eq(projectBudgetLinks.id, id));
    return result || undefined;
  }

  async updateProjectBudgetLink(id: number, link: Partial<InsertProjectBudgetLink>): Promise<ProjectBudgetLink | undefined> {
    const [result] = await db.update(projectBudgetLinks).set(link).where(eq(projectBudgetLinks.id, id)).returning();
    return result || undefined;
  }

  // Verified Output operations
  async createVerifiedOutput(output: InsertVerifiedOutput): Promise<VerifiedOutput> {
    const [result] = await db.insert(verifiedOutputs).values(output).returning();
    return result;
  }

  async listVerifiedOutputs(): Promise<VerifiedOutput[]> {
    return await db.select().from(verifiedOutputs);
  }

  async getVerifiedOutput(id: number): Promise<VerifiedOutput | undefined> {
    const [result] = await db.select().from(verifiedOutputs).where(eq(verifiedOutputs.id, id));
    return result || undefined;
  }

  async updateVerifiedOutput(id: number, output: Partial<InsertVerifiedOutput>): Promise<VerifiedOutput | undefined> {
    const [result] = await db.update(verifiedOutputs).set(output).where(eq(verifiedOutputs.id, id)).returning();
    return result || undefined;
  }

  // Employee Commitment operations
  async createEmployeeCommitment(commitment: InsertEmployeeCommitment): Promise<EmployeeCommitment> {
    const [result] = await db.insert(employeeCommitments).values(commitment).returning();
    return result;
  }

  async listEmployeeCommitments(): Promise<EmployeeCommitment[]> {
    return await db.select().from(employeeCommitments);
  }

  async getEmployeeCommitment(id: number): Promise<EmployeeCommitment | undefined> {
    const [result] = await db.select().from(employeeCommitments).where(eq(employeeCommitments.id, id));
    return result || undefined;
  }

  async updateEmployeeCommitment(id: number, commitment: Partial<InsertEmployeeCommitment>): Promise<EmployeeCommitment | undefined> {
    const [result] = await db.update(employeeCommitments).set(commitment).where(eq(employeeCommitments.id, id)).returning();
    return result || undefined;
  }

  // Employee Activity Log operations
  async createEmployeeActivityLog(log: InsertEmployeeActivityLog): Promise<EmployeeActivityLog> {
    const [result] = await db.insert(employeeActivityLogs).values(log).returning();
    return result;
  }

  async listEmployeeActivityLogs(): Promise<EmployeeActivityLog[]> {
    return await db.select().from(employeeActivityLogs);
  }

  async getEmployeeActivityLog(id: number): Promise<EmployeeActivityLog | undefined> {
    const [result] = await db.select().from(employeeActivityLogs).where(eq(employeeActivityLogs.id, id));
    return result || undefined;
  }

  // Employee Milestone operations
  async createEmployeeMilestone(milestone: InsertEmployeeMilestone): Promise<EmployeeMilestone> {
    const [result] = await db.insert(employeeMilestones).values(milestone).returning();
    return result;
  }

  async listEmployeeMilestones(): Promise<EmployeeMilestone[]> {
    return await db.select().from(employeeMilestones);
  }

  async getEmployeeMilestone(id: number): Promise<EmployeeMilestone | undefined> {
    const [result] = await db.select().from(employeeMilestones).where(eq(employeeMilestones.id, id));
    return result || undefined;
  }

  // CSR Commitment Goal operations
  async createCSRCommitmentGoal(goal: InsertCSRCommitmentGoal): Promise<CSRCommitmentGoal> {
    const [result] = await db.insert(csrCommitmentGoals).values(goal).returning();
    return result;
  }

  async listCSRCommitmentGoals(): Promise<CSRCommitmentGoal[]> {
    return await db.select().from(csrCommitmentGoals);
  }

  async getCSRCommitmentGoal(id: number): Promise<CSRCommitmentGoal | undefined> {
    const [result] = await db.select().from(csrCommitmentGoals).where(eq(csrCommitmentGoals.id, id));
    return result || undefined;
  }

  async updateCSRCommitmentGoal(id: number, goal: Partial<InsertCSRCommitmentGoal>): Promise<CSRCommitmentGoal | undefined> {
    const [result] = await db.update(csrCommitmentGoals).set(goal).where(eq(csrCommitmentGoals.id, id)).returning();
    return result || undefined;
  }

  // Volunteer Employer Link operations
  async createVolunteerEmployerLink(link: InsertVolunteerEmployerLink): Promise<VolunteerEmployerLink> {
    const [result] = await db.insert(volunteerEmployerLinks).values(link).returning();
    return result;
  }

  async listVolunteerEmployerLinks(): Promise<VolunteerEmployerLink[]> {
    return await db.select().from(volunteerEmployerLinks);
  }

  async getVolunteerEmployerLink(volunteerId: number): Promise<VolunteerEmployerLink | undefined> {
    const [result] = await db.select().from(volunteerEmployerLinks).where(eq(volunteerEmployerLinks.volunteerId, volunteerId));
    return result || undefined;
  }

  async updateVolunteerEmployerLink(id: number, link: Partial<InsertVolunteerEmployerLink>): Promise<VolunteerEmployerLink | undefined> {
    const [result] = await db.update(volunteerEmployerLinks).set(link).where(eq(volunteerEmployerLinks.id, id)).returning();
    return result || undefined;
  }

  // Matching Weights - fetch the latest weights for dynamic tuning
  async getLatestMatchingWeights(): Promise<{
    skillWeight: number | null;
    locationWeight: number | null;
    sdgWeight: number | null;
    availabilityWeight: number | null;
  } | undefined> {
    const [result] = await db
      .select({
        skillWeight: matchingWeights.skillWeight,
        locationWeight: matchingWeights.locationWeight,
        sdgWeight: matchingWeights.sdgWeight,
        availabilityWeight: matchingWeights.availabilityWeight,
      })
      .from(matchingWeights)
      .orderBy(desc(matchingWeights.updatedAt))
      .limit(1);
    return result || undefined;
  }

  // Match Analytics - track match quality and outcomes for feedback loop
  async getMatchAnalytics(volunteerId: number, opportunityId: number): Promise<MatchAnalytics | undefined> {
    const [result] = await db
      .select()
      .from(matchAnalytics)
      .where(
        and(
          eq(matchAnalytics.volunteerId, volunteerId),
          eq(matchAnalytics.opportunityId, opportunityId)
        )
      );
    return result || undefined;
  }

  async createMatchAnalytics(analytics: InsertMatchAnalytics): Promise<MatchAnalytics> {
    const [result] = await db.insert(matchAnalytics).values(analytics).returning();
    return result;
  }

  async updateMatchAnalytics(id: number, analytics: Partial<InsertMatchAnalytics>): Promise<MatchAnalytics | undefined> {
    const [result] = await db
      .update(matchAnalytics)
      .set({ ...analytics, updatedAt: new Date() })
      .where(eq(matchAnalytics.id, id))
      .returning();
    return result || undefined;
  }

  async listMatchAnalytics(): Promise<MatchAnalytics[]> {
    return db.select().from(matchAnalytics).orderBy(desc(matchAnalytics.createdAt));
  }

  // Volunteer Story operations
  async listVolunteerStories(): Promise<VolunteerStory[]> {
    return db.select().from(volunteerStories).orderBy(desc(volunteerStories.createdAt));
  }

  async getVolunteerStory(id: number): Promise<VolunteerStory | undefined> {
    const [result] = await db.select().from(volunteerStories).where(eq(volunteerStories.id, id));
    return result || undefined;
  }

  async createVolunteerStory(story: InsertVolunteerStory): Promise<VolunteerStory> {
    const [result] = await db.insert(volunteerStories).values(story).returning();
    return result;
  }

  async updateVolunteerStory(id: number, story: Partial<InsertVolunteerStory> & { viewsCount?: number; likesCount?: number }): Promise<VolunteerStory | undefined> {
    const [result] = await db.update(volunteerStories).set({ ...story, updatedAt: new Date() }).where(eq(volunteerStories.id, id)).returning();
    return result || undefined;
  }

  async deleteVolunteerStory(id: number): Promise<boolean> {
    const result = await db.delete(volunteerStories).where(eq(volunteerStories.id, id));
    return true;
  }

  // Story Like operations
  async getStoryLike(storyId: number, userId: number): Promise<StoryLike | undefined> {
    const [result] = await db.select().from(storyLikes).where(
      and(eq(storyLikes.storyId, storyId), eq(storyLikes.userId, userId))
    );
    return result || undefined;
  }

  async createStoryLike(like: InsertStoryLike): Promise<StoryLike> {
    const [result] = await db.insert(storyLikes).values(like).returning();
    return result;
  }

  async deleteStoryLike(storyId: number, userId: number): Promise<boolean> {
    await db.delete(storyLikes).where(
      and(eq(storyLikes.storyId, storyId), eq(storyLikes.userId, userId))
    );
    return true;
  }

  // Team Invitation operations
  async listTeamInvitations(organizationId: number): Promise<TeamInvitation[]> {
    return db.select().from(teamInvitations).where(eq(teamInvitations.organizationId, organizationId)).orderBy(desc(teamInvitations.createdAt));
  }

  async getTeamInvitation(id: number): Promise<TeamInvitation | undefined> {
    const [result] = await db.select().from(teamInvitations).where(eq(teamInvitations.id, id));
    return result;
  }

  async getTeamInvitationByToken(token: string): Promise<TeamInvitation | undefined> {
    const [result] = await db.select().from(teamInvitations).where(eq(teamInvitations.invitationToken, token));
    return result;
  }

  async createTeamInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const [result] = await db.insert(teamInvitations).values(invitation).returning();
    return result;
  }

  async updateTeamInvitation(id: number, invitation: Partial<InsertTeamInvitation>): Promise<TeamInvitation | undefined> {
    const [result] = await db.update(teamInvitations).set({ ...invitation, updatedAt: new Date() }).where(eq(teamInvitations.id, id)).returning();
    return result;
  }

  async deleteTeamInvitation(id: number): Promise<boolean> {
    await db.delete(teamInvitations).where(eq(teamInvitations.id, id));
    return true;
  }

  // Invitation Template operations
  async listInvitationTemplates(organizationId?: number): Promise<InvitationTemplate[]> {
    if (organizationId) {
      return db.select().from(invitationTemplates).where(
        or(eq(invitationTemplates.organizationId, organizationId), isNull(invitationTemplates.organizationId))
      ).orderBy(desc(invitationTemplates.createdAt));
    }
    return db.select().from(invitationTemplates).where(isNull(invitationTemplates.organizationId)).orderBy(desc(invitationTemplates.createdAt));
  }

  async getInvitationTemplate(id: number): Promise<InvitationTemplate | undefined> {
    const [result] = await db.select().from(invitationTemplates).where(eq(invitationTemplates.id, id));
    return result;
  }

  async createInvitationTemplate(template: InsertInvitationTemplate): Promise<InvitationTemplate> {
    const [result] = await db.insert(invitationTemplates).values(template).returning();
    return result;
  }

  async updateInvitationTemplate(id: number, template: Partial<InsertInvitationTemplate>): Promise<InvitationTemplate | undefined> {
    const [result] = await db.update(invitationTemplates).set({ ...template, updatedAt: new Date() }).where(eq(invitationTemplates.id, id)).returning();
    return result;
  }

  async deleteInvitationTemplate(id: number): Promise<boolean> {
    await db.delete(invitationTemplates).where(eq(invitationTemplates.id, id));
    return true;
  }

  // ==================== Invitation Codes ====================

  async listInvitationCodes(organizationId?: number): Promise<InvitationCode[]> {
    if (organizationId) {
      return db.select().from(invitationCodes).where(eq(invitationCodes.organizationId, organizationId)).orderBy(desc(invitationCodes.createdAt));
    }
    return db.select().from(invitationCodes).orderBy(desc(invitationCodes.createdAt));
  }

  async getInvitationCode(id: number): Promise<InvitationCode | undefined> {
    const [result] = await db.select().from(invitationCodes).where(eq(invitationCodes.id, id));
    return result;
  }

  async getInvitationCodeByCode(code: string): Promise<InvitationCode | undefined> {
    const [result] = await db.select().from(invitationCodes).where(eq(invitationCodes.code, code.toUpperCase()));
    return result;
  }

  async createInvitationCode(data: InsertInvitationCode): Promise<InvitationCode> {
    const [result] = await db.insert(invitationCodes).values({
      ...data,
      code: data.code.toUpperCase(),
    }).returning();
    return result;
  }

  async validateInvitationCode(code: string, email?: string, userType?: string): Promise<{ valid: boolean; message: string; invitationCode?: InvitationCode }> {
    const inviteCode = await this.getInvitationCodeByCode(code);

    if (!inviteCode) {
      return { valid: false, message: "Invalid invitation code" };
    }

    if (!inviteCode.isActive) {
      return { valid: false, message: "This invitation code has been deactivated" };
    }

    if (inviteCode.expiresAt && new Date(inviteCode.expiresAt) < new Date()) {
      return { valid: false, message: "This invitation code has expired" };
    }

    if (inviteCode.maxUses && inviteCode.usedCount >= inviteCode.maxUses) {
      return { valid: false, message: "This invitation code has reached its usage limit" };
    }

    if (inviteCode.email && email && inviteCode.email.toLowerCase() !== email.toLowerCase()) {
      return { valid: false, message: "This invitation code is for a different email address" };
    }

    if (inviteCode.userType && userType && inviteCode.userType !== userType) {
      return { valid: false, message: `This invitation code is only valid for ${inviteCode.userType} accounts` };
    }

    return { valid: true, message: "Invitation code is valid", invitationCode: inviteCode };
  }

  async useInvitationCode(code: string, userId: number): Promise<{ success: boolean; message: string }> {
    const inviteCode = await this.getInvitationCodeByCode(code);

    if (!inviteCode) {
      return { success: false, message: "Invalid invitation code" };
    }

    // Increment usage count
    await db.update(invitationCodes)
      .set({
        usedCount: inviteCode.usedCount + 1,
        updatedAt: new Date()
      })
      .where(eq(invitationCodes.id, inviteCode.id));

    // Record the usage
    await db.insert(invitationCodeUsage).values({
      codeId: inviteCode.id,
      userId,
    });

    return { success: true, message: "Invitation code used successfully" };
  }

  async deactivateInvitationCode(id: number): Promise<boolean> {
    await db.update(invitationCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(invitationCodes.id, id));
    return true;
  }

  // ==================== Platform Settings ====================

  async getPlatformSetting(key: string): Promise<PlatformSetting | undefined> {
    const [result] = await db.select().from(platformSettings).where(eq(platformSettings.key, key));
    return result;
  }

  async setPlatformSetting(key: string, value: string, description?: string, updatedBy?: number): Promise<PlatformSetting> {
    const existing = await this.getPlatformSetting(key);

    if (existing) {
      const [result] = await db.update(platformSettings)
        .set({ value, description, updatedBy, updatedAt: new Date() })
        .where(eq(platformSettings.key, key))
        .returning();
      return result;
    }

    const [result] = await db.insert(platformSettings).values({
      key,
      value,
      description,
      updatedBy,
    }).returning();
    return result;
  }

  async isInviteOnlyMode(): Promise<boolean> {
    const setting = await this.getPlatformSetting("INVITE_ONLY_MODE");
    // Default to false (open access) for MVP-Type.1
    // Platform is open by default - set to "true" in settings to enable invite-only mode
    if (!setting) {
      return false;
    }
    return setting.value === "true";
  }
}

export const storage = new DatabaseStorage();

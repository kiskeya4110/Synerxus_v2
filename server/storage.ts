import { 
  users, 
  organizations, 
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
  messages,
  type User, 
  type InsertUser,
  type Organization,
  type InsertOrganization,
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
  type Message,
  type InsertMessage
} from "@shared/schema";
import { calculateMatchScore } from "./matching-algorithm";
import { db } from "./db";
import { eq, and, or, asc, inArray } from "drizzle-orm";

// Define the storage interface with CRUD operations for all entities
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByFirebaseUid(firebaseUid: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;

  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
  getOrganizationsByIds(ids: number[]): Promise<Organization[]>;
  createOrganization(organization: InsertOrganization): Promise<Organization>;
  updateOrganization(id: number, organization: Partial<InsertOrganization>): Promise<Organization | undefined>;
  listOrganizations(): Promise<Organization[]>;

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
  createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment>;
  updateProjectAssignment(id: number, assignment: Partial<InsertProjectAssignment>): Promise<ProjectAssignment | undefined>;
  listProjectAssignments(): Promise<ProjectAssignment[]>;
  listProjectAssignmentsByProject(projectId: number): Promise<ProjectAssignment[]>;
  listProjectAssignmentsByVolunteer(volunteerId: number): Promise<ProjectAssignment[]>;
  deleteProjectAssignment(id: number): Promise<boolean>;

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

  // Message operations
  getMessage(id: number): Promise<Message | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: number, message: Partial<InsertMessage>): Promise<Message | undefined>;
  listMessages(): Promise<Message[]>;
  listMessagesBySender(senderId: number): Promise<Message[]>;
  listMessagesByReceiver(receiverId: number): Promise<Message[]>;
  listConversation(userId1: number, userId2: number): Promise<Message[]>;
  markMessageAsRead(id: number): Promise<Message | undefined>;
}

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeImpactMetrics();
  }

  private async initializeImpactMetrics() {
    const initialMetrics: InsertImpactMetric[] = [
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
    return await db.select().from(volunteerActivities).where(eq(volunteerActivities.userId, userId));
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
    const [newOpportunity] = await db.insert(opportunities).values(opportunity).returning();
    return newOpportunity;
  }

  async updateOpportunity(id: number, opportunity: Partial<InsertOpportunity>): Promise<Opportunity | undefined> {
    const [result] = await db.update(opportunities).set(opportunity).where(eq(opportunities.id, id)).returning();
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

  async createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const [newAssignment] = await db.insert(projectAssignments).values(assignment).returning();
    return newAssignment;
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
    const volunteer = await this.getVolunteer(insertMatch.volunteerId);
    if (!volunteer) {
      throw new Error(`Volunteer with id ${insertMatch.volunteerId} does not exist`);
    }

    const organization = await this.getMatchableOrganization(insertMatch.organizationId);
    if (!organization) {
      throw new Error(`Organization with id ${insertMatch.organizationId} does not exist`);
    }

    const [match] = await db.insert(matches).values(insertMatch).returning();
    return match;
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
    const volunteer = await this.getVolunteer(insertMatch.volunteerId);
    if (!volunteer) {
      throw new Error(`Volunteer with id ${insertMatch.volunteerId} does not exist`);
    }

    const organization = await this.getMatchableOrganization(insertMatch.organizationId);
    if (!organization) {
      throw new Error(`Organization with id ${insertMatch.organizationId} does not exist`);
    }

    const existingMatches = await db.select().from(matches).where(
      and(
        eq(matches.volunteerId, insertMatch.volunteerId),
        eq(matches.organizationId, insertMatch.organizationId)
      )
    );

    if (existingMatches.length > 0) {
      const [updated] = await db.update(matches)
        .set({ score: insertMatch.score, matchedOn: new Date() })
        .where(eq(matches.id, existingMatches[0].id))
        .returning();
      return updated;
    } else {
      const [match] = await db.insert(matches).values(insertMatch).returning();
      return match;
    }
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

  // Message operations
  async getMessage(id: number): Promise<Message | undefined> {
    const [result] = await db.select().from(messages).where(eq(messages.id, id));
    return result || undefined;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [newMessage] = await db.insert(messages).values(message).returning();
    return newMessage;
  }

  async updateMessage(id: number, messageData: Partial<InsertMessage>): Promise<Message | undefined> {
    const [result] = await db.update(messages).set(messageData).where(eq(messages.id, id)).returning();
    return result || undefined;
  }

  async listMessages(): Promise<Message[]> {
    return await db.select().from(messages);
  }

  async listMessagesBySender(senderId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.senderId, senderId));
  }

  async listMessagesByReceiver(receiverId: number): Promise<Message[]> {
    return await db.select().from(messages).where(eq(messages.receiverId, receiverId));
  }

  async listConversation(userId1: number, userId2: number): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId1), eq(messages.receiverId, userId2)),
          and(eq(messages.senderId, userId2), eq(messages.receiverId, userId1))
        )
      )
      .orderBy(asc(messages.createdAt));
  }

  async markMessageAsRead(id: number): Promise<Message | undefined> {
    const [result] = await db
      .update(messages)
      .set({ read: true })
      .where(eq(messages.id, id))
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
}

export const storage = new DatabaseStorage();

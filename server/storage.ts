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
  type InsertMatch
} from "@shared/schema";
import { calculateMatchScore } from "./matching-algorithm";

// Define the storage interface with CRUD operations for all entities
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;

  // Organization operations
  getOrganization(id: number): Promise<Organization | undefined>;
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
  createVolunteer(volunteer: InsertVolunteer): Promise<Volunteer>;
  updateVolunteer(id: string, volunteer: Partial<InsertVolunteer>): Promise<Volunteer | undefined>;
  deleteVolunteer(id: string): Promise<boolean>;
  listVolunteers(): Promise<Volunteer[]>;

  // Matchable Organization operations
  getMatchableOrganization(id: string): Promise<MatchableOrganization | undefined>;
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private organizations: Map<number, Organization>;
  private projects: Map<number, Project>;
  private tasks: Map<number, Task>;
  private volunteerActivities: Map<number, VolunteerActivity>;
  private impactMetrics: Map<number, ImpactMetric>;
  private projectImpacts: Map<number, ProjectImpact>;
  private opportunities: Map<number, any>;
  private applications: Map<number, any>;
  private projectAssignments: Map<number, ProjectAssignment>;
  private volunteersMap: Map<string, Volunteer>;
  private matchableOrganizationsMap: Map<string, MatchableOrganization>;
  private matchesMap: Map<number, Match>;

  private userIdCounter: number;
  private organizationIdCounter: number;
  private projectIdCounter: number;
  private taskIdCounter: number;
  private volunteerActivityIdCounter: number;
  private impactMetricIdCounter: number;
  private projectImpactIdCounter: number;
  private opportunityIdCounter: number;
  private applicationIdCounter: number;
  private projectAssignmentIdCounter: number;
  private matchIdCounter: number;

  constructor() {
    this.users = new Map();
    this.organizations = new Map();
    this.projects = new Map();
    this.tasks = new Map();
    this.volunteerActivities = new Map();
    this.impactMetrics = new Map();
    this.projectImpacts = new Map();
    this.opportunities = new Map();
    this.applications = new Map();
    this.projectAssignments = new Map();
    this.volunteersMap = new Map();
    this.matchableOrganizationsMap = new Map();
    this.matchesMap = new Map();

    this.userIdCounter = 1;
    this.organizationIdCounter = 1;
    this.projectIdCounter = 1;
    this.taskIdCounter = 1;
    this.volunteerActivityIdCounter = 1;
    this.impactMetricIdCounter = 1;
    this.projectImpactIdCounter = 1;
    this.opportunityIdCounter = 1;
    this.applicationIdCounter = 1;
    this.projectAssignmentIdCounter = 1;
    this.matchIdCounter = 1;

    // Initialize with some common SDG-related impact metrics
    this.initializeImpactMetrics();
    
    // Initialize with seed data for testing
    this.initializeSeedData();
  }

  private initializeImpactMetrics() {
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

    initialMetrics.forEach(metric => {
      this.createImpactMetric(metric);
    });
  }

  private async initializeSeedData() {
    // Create a volunteer user (ID 1)
    const volunteer = await this.createUser({
      username: "volunteer_jane",
      email: "jane@example.com",
      firebaseUid: "volunteer_uid_1",
      userType: "volunteer",
      location: "San Francisco, CA",
      languages: ["English", "Spanish"],
      interests: ["education", "environment"],
      skills: ["teaching", "project management"],
      experience: "5 years of volunteer teaching experience",
      availability: "weekends",
      preferredCauses: ["education", "climate action"]
    });

    // Create an organization user (ID 2)
    const organization = await this.createUser({
      username: "org_globalimpact",
      email: "contact@globalimpact.org",
      firebaseUid: "org_uid_1",
      userType: "organization",
      organizationName: "Global Impact Foundation",
      mission: "Creating sustainable change worldwide",
      focusAreas: ["education", "health", "environment"],
      isVerified: true
    });

    // Create a test project
    const project = await this.createProject({
      name: "Clean Water Initiative",
      description: "Providing access to clean water in rural communities",
      organizationId: organization.id,
      status: "active",
      location: "Rural Kenya"
    });

    // Create some test tasks
    const task1 = await this.createTask({
      title: "Survey water sources",
      description: "Conduct survey of existing water sources in the region",
      projectId: project.id,
      status: "in progress",
      assigneeId: volunteer.id
    });

    const task2 = await this.createTask({
      title: "Install water filters",
      description: "Install and test water filtration systems",
      projectId: project.id,
      status: "todo"
    });

    // Create a project assignment
    await this.createProjectAssignment({
      projectId: project.id,
      volunteerId: volunteer.id,
      role: "Field Coordinator",
      status: "active",
      hoursCommitted: 40,
      hoursCompleted: 15,
      assignmentDate: new Date()
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const existingUser = await this.getUser(id);
    if (!existingUser) {
      return undefined;
    }

    const updatedUser: User = {
      ...existingUser,
      ...userData,
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Organization operations
  async getOrganization(id: number): Promise<Organization | undefined> {
    return this.organizations.get(id);
  }

  async createOrganization(insertOrg: InsertOrganization): Promise<Organization> {
    const id = this.organizationIdCounter++;
    const now = new Date();
    const organization: Organization = {
      ...insertOrg,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.organizations.set(id, organization);
    return organization;
  }

  async updateOrganization(id: number, orgData: Partial<InsertOrganization>): Promise<Organization | undefined> {
    const existingOrg = await this.getOrganization(id);
    if (!existingOrg) {
      return undefined;
    }

    const updatedOrg: Organization = {
      ...existingOrg,
      ...orgData,
      updatedAt: new Date()
    };

    this.organizations.set(id, updatedOrg);
    return updatedOrg;
  }

  async listOrganizations(): Promise<Organization[]> {
    return Array.from(this.organizations.values());
  }

  // Project operations
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectIdCounter++;
    const now = new Date();
    const project: Project = {
      ...insertProject,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, projectData: Partial<InsertProject>): Promise<Project | undefined> {
    const existingProject = await this.getProject(id);
    if (!existingProject) {
      return undefined;
    }

    const updatedProject: Project = {
      ...existingProject,
      ...projectData,
      updatedAt: new Date()
    };

    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async listProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async listProjectsByOrganization(organizationId: number): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.organizationId === organizationId);
  }

  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskIdCounter++;
    const now = new Date();
    const task: Task = {
      ...insertTask,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.tasks.set(id, task);
    return task;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task | undefined> {
    const existingTask = await this.getTask(id);
    if (!existingTask) {
      return undefined;
    }

    const updatedTask: Task = {
      ...existingTask,
      ...taskData,
      updatedAt: new Date()
    };

    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  async listTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async listTasksByProject(projectId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.projectId === projectId);
  }

  async listTasksByAssignee(assigneeId: number): Promise<Task[]> {
    return Array.from(this.tasks.values())
      .filter(task => task.assigneeId === assigneeId);
  }

  // Volunteer Activity operations
  async getVolunteerActivity(id: number): Promise<VolunteerActivity | undefined> {
    return this.volunteerActivities.get(id);
  }

  async createVolunteerActivity(insertActivity: InsertVolunteerActivity): Promise<VolunteerActivity> {
    const id = this.volunteerActivityIdCounter++;
    const now = new Date();
    const activity: VolunteerActivity = {
      ...insertActivity,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.volunteerActivities.set(id, activity);
    return activity;
  }

  async updateVolunteerActivity(id: number, activityData: Partial<InsertVolunteerActivity>): Promise<VolunteerActivity | undefined> {
    const existingActivity = await this.getVolunteerActivity(id);
    if (!existingActivity) {
      return undefined;
    }

    const updatedActivity: VolunteerActivity = {
      ...existingActivity,
      ...activityData,
      updatedAt: new Date()
    };

    this.volunteerActivities.set(id, updatedActivity);
    return updatedActivity;
  }

  async listVolunteerActivities(): Promise<VolunteerActivity[]> {
    return Array.from(this.volunteerActivities.values());
  }

  async listVolunteerActivitiesByUser(userId: number): Promise<VolunteerActivity[]> {
    return Array.from(this.volunteerActivities.values())
      .filter(activity => activity.userId === userId);
  }

  async listVolunteerActivitiesByProject(projectId: number): Promise<VolunteerActivity[]> {
    return Array.from(this.volunteerActivities.values())
      .filter(activity => activity.projectId === projectId);
  }

  // Impact Metric operations
  async getImpactMetric(id: number): Promise<ImpactMetric | undefined> {
    return this.impactMetrics.get(id);
  }

  async createImpactMetric(insertMetric: InsertImpactMetric): Promise<ImpactMetric> {
    const id = this.impactMetricIdCounter++;
    const now = new Date();
    const metric: ImpactMetric = {
      ...insertMetric,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.impactMetrics.set(id, metric);
    return metric;
  }

  async updateImpactMetric(id: number, metricData: Partial<InsertImpactMetric>): Promise<ImpactMetric | undefined> {
    const existingMetric = await this.getImpactMetric(id);
    if (!existingMetric) {
      return undefined;
    }

    const updatedMetric: ImpactMetric = {
      ...existingMetric,
      ...metricData,
      updatedAt: new Date()
    };

    this.impactMetrics.set(id, updatedMetric);
    return updatedMetric;
  }

  async listImpactMetrics(): Promise<ImpactMetric[]> {
    return Array.from(this.impactMetrics.values());
  }

  async listImpactMetricsByCategory(category: string): Promise<ImpactMetric[]> {
    return Array.from(this.impactMetrics.values())
      .filter(metric => metric.category === category);
  }

  async listImpactMetricsBySDG(sdgGoal: number): Promise<ImpactMetric[]> {
    return Array.from(this.impactMetrics.values())
      .filter(metric => metric.sdgGoal === sdgGoal);
  }

  // Project Impact operations
  async getProjectImpact(id: number): Promise<ProjectImpact | undefined> {
    return this.projectImpacts.get(id);
  }

  async createProjectImpact(insertImpact: InsertProjectImpact): Promise<ProjectImpact> {
    const id = this.projectImpactIdCounter++;
    const now = new Date();
    const impact: ProjectImpact = {
      ...insertImpact,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.projectImpacts.set(id, impact);
    return impact;
  }

  async updateProjectImpact(id: number, impactData: Partial<InsertProjectImpact>): Promise<ProjectImpact | undefined> {
    const existingImpact = await this.getProjectImpact(id);
    if (!existingImpact) {
      return undefined;
    }

    const updatedImpact: ProjectImpact = {
      ...existingImpact,
      ...impactData,
      updatedAt: new Date()
    };

    this.projectImpacts.set(id, updatedImpact);
    return updatedImpact;
  }

  async listProjectImpacts(): Promise<ProjectImpact[]> {
    return Array.from(this.projectImpacts.values());
  }

  async listProjectImpactsByProject(projectId: number): Promise<ProjectImpact[]> {
    return Array.from(this.projectImpacts.values())
      .filter(impact => impact.projectId === projectId);
  }

  async listProjectImpactsByMetric(metricId: number): Promise<ProjectImpact[]> {
    return Array.from(this.projectImpacts.values())
      .filter(impact => impact.metricId === metricId);
  }

  // Opportunity operations
  async getOpportunity(id: number): Promise<any | undefined> {
    return this.opportunities.get(id);
  }

  async createOpportunity(opportunity: any): Promise<any> {
    const id = this.opportunityIdCounter++;
    const now = new Date();
    const newOpportunity = {
      ...opportunity,
      id,
      createdAt: now,
      updatedAt: now,
      status: 'active'
    };
    this.opportunities.set(id, newOpportunity);
    return newOpportunity;
  }

  async updateOpportunity(id: number, opportunity: Partial<any>): Promise<any | undefined> {
    const existing = await this.getOpportunity(id);
    if (!existing) {
      return undefined;
    }

    const updated = {
      ...existing,
      ...opportunity,
      updatedAt: new Date()
    };

    this.opportunities.set(id, updated);
    return updated;
  }

  async listOpportunities(): Promise<any[]> {
    return Array.from(this.opportunities.values());
  }

  async listOpportunitiesByOrganization(organizationId: number): Promise<any[]> {
    return Array.from(this.opportunities.values())
      .filter(opp => opp.organizationId === organizationId);
  }

  // Application operations
  async getApplication(id: number): Promise<any | undefined> {
    return this.applications.get(id);
  }

  async createApplication(application: any): Promise<any> {
    const id = this.applicationIdCounter++;
    const now = new Date();
    const newApplication = {
      ...application,
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };
    this.applications.set(id, newApplication);
    return newApplication;
  }

  async updateApplication(id: number, application: Partial<any>): Promise<any | undefined> {
    const existing = await this.getApplication(id);
    if (!existing) {
      return undefined;
    }

    const updated = {
      ...existing,
      ...application,
      updatedAt: new Date()
    };

    this.applications.set(id, updated);
    return updated;
  }

  async listApplications(): Promise<any[]> {
    return Array.from(this.applications.values());
  }

  async listApplicationsByOpportunity(opportunityId: number): Promise<any[]> {
    return Array.from(this.applications.values())
      .filter(app => app.opportunityId === opportunityId);
  }

  async listApplicationsByVolunteer(volunteerId: number): Promise<any[]> {
    return Array.from(this.applications.values())
      .filter(app => app.volunteerId === volunteerId);
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

    // Use the imported matching algorithm
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
    return this.projectAssignments.get(id);
  }

  async createProjectAssignment(assignment: InsertProjectAssignment): Promise<ProjectAssignment> {
    const id = this.projectAssignmentIdCounter++;
    const now = new Date();
    const newAssignment: ProjectAssignment = {
      ...assignment,
      id,
      hoursCompleted: assignment.hoursCompleted ?? 0,
      status: assignment.status || 'active',
      assignedAt: assignment.assignedAt || now,
      completedAt: assignment.completedAt || null,
      createdAt: now,
      updatedAt: now
    };
    this.projectAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async updateProjectAssignment(id: number, assignment: Partial<InsertProjectAssignment>): Promise<ProjectAssignment | undefined> {
    const existing = await this.getProjectAssignment(id);
    if (!existing) {
      return undefined;
    }

    const updated: ProjectAssignment = {
      ...existing,
      ...assignment,
      updatedAt: new Date()
    };

    this.projectAssignments.set(id, updated);
    return updated;
  }

  async listProjectAssignments(): Promise<ProjectAssignment[]> {
    return Array.from(this.projectAssignments.values());
  }

  async listProjectAssignmentsByProject(projectId: number): Promise<ProjectAssignment[]> {
    return Array.from(this.projectAssignments.values())
      .filter(assignment => assignment.projectId === projectId);
  }

  async listProjectAssignmentsByVolunteer(volunteerId: number): Promise<ProjectAssignment[]> {
    return Array.from(this.projectAssignments.values())
      .filter(assignment => assignment.volunteerId === volunteerId);
  }

  async deleteProjectAssignment(id: number): Promise<boolean> {
    return this.projectAssignments.delete(id);
  }

  // Volunteer operations (matching system)
  async getVolunteer(id: string): Promise<Volunteer | undefined> {
    return this.volunteersMap.get(id);
  }

  async createVolunteer(insertVolunteer: InsertVolunteer): Promise<Volunteer> {
    const now = new Date();
    const id = crypto.randomUUID();
    const volunteer: Volunteer = {
      ...insertVolunteer,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.volunteersMap.set(id, volunteer);
    return volunteer;
  }

  async updateVolunteer(id: string, volunteerData: Partial<InsertVolunteer>): Promise<Volunteer | undefined> {
    const existing = await this.getVolunteer(id);
    if (!existing) {
      return undefined;
    }

    const updated: Volunteer = {
      ...existing,
      ...volunteerData,
      updatedAt: new Date()
    };

    this.volunteersMap.set(id, updated);
    return updated;
  }

  async deleteVolunteer(id: string): Promise<boolean> {
    return this.volunteersMap.delete(id);
  }

  async listVolunteers(): Promise<Volunteer[]> {
    return Array.from(this.volunteersMap.values());
  }

  // Matchable Organization operations
  async getMatchableOrganization(id: string): Promise<MatchableOrganization | undefined> {
    return this.matchableOrganizationsMap.get(id);
  }

  async createMatchableOrganization(insertOrg: InsertMatchableOrganization): Promise<MatchableOrganization> {
    const now = new Date();
    const id = crypto.randomUUID();
    const organization: MatchableOrganization = {
      ...insertOrg,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.matchableOrganizationsMap.set(id, organization);
    return organization;
  }

  async updateMatchableOrganization(id: string, orgData: Partial<InsertMatchableOrganization>): Promise<MatchableOrganization | undefined> {
    const existing = await this.getMatchableOrganization(id);
    if (!existing) {
      return undefined;
    }

    const updated: MatchableOrganization = {
      ...existing,
      ...orgData,
      updatedAt: new Date()
    };

    this.matchableOrganizationsMap.set(id, updated);
    return updated;
  }

  async deleteMatchableOrganization(id: string): Promise<boolean> {
    return this.matchableOrganizationsMap.delete(id);
  }

  async listMatchableOrganizations(): Promise<MatchableOrganization[]> {
    return Array.from(this.matchableOrganizationsMap.values());
  }

  // Match operations
  async getMatch(id: number): Promise<Match | undefined> {
    return this.matchesMap.get(id);
  }

  async createMatch(insertMatch: InsertMatch): Promise<Match> {
    // Validate that volunteer and organization exist
    const volunteer = await this.getVolunteer(insertMatch.volunteerId);
    if (!volunteer) {
      throw new Error(`Volunteer with id ${insertMatch.volunteerId} does not exist`);
    }

    const organization = await this.getMatchableOrganization(insertMatch.organizationId);
    if (!organization) {
      throw new Error(`Organization with id ${insertMatch.organizationId} does not exist`);
    }

    const id = this.matchIdCounter++;
    const now = new Date();
    const match: Match = {
      ...insertMatch,
      id,
      createdAt: now,
      updatedAt: now
    };
    this.matchesMap.set(id, match);
    return match;
  }

  async updateMatch(id: number, matchData: Partial<InsertMatch>): Promise<Match | undefined> {
    const existing = await this.getMatch(id);
    if (!existing) {
      return undefined;
    }

    // Validate volunteer if being updated
    if (matchData.volunteerId) {
      const volunteer = await this.getVolunteer(matchData.volunteerId);
      if (!volunteer) {
        throw new Error(`Volunteer with id ${matchData.volunteerId} does not exist`);
      }
    }

    // Validate organization if being updated
    if (matchData.organizationId) {
      const organization = await this.getMatchableOrganization(matchData.organizationId);
      if (!organization) {
        throw new Error(`Organization with id ${matchData.organizationId} does not exist`);
      }
    }

    const updated: Match = {
      ...existing,
      ...matchData,
      updatedAt: new Date()
    };

    this.matchesMap.set(id, updated);
    return updated;
  }

  async upsertMatch(insertMatch: InsertMatch): Promise<Match> {
    // Validate that volunteer and organization exist
    const volunteer = await this.getVolunteer(insertMatch.volunteerId);
    if (!volunteer) {
      throw new Error(`Volunteer with id ${insertMatch.volunteerId} does not exist`);
    }

    const organization = await this.getMatchableOrganization(insertMatch.organizationId);
    if (!organization) {
      throw new Error(`Organization with id ${insertMatch.organizationId} does not exist`);
    }

    // Check if match already exists for this volunteer-organization pair
    const existingMatch = Array.from(this.matchesMap.values()).find(
      match => match.volunteerId === insertMatch.volunteerId && 
               match.organizationId === insertMatch.organizationId
    );

    if (existingMatch) {
      // Update existing match with new score
      const updated: Match = {
        ...existingMatch,
        score: insertMatch.score,
        matchedOn: new Date(),
        updatedAt: new Date()
      };
      this.matchesMap.set(existingMatch.id, updated);
      return updated;
    } else {
      // Create new match
      const id = this.matchIdCounter++;
      const now = new Date();
      const match: Match = {
        ...insertMatch,
        id,
        createdAt: now,
        updatedAt: now
      };
      this.matchesMap.set(id, match);
      return match;
    }
  }

  async deleteMatch(id: number): Promise<boolean> {
    return this.matchesMap.delete(id);
  }

  async listMatches(): Promise<Match[]> {
    return Array.from(this.matchesMap.values());
  }

  async listMatchesByVolunteer(volunteerId: string): Promise<Match[]> {
    return Array.from(this.matchesMap.values())
      .filter(match => match.volunteerId === volunteerId);
  }

  async listMatchesByOrganization(organizationId: string): Promise<Match[]> {
    return Array.from(this.matchesMap.values())
      .filter(match => match.organizationId === organizationId);
  }
}

export const storage = new MemStorage();

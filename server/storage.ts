import { 
  users, 
  organizations, 
  projects, 
  tasks, 
  volunteerActivities, 
  impactMetrics, 
  projectImpacts,
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
  type InsertProjectImpact
} from "@shared/schema";

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

  private userIdCounter: number;
  private organizationIdCounter: number;
  private projectIdCounter: number;
  private taskIdCounter: number;
  private volunteerActivityIdCounter: number;
  private impactMetricIdCounter: number;
  private projectImpactIdCounter: number;
  private opportunityIdCounter: number;
  private applicationIdCounter: number;

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

    this.userIdCounter = 1;
    this.organizationIdCounter = 1;
    this.projectIdCounter = 1;
    this.taskIdCounter = 1;
    this.volunteerActivityIdCounter = 1;
    this.impactMetricIdCounter = 1;
    this.projectImpactIdCounter = 1;
    this.opportunityIdCounter = 1;
    this.applicationIdCounter = 1;

    // Initialize with some common SDG-related impact metrics
    this.initializeImpactMetrics();
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
    // For now, return a simple implementation
    // In a real system, this would call the matching algorithm
    return {
      opportunityId,
      volunteerId,
      score: 0,
      matchReasons: []
    };
  }
}

export const storage = new MemStorage();

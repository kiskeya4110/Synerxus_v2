import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage, DuplicateAssignmentError } from "./storage";
import { WebSocketServer } from "ws";
import { 
  insertUserSchema, 
  insertOrganizationSchema, 
  insertProjectSchema, 
  insertTaskSchema, 
  insertVolunteerActivitySchema, 
  insertImpactMetricSchema, 
  insertProjectImpactSchema,
  insertVolunteerSchema,
  insertMatchableOrganizationSchema,
  insertMatchSchema,
  insertCalendarEventSchema,
  insertMessageSchema,
  insertOpportunitySchema,
  insertApplicationSchema,
  insertProjectAssignmentSchema,
  insertEmployeeCommitmentSchema,
  insertEmployeeActivityLogSchema,
  insertEmployeeMilestoneSchema,
  insertCSRCommitmentGoalSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { runMatchmaker, getVolunteerMatches, getOrganizationMatches } from "./matchmaker-service";
import { calculateMatchScore, findTopMatches, findTopVolunteers, deriveCategoryFromSDGs } from "./matching-algorithm";
import { getDashboardDataForOrganization, getDashboardDataForVolunteer, getProjectsForVolunteer, getSDGContributionsForOrganization, getVisibleProjectIdsForVolunteer } from "./dashboard-service";
import { getRecommendedVolunteersForTask, getRecommendedVolunteersForProject } from "./task-matching-service";
import { updateVolunteerProfileWithUser } from "./profile-service";
import { notifyProjectUpdate, notifyNewAssignment, notifyTaskAssigned, notifyApplicationStatusChange } from "./notification-service";
import { sendWeeklyDigest, sendWeeklyDigestsToAll, sendOrganizationWeeklyDigest } from "./email-digest-service";
import OpenAI from "openai";
import { suggestSDGsFromText } from "@shared/sdg-goals";

// ===== DEDUPLICATION HELPER FUNCTIONS =====
/**
 * Detects duplicate impacts within a time window (±6 hours)
 * Returns a dedup group ID if duplicates are found, null otherwise
 */
async function detectDuplicateImpact(
  projectId: number,
  userId: number,
  metricId: number,
  outcomeType: string,
  loggedDate: Date,
  storage: any
): Promise<{ isDuplicate: boolean; dedupGroupId?: number; matchingImpacts?: any[] }> {
  try {
    const allImpacts = await storage.listProjectImpacts();
    const projectImpacts = allImpacts.filter((i: any) => i.projectId === projectId && i.metricId === metricId);
    
    // For shared outcomes, check for duplicates within same day and project
    if (outcomeType === 'shared') {
      const timeWindowMs = 6 * 60 * 60 * 1000; // ±6 hours
      const loggedTime = loggedDate.getTime();
      
      const duplicates = projectImpacts.filter((impact: any) => {
        const impactTime = new Date(impact.date).getTime();
        const timeDiff = Math.abs(loggedTime - impactTime);
        return timeDiff <= timeWindowMs && impact.outcomeType === 'shared';
      });
      
      if (duplicates.length > 0) {
        return {
          isDuplicate: true,
          dedupGroupId: duplicates[0].dedupGroupId || duplicates[0].id,
          matchingImpacts: duplicates
        };
      }
    }
    
    return { isDuplicate: false };
  } catch (err) {
    console.error("Error detecting duplicate impacts:", err);
    return { isDuplicate: false };
  }
}

/**
 * Applies role-based attribution weighting
 * Lead Role: 100% attribution
 * Support Role: 50% attribution  
 * Observer Role: 0% (logged for participation only)
 */
function applyRoleBasedAttribution(value: number, role: string): number {
  switch (role) {
    case 'lead':
      return value;
    case 'support':
      return Math.round(value * 0.5);
    case 'observer':
      return 0;
    default:
      return value;
  }
}

// Helper function to calculate volunteer profile completion percentage
function calculateProfileCompletion(profile: Record<string, any>): number {
  let completedFields = 0;
  const totalFields = 7;
  
  if (profile.skills && Array.isArray(profile.skills) && profile.skills.length > 0) completedFields++;
  if (profile.location) completedFields++;
  if (profile.bio) completedFields++;
  if (profile.preferredSdgs && Array.isArray(profile.preferredSdgs) && profile.preferredSdgs.length > 0) completedFields++;
  if (profile.interests && Array.isArray(profile.interests) && profile.interests.length > 0) completedFields++;
  if (typeof profile.weeklyAvailability === 'number' && profile.weeklyAvailability > 0) completedFields++;
  if (profile.preferredWorkStyle) completedFields++;
  
  return Math.min(100, Math.round((completedFields / totalFields) * 100));
}

// Helper function to handle validation and authorization errors
function handleValidationError(err: unknown) {
  // Handle authorization errors (plain objects with status/message)
  if (err && typeof err === 'object' && 'status' in err && 'message' in err) {
    return {
      status: (err as any).status,
      message: (err as any).message
    };
  }
  
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return {
      status: 400,
      message: validationError.message
    };
  }
  
  // Handle unknown errors
  return {
    status: 500,
    message: err instanceof Error ? err.message : "Unknown error occurred"
  };
}

// Authorization helper to extract userId from request
function extractUserId(req: Request): number | null {
  const userIdStr = (req.body as Record<string, any>).userId || (req.query.userId as string) || (req.headers['x-user-id'] as string);
  if (!userIdStr) return null;
  const userId = parseInt(userIdStr);
  return isNaN(userId) ? null : userId;
}

// **AI Algorithm**: Calculate project completion percentage based on multiple factors
async function calculateProjectProgress(projectId: number): Promise<number> {
  try {
    const project = await storage.getProject(projectId);
    if (!project) return 0;

    // Get project tasks, activities, and impacts
    const tasks = (await storage.listTasks()).filter((t) => t.projectId === projectId);
    const activities = (await storage.listVolunteerActivities()).filter((a) => a.projectId === projectId);
    const impacts = await storage.listProjectImpactsByProject(projectId);

    // Calculate three progress metrics (weighted)
    let progressScore = 0;

    // **40% Weight: Task Completion Ratio**
    if (tasks.length > 0) {
      const completedTasks = tasks.filter((t) => t.status?.toLowerCase() === "completed").length;
      const taskProgress = (completedTasks / tasks.length) * 100;
      progressScore += taskProgress * 0.4;
    }

    // **35% Weight: Hours Logged vs Expected Hours**
    const totalHoursLogged = activities.reduce((sum: number, a) => sum + (a.hours || 0), 0);
    if (project.projectTotalHours || (project.ongoingHoursPerWeek && project.ongoingHoursPerWeek > 0)) {
      const expectedHours = project.projectTotalHours || (project.ongoingHoursPerWeek! * 4); // Assume 4 weeks
      const hoursProgress = Math.min((totalHoursLogged / expectedHours) * 100, 100);
      progressScore += hoursProgress * 0.35;
    } else {
      // If no hours target set, assume logged hours indicate progress
      progressScore += Math.min(totalHoursLogged * 5, 100) * 0.35; // Each hour = 5%
    }

    // **25% Weight: Impact Metrics Logged**
    const impactProgress = impacts.length > 0 ? 100 : Math.min(totalHoursLogged * 2, 50); // Activities contribute up to 50%
    progressScore += impactProgress * 0.25;

    return Math.round(Math.min(progressScore, 100));
  } catch (err) {
    console.error("Error calculating project progress:", err);
    return 0;
  }
}

// Authorization helper to require organization user
async function requireOrgUser(req: Request) {
  const userId = extractUserId(req);
  if (!userId) {
    throw { status: 401, message: "Authentication required" };
  }
  
  const user = await storage.getUser(userId);
  if (!user) {
    throw { status: 401, message: "Authentication required" };
  }
  
  if (user.userType !== 'organization') {
    throw { status: 403, message: "Organization authorization required" };
  }
  
  if (!user.organizationId) {
    throw { status: 403, message: "Organization authorization required" };
  }
  
  return user;
}

// Authorization helper to verify resource ownership
function verifyOwnership(user: any, resource: any) {
  if (resource.organizationId !== user.organizationId) {
    throw { status: 403, message: "Resource not owned by your organization" };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  let wss: WebSocketServer | null = null;
  
  // Only set up WebSocket server in production to avoid conflicts with Vite's HMR
  if (process.env.NODE_ENV === "production") {
    wss = new WebSocketServer({ server: httpServer });
    
    wss.on("connection", (ws) => {
      console.log("WebSocket client connected");
      
      ws.on("message", (message) => {
        console.log("Received message:", message);
      });
      
      ws.on("close", () => {
        console.log("WebSocket client disconnected");
      });
    });
  }

  // Broadcast updates to all connected clients (only in production)
  const broadcastUpdate = (type: string, data: any) => {
    if (wss && process.env.NODE_ENV === "production") {
      const message = JSON.stringify({ type, data });
      wss.clients.forEach((client) => {
        if (client.readyState === 1) { // OPEN
          client.send(message);
        }
      });
    }
  };

  // API Routes
  // === User Routes ===
  app.get("/api/users", async (req, res) => {
    try {
      const { userType } = req.query;
      const users = await storage.listUsers();
      
      // Server-side filtering for userType
      if (userType) {
        const filtered = users.filter((u: any) => u.userType === userType);
        return res.json(filtered);
      }
      
      res.json(users);
    } catch (err) {
      console.error("Error fetching users:", err);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get current user - uses userId from query parameter or defaults to user ID 1 for backward compatibility
  app.get("/api/users/me", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      // Default to user ID 1 for backward compatibility if userId not provided
      const userId = userIdParam ? parseInt(userIdParam) : 1;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (err) {
      console.error("Error fetching current user:", err);
      res.status(500).json({ message: "Failed to fetch current user" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(user);
    } catch (err) {
      console.error("Error fetching user:", err);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users/firebase-sync", async (req, res) => {
    try {
      const { firebaseUid, email, displayName, userType } = req.body;
      
      if (!firebaseUid || !email) {
        return res.status(400).json({ message: "Missing required fields: firebaseUid, email" });
      }
      
      // Check if user already exists by Firebase UID
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (user) {
        // User exists with this Firebase UID, return it (login case)
        return res.json(user);
      }
      
      // Check if user exists by email (re-linking case for migrated users)
      user = await storage.getUserByEmail(email);
      
      if (user) {
        // User exists in database but needs Firebase UID updated (migration case)
        const updatedUser = await storage.updateUser(user.id, { 
          firebaseUid,
          displayName: displayName || user.displayName
        });
        console.log(`Re-linked existing user ${email} to new Firebase account`);
        return res.json(updatedUser);
      }
      
      // User doesn't exist at all, create new one (registration case)
      if (!userType) {
        return res.status(400).json({ message: "userType is required for new user registration" });
      }
      
      const username = email.split('@')[0] + '_' + Date.now();
      const userData = {
        firebaseUid,
        username,
        email,
        displayName: displayName || email.split('@')[0],
        userType,
      };
      
      user = await storage.createUser(userData);
      broadcastUpdate("user_created", user);
      res.status(201).json(user);
    } catch (err) {
      console.error("Error syncing Firebase user:", err);
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      broadcastUpdate("user_created", user);
      res.status(201).json(user);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/users/:id", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const userData = insertUserSchema.partial().parse(req.body);
      
      const updatedUser = await storage.updateUser(userId, userData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      broadcastUpdate("user_updated", updatedUser);
      res.json(updatedUser);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Organization Routes ===
  app.get("/api/organizations", async (req, res) => {
    try {
      const organizations = await storage.listOrganizations();
      res.json(organizations);
    } catch (err) {
      console.error("Error fetching organizations:", err);
      res.status(500).json({ message: "Failed to fetch organizations" });
    }
  });

  // Get public stats for all organizations (used by volunteers browsing organizations)
  app.get("/api/organizations/public-stats", async (req, res) => {
    try {
      const organizations = await storage.listOrganizations();
      const allProjects = await storage.listProjects();
      const allOpportunities = await storage.listOpportunities();
      const allProjectAssignments = await storage.listProjectAssignments();
      const allActivities = await storage.listVolunteerActivities();
      const allImpacts = await storage.listProjectImpacts();
      const matchableOrgs = await storage.listMatchableOrganizations();
      const allTasks = await storage.listTasks();

      const orgStats = organizations.map((org) => {
        // Projects for this organization
        const orgProjects = allProjects.filter((p) => p.organizationId === org.id);
        const orgProjectIds = new Set(orgProjects.map((p) => p.id));
        
        // Volunteers assigned to this org's projects
        const orgAssignments = allProjectAssignments.filter((pa) => orgProjectIds.has(pa.projectId!));
        const uniqueVolunteerIds = new Set(orgAssignments.map((pa) => pa.volunteerId));
        
        // Opportunities for this organization
        const orgOpportunities = allOpportunities.filter((o) => o.organizationId === org.id);
        const activeOpportunities = orgOpportunities.filter((o) => o.status === 'open' || o.status === 'active');
        
        // Completed projects
        const completedProjects = orgProjects.filter((p) => p.status === 'completed' || p.completionPercentage === 100);
        
        // Total hours contributed
        const orgActivities = allActivities.filter((a) => a.projectId && orgProjectIds.has(a.projectId));
        const totalHours = orgActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
        
        // Total people impacted
        const orgImpacts = allImpacts.filter((i) => i.projectId && orgProjectIds.has(i.projectId));
        const totalPeopleImpacted = orgImpacts.reduce((sum, i) => sum + (i.value || 0), 0);
        
        // Calculate task metrics
        const orgTasks = allTasks.filter((t) => t.projectId && orgProjectIds.has(t.projectId));
        const completedTasks = orgTasks.filter((t) => t.status?.toLowerCase() === 'completed').length;
        const totalTasks = orgTasks.length;
        
        // Get unique SDGs across all projects
        const uniqueSDGs = new Set<number>();
        orgProjects.forEach((project) => {
          if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
            project.sdgGoals.forEach((goal: number) => uniqueSDGs.add(goal));
          }
        });
        
        // Calculate Impact Score - ALIGNED with organization dashboard formula
        // This ensures consistency between public-stats and the global impact report
        const hoursScore = Math.min((totalHours / 100) * 100, 100);
        const peopleScore = Math.min((totalPeopleImpacted / 100) * 100, 100);
        const tasksScore = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const sdgScore = (uniqueSDGs.size / 17) * 100;
        const engagementScore = Math.min((uniqueVolunteerIds.size / 10) * 100, 100);
        
        // Weighted formula: Hours 35%, People 30%, Tasks 20%, SDG 10%, Engagement 5%
        const impactScore = Math.round(
          hoursScore * 0.35 +
          peopleScore * 0.30 +
          tasksScore * 0.20 +
          sdgScore * 0.10 +
          engagementScore * 0.05
        );
        
        // Get matchable org profile data for SDG focus (match by id string, name, or email)
        const profile = matchableOrgs.find((m) => 
          m.id === String(org.id) || 
          m.name?.toLowerCase() === org.name?.toLowerCase() ||
          m.email === org.contactEmail
        );

        return {
          id: org.id,
          name: org.name,
          description: org.description,
          logo: org.logo,
          website: org.website,
          contactEmail: org.contactEmail,
          stats: {
            projectCount: orgProjects.length,
            volunteerCount: uniqueVolunteerIds.size,
            activeOpportunities: activeOpportunities.length,
            completedProjects: completedProjects.length,
            totalHours,
            totalPeopleImpacted,
            impactScore
          },
          profile: profile ? {
            location: profile.location,
            sdgFocus: profile.sdgFocus,
            mission: profile.mission
          } : null
        };
      });

      res.json(orgStats);
    } catch (err) {
      console.error("Error fetching organization public stats:", err);
      res.status(500).json({ message: "Failed to fetch organization stats" });
    }
  });

  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const organization = await storage.getOrganization(orgId);
      
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      res.json(organization);
    } catch (err) {
      console.error("Error fetching organization:", err);
      res.status(500).json({ message: "Failed to fetch organization" });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    try {
      const orgData = insertOrganizationSchema.parse(req.body);
      const organization = await storage.createOrganization(orgData);
      
      broadcastUpdate("organization_created", organization);
      res.status(201).json(organization);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/organizations/:id", async (req, res) => {
    try {
      const orgId = parseInt(req.params.id);
      const orgData = insertOrganizationSchema.partial().parse(req.body);
      
      const updatedOrg = await storage.updateOrganization(orgId, orgData);
      if (!updatedOrg) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      broadcastUpdate("organization_updated", updatedOrg);
      res.json(updatedOrg);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Project Routes ===
  app.get("/api/projects", async (req, res) => {
    try {
      const { organizationId, userId } = req.query;
      
      // Require either organizationId or userId for data partitioning and security
      if (!organizationId && !userId) {
        return res.status(401).json({ 
          message: "Authentication required: userId must be provided" 
        });
      }

      let projects;
      if (organizationId) {
        // Filter by organization
        projects = await storage.listProjectsByOrganization(parseInt(organizationId as string));
      } else if (userId) {
        // Filter by user - get their assigned projects or organization's projects
        const userIdNum = parseInt(userId as string);
        const user = await storage.getUser(userIdNum);
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.userType === 'organization' && user.organizationId) {
          // Organization user - return only their organization's projects
          projects = await storage.listProjectsByOrganization(user.organizationId);
        } else if (user.userType === 'volunteer') {
          // Volunteer user - return only visible projects (excludes declined assignments)
          const visibleProjectIds = await getVisibleProjectIdsForVolunteer(userIdNum, false);
          const allProjects = await storage.listProjects();
          projects = allProjects.filter(p => visibleProjectIds.has(p.id));
        } else {
          return res.status(400).json({ message: "Invalid user type" });
        }
      } else {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      res.json(projects);
    } catch (err) {
      console.error("Error fetching projects:", err);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { userId } = req.query;
      
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Verify access permissions when userId is provided
      // TODO: Make userId required in future auth refactor for proper data partitioning
      if (userId) {
        const userIdNum = parseInt(userId as string);
        const user = await storage.getUser(userIdNum);
        
        if (user) {
          if (user.userType === 'volunteer') {
            // Check if volunteer has access to this project
            const visibleProjectIds = await getVisibleProjectIdsForVolunteer(userIdNum, false);
            if (!visibleProjectIds.has(projectId)) {
              return res.status(404).json({ message: "Project not found" });
            }
          } else if (user.userType === 'organization' && user.organizationId) {
            // Check if project belongs to this organization
            if (project.organizationId !== user.organizationId) {
              return res.status(404).json({ message: "Project not found" });
            }
          }
        }
      }
      
      res.json(project);
    } catch (err) {
      console.error("Error fetching project:", err);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      // Authorization: require organization user
      const user = await requireOrgUser(req);
      
      const projectData = insertProjectSchema.parse(req.body);
      
      // Verify ownership: payload organizationId must match user's organizationId
      if (projectData.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Resource not owned by your organization" });
      }
      
      const project = await storage.createProject(projectData);
      
      broadcastUpdate("project_created", project);
      res.status(201).json(project);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/projects/:id", async (req, res) => {
    try {
      // Authorization: require organization user
      const user = await requireOrgUser(req);
      
      const projectId = parseInt(req.params.id);
      
      // Verify ownership: fetch existing project
      const existingProject = await storage.getProject(projectId);
      if (!existingProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      verifyOwnership(user, existingProject);
      
      const projectData = insertProjectSchema.partial().parse(req.body);
      
      const updatedProject = await storage.updateProject(projectId, projectData);
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const assignments = await storage.listProjectAssignmentsByProject(projectId);
      const activeAssignments = assignments.filter(a => a.status === 'active' || a.status === 'pending');
      
      for (const assignment of activeAssignments) {
        await notifyProjectUpdate(
          projectId,
          assignment.volunteerId,
          "Project details have been updated",
          updatedProject.name
        );
      }
      
      broadcastUpdate("project_updated", updatedProject);
      res.json(updatedProject);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Task Routes ===
  app.get("/api/tasks", async (req, res) => {
    try {
      const { projectId, assigneeId, userId } = req.query;
      
      let tasks;
      if (projectId) {
        tasks = await storage.listTasksByProject(parseInt(projectId as string));
      } else if (assigneeId) {
        tasks = await storage.listTasksByAssignee(parseInt(assigneeId as string));
      } else if (userId) {
        // Filter tasks for specific user based on their role
        const userIdNum = parseInt(userId as string);
        const user = await storage.getUser(userIdNum);
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.userType === 'organization' && user.organizationId) {
          // Organization user - return tasks from their projects
          const orgProjects = await storage.listProjectsByOrganization(user.organizationId);
          const orgProjectIds = new Set(orgProjects.map(p => p.id));
          const allTasks = await storage.listTasks();
          tasks = allTasks.filter(t => t.projectId && orgProjectIds.has(t.projectId));
        } else if (user.userType === 'volunteer') {
          // Volunteer user - return ONLY tasks directly assigned to them
          // Strict data partitioning: volunteers only see tasks they're explicitly assigned to
          tasks = await storage.listTasksByAssignee(userIdNum);
        } else {
          return res.status(400).json({ message: "Invalid user type" });
        }
      } else {
        // For backward compatibility, allow listing all tasks without userId
        // TODO: Require userId for proper data partitioning in future auth refactor
        tasks = await storage.listTasks();
      }
      
      res.json(tasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const { userId } = req.query;
      
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Verify access permissions when userId is provided
      // TODO: Make userId required in future auth refactor for proper data partitioning
      if (userId) {
        const userIdNum = parseInt(userId as string);
        const user = await storage.getUser(userIdNum);
        
        if (user) {
          if (user.userType === 'volunteer') {
            // Strict data partitioning: volunteers can only access tasks directly assigned to them
            const isDirectlyAssigned = task.assigneeId === userIdNum;
            
            if (!isDirectlyAssigned) {
              return res.status(404).json({ message: "Task not found" });
            }
          } else if (user.userType === 'organization' && user.organizationId) {
            // Check if task belongs to this organization's projects
            if (task.projectId) {
              const project = await storage.getProject(task.projectId);
              if (!project || project.organizationId !== user.organizationId) {
                return res.status(404).json({ message: "Task not found" });
              }
            }
          }
        }
      }
      
      res.json(task);
    } catch (err) {
      console.error("Error fetching task:", err);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      // Authorization: require organization user
      const user = await requireOrgUser(req);
      
      const taskData = insertTaskSchema.parse(req.body);
      
      // Verify ownership through parent project
      if (taskData.projectId) {
        const project = await storage.getProject(taskData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
        verifyOwnership(user, project);
      }
      
      const task = await storage.createTask(taskData);
      
      // Notify assignee if task was assigned
      if (task.assigneeId) {
        await notifyTaskAssigned(
          task.assigneeId,
          task.id,
          task.title,
          task.projectId || undefined
        );
      }
      
      // Recalculate project completion percentage when task is created
      if (task.projectId) {
        const project = await storage.getProject(task.projectId);
        const projectTasks = await storage.listTasksByProject(task.projectId);
        const completedTasks = projectTasks.filter(t => t.status?.toLowerCase() === "completed").length;
        const completionPercentage = projectTasks.length > 0 
          ? Math.round((completedTasks / projectTasks.length) * 100) 
          : 0;
        
        // Auto-update status based on completion percentage
        // Only auto-update if current status is auto-manageable (not manually set to "On Hold")
        let newStatus = project?.status;
        if (project && ["Planning", "In Progress", "Completed"].includes(project.status)) {
          if (completionPercentage === 0) {
            newStatus = "Planning";
          } else if (completionPercentage === 100) {
            newStatus = "Completed";
          } else {
            newStatus = "In Progress";
          }
        }
        
        await storage.updateProject(task.projectId, { 
          completionPercentage,
          ...(newStatus !== project?.status && { status: newStatus })
        });
        console.log(`[Task Create] Updated project ${task.projectId}: ${completionPercentage}% (${completedTasks}/${projectTasks.length} tasks), status: ${newStatus}`);
        
        // Broadcast project update
        const updatedProject = await storage.getProject(task.projectId);
        if (updatedProject) {
          broadcastUpdate("project_updated", updatedProject);
        }
      }
      
      broadcastUpdate("task_created", task);
      res.status(201).json(task);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      
      // Get task first to check permissions
      const existingTask = await storage.getTask(taskId);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Try session-based auth first (for organizations), then explicit userId (for volunteers)
      let currentUser;
      
      // First try requireOrgUser for existing organization flows
      try {
        currentUser = await requireOrgUser(req);
      } catch (err) {
        // If session auth fails, try explicit userId (for volunteer flows)
        const userIdFromQuery = req.query.userId ? parseInt(req.query.userId as string) : null;
        const userIdFromBody = req.body.userId ? parseInt(req.body.userId) : null;
        const currentUserId = userIdFromQuery || userIdFromBody;
        
        if (currentUserId && !isNaN(currentUserId)) {
          currentUser = await storage.getUser(currentUserId);
        }
      }
      
      if (!currentUser) {
        return res.status(401).json({ message: "Unauthorized - please log in" });
      }
      
      // Authorization: Allow either organization owner OR assigned volunteer
      let isAuthorized = false;
      
      // Check if user is organization owner
      if (currentUser.userType === 'organization' && existingTask.projectId) {
        const project = await storage.getProject(existingTask.projectId);
        if (project && project.organizationId === currentUser.organizationId) {
          isAuthorized = true;
        }
      }
      
      // Check if user is the assigned volunteer
      if (currentUser.userType === 'volunteer' && existingTask.assigneeId === currentUser.id) {
        isAuthorized = true;
      }
      
      if (!isAuthorized) {
        return res.status(403).json({ message: "Not authorized to update this task" });
      }
      
      const taskData = insertTaskSchema.partial().parse(req.body);
      
      const updatedTask = await storage.updateTask(taskId, taskData);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Notify new assignee if assignee was changed
      if (taskData.assigneeId && taskData.assigneeId !== existingTask.assigneeId) {
        await notifyTaskAssigned(
          taskData.assigneeId,
          updatedTask.id,
          updatedTask.title,
          updatedTask.projectId || undefined
        );
      }
      
      // If task status was updated and task belongs to a project, recalculate project completion
      if (taskData.status && updatedTask.projectId) {
        const project = await storage.getProject(updatedTask.projectId);
        const projectTasks = await storage.listTasksByProject(updatedTask.projectId);
        const completedTasks = projectTasks.filter(t => t.status?.toLowerCase() === "completed").length;
        const completionPercentage = projectTasks.length > 0 
          ? Math.round((completedTasks / projectTasks.length) * 100) 
          : 0;
        
        // Auto-update status based on completion percentage
        // Only auto-update if current status is auto-manageable (not manually set to "On Hold")
        let newStatus = project?.status;
        if (project && ["Planning", "In Progress", "Completed"].includes(project.status)) {
          if (completionPercentage === 0) {
            newStatus = "Planning";
          } else if (completionPercentage === 100) {
            newStatus = "Completed";
          } else {
            newStatus = "In Progress";
          }
        }
        
        await storage.updateProject(updatedTask.projectId, { 
          completionPercentage,
          ...(newStatus !== project?.status && { status: newStatus })
        });
        console.log(`[Task Update] Updated project ${updatedTask.projectId}: ${completionPercentage}% (${completedTasks}/${projectTasks.length} tasks), status: ${newStatus}`);
        
        // Broadcast project update as well
        const updatedProject = await storage.getProject(updatedTask.projectId);
        if (updatedProject) {
          broadcastUpdate("project_updated", updatedProject);
        }
      }
      
      broadcastUpdate("task_updated", updatedTask);
      res.json(updatedTask);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === AI-Powered Volunteer Recommendation Routes ===
  
  /**
   * Get recommended volunteers for a specific task based on AI matching algorithm
   * Returns volunteers sorted by match score with SDG alignment, skills, location, and interests
   */
  app.get("/api/tasks/:taskId/recommended-volunteers", async (req, res) => {
    try {
      const taskId = parseInt(req.params.taskId);
      const limit = parseInt(req.query.limit as string || "10");
      const threshold = parseInt(req.query.threshold as string || "0");
      
      // Get the task
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      // Get the project to determine organization (required for scoping)
      if (!task.projectId) {
        return res.status(400).json({ message: "Task must belong to a project for volunteer recommendations" });
      }
      
      const project = await storage.getProject(task.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get ALL volunteers connected to this organization through any of:
      // 1. Direct organization membership (organizationId field)
      // 2. Project assignments (currently/previously assigned)
      // 3. Opportunity applications (have applied to org's opportunities)
      const allUsers = await storage.listUsers();
      
      // Get all projects for this organization
      const organizationProjects = await storage.listProjects();
      const orgProjectIds = organizationProjects
        .filter(p => p.organizationId === project.organizationId)
        .map(p => p.id);
      
      // Get volunteers assigned to any project in this organization
      const allAssignments = await storage.listProjectAssignments();
      const assignedVolunteerIds = new Set(
        allAssignments
          .filter(a => orgProjectIds.includes(a.projectId))
          .map(a => a.volunteerId)
      );
      
      // Get volunteers who have applied to opportunities from this organization
      const allOpportunities = await storage.listOpportunities();
      const orgOpportunityIds = allOpportunities
        .filter(opp => opp.organizationId === project.organizationId)
        .map(opp => opp.id);
      
      const allApplications = await storage.listApplications();
      const applicantVolunteerIds = new Set(
        allApplications
          .filter(app => orgOpportunityIds.includes(app.opportunityId))
          .map(app => app.volunteerId)
      );
      
      // Filter users to volunteers connected to this organization via ANY method
      const organizationVolunteers = allUsers.filter(u => {
        if (u.userType !== 'volunteer') return false;
        
        // Include if: directly linked to org, assigned to project, or applied to opportunity
        return u.organizationId === project.organizationId ||
               assignedVolunteerIds.has(u.id!) ||
               applicantVolunteerIds.has(u.id!);
      });
      
      // Bulk fetch all volunteer profiles to avoid N+1 queries
      const allProfiles = await storage.listVolunteerProfiles();
      const profileMap = new Map(allProfiles.map(p => [p.userId, p]));
      
      // Combine volunteers with their profiles
      const volunteersWithProfiles = organizationVolunteers.map(volunteer => ({
        ...volunteer,
        profile: profileMap.get(volunteer.id!) || null
      }));
      
      // Get recommended volunteers using AI matching
      const recommendedVolunteers = getRecommendedVolunteersForTask(
        task,
        project,
        volunteersWithProfiles,
        limit,
        threshold
      );
      
      res.json(recommendedVolunteers);
    } catch (err) {
      console.error("Error getting recommended volunteers for task:", err);
      res.status(500).json({ message: "Failed to get recommended volunteers" });
    }
  });
  
  /**
   * Get recommended volunteers for a specific project based on AI matching algorithm
   * Returns volunteers sorted by match score with SDG alignment, skills, location, and interests
   */
  app.get("/api/projects/:projectId/recommended-volunteers", async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const limit = parseInt(req.query.limit as string || "10");
      const threshold = parseInt(req.query.threshold as string || "0");
      
      // Get the project
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Get ALL volunteers connected to this organization through any of:
      // 1. Direct organization membership (organizationId field)
      // 2. Project assignments (currently/previously assigned)
      // 3. Opportunity applications (have applied to org's opportunities)
      const allUsers = await storage.listUsers();
      
      // Get all projects for this organization
      const organizationProjects = await storage.listProjects();
      const orgProjectIds = organizationProjects
        .filter(p => p.organizationId === project.organizationId)
        .map(p => p.id);
      
      // Get volunteers assigned to any project in this organization
      const allAssignments = await storage.listProjectAssignments();
      const assignedVolunteerIds = new Set(
        allAssignments
          .filter(a => orgProjectIds.includes(a.projectId))
          .map(a => a.volunteerId)
      );
      
      // Get volunteers who have applied to opportunities from this organization
      const allOpportunities = await storage.listOpportunities();
      const orgOpportunityIds = allOpportunities
        .filter(opp => opp.organizationId === project.organizationId)
        .map(opp => opp.id);
      
      const allApplications = await storage.listApplications();
      const applicantVolunteerIds = new Set(
        allApplications
          .filter(app => orgOpportunityIds.includes(app.opportunityId))
          .map(app => app.volunteerId)
      );
      
      // Filter users to volunteers connected to this organization via ANY method
      const organizationVolunteers = allUsers.filter(u => {
        if (u.userType !== 'volunteer') return false;
        
        // Include if: directly linked to org, assigned to project, or applied to opportunity
        return u.organizationId === project.organizationId ||
               assignedVolunteerIds.has(u.id!) ||
               applicantVolunteerIds.has(u.id!);
      });
      
      // Bulk fetch all volunteer profiles to avoid N+1 queries
      const allProfiles = await storage.listVolunteerProfiles();
      const profileMap = new Map(allProfiles.map(p => [p.userId, p]));
      
      // Combine volunteers with their profiles
      const volunteersWithProfiles = organizationVolunteers.map(volunteer => ({
        ...volunteer,
        profile: profileMap.get(volunteer.id!) || null
      }));
      
      // Get recommended volunteers using AI matching
      const recommendedVolunteers = getRecommendedVolunteersForProject(
        project,
        volunteersWithProfiles,
        limit,
        threshold
      );
      
      res.json(recommendedVolunteers);
    } catch (err) {
      console.error("Error getting recommended volunteers for project:", err);
      res.status(500).json({ message: "Failed to get recommended volunteers" });
    }
  });

  // === Volunteer Activity Routes ===
  app.get("/api/volunteer-activities", async (req, res) => {
    try {
      const { userId, projectId } = req.query;
      
      let activities;
      if (userId) {
        activities = await storage.listVolunteerActivitiesByUser(parseInt(userId as string));
      } else if (projectId) {
        activities = await storage.listVolunteerActivitiesByProject(parseInt(projectId as string));
      } else {
        activities = await storage.listVolunteerActivities();
      }
      
      res.json(activities);
    } catch (err) {
      console.error("Error fetching volunteer activities:", err);
      res.status(500).json({ message: "Failed to fetch volunteer activities" });
    }
  });

  app.get("/api/volunteer-activities/:id", async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      const activity = await storage.getVolunteerActivity(activityId);
      
      if (!activity) {
        return res.status(404).json({ message: "Volunteer activity not found" });
      }
      
      res.json(activity);
    } catch (err) {
      console.error("Error fetching volunteer activity:", err);
      res.status(500).json({ message: "Failed to fetch volunteer activity" });
    }
  });

  app.post("/api/volunteer-activities", async (req, res) => {
    try {
      const activityData = insertVolunteerActivitySchema.parse(req.body);
      const activity = await storage.createVolunteerActivity(activityData);
      
      // **KPI Tracking**: Update assignment's hoursCompleted when activity is logged
      if (activity.projectId && activity.userId) {
        try {
          // Get activities for this project-volunteer pair using optimized query
          const userActivities = await storage.listVolunteerActivitiesByUser(activity.userId);
          const projectActivities = userActivities.filter(
            (a: any) => a.projectId === activity.projectId
          );
          
          // Calculate total hours logged
          const totalHoursLogged = projectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
          
          // Find and update the assignment
          const assignments = await storage.listProjectAssignmentsByProject(activity.projectId);
          const assignment = assignments.find((a: any) => a.volunteerId === activity.userId);
          
          if (assignment) {
            await storage.updateProjectAssignment(assignment.id, {
              hoursCompleted: totalHoursLogged,
              // Auto-complete if hours reach commitment
              status: totalHoursLogged >= (assignment.hoursCommitted || 0) ? "completed" : assignment.status
            });
          }
          
          // **AI Algorithm**: Auto-calculate and update project completion percentage
          const progressPercentage = await calculateProjectProgress(activity.projectId);
          await storage.updateProject(activity.projectId, {
            completionPercentage: progressPercentage,
            totalHoursLogged: totalHoursLogged
          });
        } catch (updateErr) {
          console.error("Error updating assignment or project progress:", updateErr);
          // Don't fail the activity creation if update fails
        }
      }

      // **CSR Dashboard KPI Tracking**: Update employee engagement hours when volunteer with employer link logs activity
      if (activity.userId && activity.hours) {
        try {
          const volunteerProfile = await storage.getVolunteerProfileByUserId(activity.userId);
          
          if (volunteerProfile?.employerId) {
            // Get user email for employee engagement tracking
            const user = await storage.getUser(activity.userId);
            if (user?.email) {
              // Get existing employee engagement record (ensure type consistency)
              const allEngagements = (await storage.listEmployeeEngagement()) || [];
              const employerIdNum = typeof volunteerProfile.employerId === 'string' 
                ? parseInt(volunteerProfile.employerId) 
                : volunteerProfile.employerId;
              
              const existing = (Array.isArray(allEngagements) ? allEngagements : []).find((e: any) =>
                e?.partnerId === employerIdNum &&
                e?.employeeEmail === user.email
              );

              if (existing) {
                // Increment hours
                await storage.updateEmployeeEngagement(existing.id, {
                  hoursVolunteered: (existing.hoursVolunteered || 0) + activity.hours,
                  projectId: activity.projectId
                });
              } else {
                // Create new employee engagement record with correct partnerId type
                await storage.createEmployeeEngagement({
                  partnerId: employerIdNum,
                  employeeEmail: user.email,
                  employeeName: volunteerProfile.volunteerName || user.displayName,
                  projectId: activity.projectId,
                  hoursVolunteered: activity.hours,
                  engagementType: 'vto',
                  impactScore: 0,
                  completionStatus: 'in-progress'
                });
              }

              // **SDG-Specific Tracking**: Track hours against corporation's SDG progress
              if (activity.projectId) {
                try {
                  const project = await storage.getProject(activity.projectId);
                  if (project?.primarySdg) {
                    // Find or create CSR challenge for this partner-SDG combination
                    const allChallenges = await storage.listCSRChallenges?.() || [];
                    const partnerChallenges = allChallenges.filter((c: any) => c.partnerId === employerIdNum && c.sdgGoal === project.primarySdg);
                    
                    if (partnerChallenges.length > 0) {
                      // Update the first matching active challenge
                      const activeChallenge = partnerChallenges.find((c: any) => c.status === 'active') || partnerChallenges[0];
                      await storage.updateCSRChallenge?.(activeChallenge.id, {
                        currentHours: (activeChallenge.currentHours || 0) + activity.hours
                      });
                    }
                  }
                } catch (sdgErr) {
                  console.error("Error updating SDG-specific hours for challenge:", sdgErr);
                  // Non-critical
                }
              }
            }
          }
        } catch (crsErr) {
          console.error("Error updating employee engagement hours:", crsErr);
          // Non-critical, don't fail the activity creation
        }
      }
      
      broadcastUpdate("volunteer_activity_created", activity);
      res.status(201).json(activity);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/volunteer-activities/:id", async (req, res) => {
    try {
      const activityId = parseInt(req.params.id);
      
      // Get the old activity to compare hours
      const oldActivity = await storage.getVolunteerActivity(activityId);
      const activityData = insertVolunteerActivitySchema.partial().parse(req.body);
      
      const updatedActivity = await storage.updateVolunteerActivity(activityId, activityData);
      if (!updatedActivity) {
        return res.status(404).json({ message: "Volunteer activity not found" });
      }
      
      // **KPI Tracking**: Recalculate and update assignment hoursCompleted when activity is updated
      if (updatedActivity.projectId && updatedActivity.userId) {
        try {
          // Get all activities for this project-volunteer pair
          const allActivities = await storage.listVolunteerActivities();
          const projectActivities = allActivities.filter(
            (a: any) => a.projectId === updatedActivity.projectId && a.userId === updatedActivity.userId
          );
          
          // Calculate total hours logged
          const totalHoursLogged = projectActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
          
          // Find and update the assignment
          const assignments = await storage.listProjectAssignmentsByProject(updatedActivity.projectId);
          const assignment = assignments.find((a: any) => a.volunteerId === updatedActivity.userId);
          
          if (assignment) {
            await storage.updateProjectAssignment(assignment.id, {
              hoursCompleted: totalHoursLogged,
              // Auto-complete if hours reach commitment
              status: totalHoursLogged >= (assignment.hoursCommitted || 0) ? "completed" : assignment.status
            });
          }
        } catch (updateErr) {
          console.error("Error updating assignment hoursCompleted:", updateErr);
          // Don't fail the activity update if assignment update fails
        }
      }

      // **CSR Dashboard KPI Tracking**: Update employee engagement hours when activity hours are changed
      if (updatedActivity.userId && oldActivity && oldActivity.hours !== updatedActivity.hours) {
        try {
          const volunteerProfile = await storage.getVolunteerProfileByUserId(updatedActivity.userId);
          if (volunteerProfile?.employerId) {
            const user = await storage.getUser(updatedActivity.userId);
            if (user?.email) {
              // Ensure type consistency for partnerId comparison
              const employerIdNum = typeof volunteerProfile.employerId === 'string' 
                ? parseInt(volunteerProfile.employerId) 
                : volunteerProfile.employerId;
              const allEngagements = (await storage.listEmployeeEngagement()) || [];
              const existing = (Array.isArray(allEngagements) ? allEngagements : []).find((e: any) =>
                e?.partnerId === employerIdNum &&
                e?.employeeEmail === user.email
              );

              if (existing) {
                // Calculate hour difference
                const hourDifference = (updatedActivity.hours || 0) - (oldActivity.hours || 0);
                await storage.updateEmployeeEngagement(existing.id, {
                  hoursVolunteered: (existing.hoursVolunteered || 0) + hourDifference
                });
              }
            }
          }
        } catch (csrErr) {
          console.error("Error updating employee engagement hours on activity update:", csrErr);
          // Non-critical, don't fail the activity update
        }
      }
      
      broadcastUpdate("volunteer_activity_updated", updatedActivity);
      res.json(updatedActivity);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Impact Metric Routes ===
  app.get("/api/impact-metrics", async (req, res) => {
    try {
      const { category, sdgGoal } = req.query;
      
      let metrics;
      if (category) {
        metrics = await storage.listImpactMetricsByCategory(category as string);
      } else if (sdgGoal) {
        metrics = await storage.listImpactMetricsBySDG(parseInt(sdgGoal as string));
      } else {
        metrics = await storage.listImpactMetrics();
      }
      
      res.json(metrics);
    } catch (err) {
      console.error("Error fetching impact metrics:", err);
      res.status(500).json({ message: "Failed to fetch impact metrics" });
    }
  });

  app.get("/api/impact-metrics/:id", async (req, res) => {
    try {
      const metricId = parseInt(req.params.id);
      const metric = await storage.getImpactMetric(metricId);
      
      if (!metric) {
        return res.status(404).json({ message: "Impact metric not found" });
      }
      
      res.json(metric);
    } catch (err) {
      console.error("Error fetching impact metric:", err);
      res.status(500).json({ message: "Failed to fetch impact metric" });
    }
  });

  app.post("/api/impact-metrics", async (req, res) => {
    try {
      const metricData = insertImpactMetricSchema.parse(req.body);
      const metric = await storage.createImpactMetric(metricData);
      
      broadcastUpdate("impact_metric_created", metric);
      res.status(201).json(metric);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/impact-metrics/:id", async (req, res) => {
    try {
      const metricId = parseInt(req.params.id);
      const metricData = insertImpactMetricSchema.partial().parse(req.body);
      
      const updatedMetric = await storage.updateImpactMetric(metricId, metricData);
      if (!updatedMetric) {
        return res.status(404).json({ message: "Impact metric not found" });
      }
      
      broadcastUpdate("impact_metric_updated", updatedMetric);
      res.json(updatedMetric);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Project Impact Routes ===
  app.get("/api/project-impacts", async (req, res) => {
    try {
      const { projectId, metricId } = req.query;
      
      let impacts;
      if (projectId) {
        impacts = await storage.listProjectImpactsByProject(parseInt(projectId as string));
      } else if (metricId) {
        impacts = await storage.listProjectImpactsByMetric(parseInt(metricId as string));
      } else {
        impacts = await storage.listProjectImpacts();
      }
      
      res.json(impacts);
    } catch (err) {
      console.error("Error fetching project impacts:", err);
      res.status(500).json({ message: "Failed to fetch project impacts" });
    }
  });

  app.get("/api/project-impacts/:id", async (req, res) => {
    try {
      const impactId = parseInt(req.params.id);
      const impact = await storage.getProjectImpact(impactId);
      
      if (!impact) {
        return res.status(404).json({ message: "Project impact not found" });
      }
      
      res.json(impact);
    } catch (err) {
      console.error("Error fetching project impact:", err);
      res.status(500).json({ message: "Failed to fetch project impact" });
    }
  });

  app.post("/api/project-impacts", async (req, res) => {
    try {
      const impactData = insertProjectImpactSchema.parse(req.body);
      
      // **DEDUPLICATION**: Detect duplicate impacts
      const dedup = await detectDuplicateImpact(
        impactData.projectId!,
        impactData.userId || 0,
        impactData.metricId!,
        impactData.outcomeType || 'individual',
        new Date(impactData.date),
        storage
      );
      
      // Apply role-based attribution weighting
      const attributedValue = applyRoleBasedAttribution(
        impactData.value,
        impactData.role || 'support'
      );
      
      // Create impact with deduplication metadata
      const impact = await storage.createProjectImpact({
        ...impactData,
        value: attributedValue,
        isDuplicated: dedup.isDuplicate,
        dedupGroupId: dedup.dedupGroupId,
        verificationStatus: impactData.verificationStatus || 'pending'
      });
      
      // **AI Algorithm**: Auto-calculate and update project completion percentage when impact is logged
      if (impact.projectId) {
        try {
          const progressPercentage = await calculateProjectProgress(impact.projectId);
          await storage.updateProject(impact.projectId, {
            completionPercentage: progressPercentage
          });
        } catch (updateErr) {
          console.error("Error updating project progress:", updateErr);
          // Don't fail impact creation if progress update fails
        }
      }
      
      broadcastUpdate("project_impact_created", {
        ...impact,
        deduplicationAlert: dedup.isDuplicate ? {
          message: "Potential duplicate detected",
          matchingCount: (dedup.matchingImpacts?.length || 0)
        } : null
      });
      res.status(201).json(impact);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/project-impacts/:id", async (req, res) => {
    try {
      const impactId = parseInt(req.params.id);
      const impactData = insertProjectImpactSchema.partial().parse(req.body);
      
      const updatedImpact = await storage.updateProjectImpact(impactId, impactData);
      if (!updatedImpact) {
        return res.status(404).json({ message: "Project impact not found" });
      }
      
      broadcastUpdate("project_impact_updated", updatedImpact);
      res.json(updatedImpact);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Calendar Events Routes ===
  app.get("/api/calendar-events", async (req, res) => {
    try {
      const events = await storage.listCalendarEvents();
      res.json(events);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.get("/api/calendar-events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const event = await storage.getCalendarEvent(eventId);
      
      if (!event) {
        return res.status(404).json({ message: "Calendar event not found" });
      }
      
      res.json(event);
    } catch (err) {
      console.error("Error fetching calendar event:", err);
      res.status(500).json({ message: "Failed to fetch calendar event" });
    }
  });

  app.post("/api/calendar-events", async (req, res) => {
    try {
      const eventData = insertCalendarEventSchema.parse(req.body);
      const event = await storage.createCalendarEvent(eventData);
      
      broadcastUpdate("calendar_event_created", event);
      res.status(201).json(event);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/calendar-events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const eventData = insertCalendarEventSchema.partial().parse(req.body);
      
      const updatedEvent = await storage.updateCalendarEvent(eventId, eventData);
      if (!updatedEvent) {
        return res.status(404).json({ message: "Calendar event not found" });
      }
      
      broadcastUpdate("calendar_event_updated", updatedEvent);
      res.json(updatedEvent);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.delete("/api/calendar-events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const deleted = await storage.deleteCalendarEvent(eventId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Calendar event not found" });
      }
      
      broadcastUpdate("calendar_event_deleted", { id: eventId });
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting calendar event:", err);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // === Message Routes ===
  app.get("/api/messages", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId query parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const sentMessages = await storage.listMessagesBySender(userId);
      const receivedMessages = await storage.listMessagesByReceiver(userId);
      
      const allMessages = [...sentMessages, ...receivedMessages].sort((a, b) => {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      res.json(allMessages);
    } catch (err) {
      console.error("Error fetching messages:", err);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.get("/api/messages/conversation/:userId", async (req, res) => {
    try {
      const otherUserId = parseInt(req.params.userId);
      const currentUserIdParam = req.query.currentUserId as string;
      
      if (!currentUserIdParam) {
        return res.status(400).json({ message: "currentUserId query parameter is required" });
      }
      
      const currentUserId = parseInt(currentUserIdParam);
      if (isNaN(currentUserId) || isNaN(otherUserId)) {
        return res.status(400).json({ message: "User IDs must be valid numbers" });
      }
      
      const conversation = await storage.listConversation(currentUserId, otherUserId);
      res.json(conversation);
    } catch (err) {
      console.error("Error fetching conversation:", err);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse(req.body);
      const message = await storage.createMessage(messageData);
      
      broadcastUpdate("message_created", message);
      res.status(201).json(message);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const updatedMessage = await storage.markMessageAsRead(messageId);
      
      if (!updatedMessage) {
        return res.status(404).json({ message: "Message not found" });
      }
      
      broadcastUpdate("message_read", updatedMessage);
      res.json(updatedMessage);
    } catch (err) {
      console.error("Error marking message as read:", err);
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  // === Conversation Thread Routes ===
  
  // Get all conversation threads for an organization
  app.get("/api/conversation-threads/organization/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "organizationId must be a valid number" });
      }
      
      const threads = await storage.listConversationThreadsByOrganization(organizationId);
      
      // Enrich threads with volunteer names
      const enrichedThreads = await Promise.all(threads.map(async (thread) => {
        const volunteer = await storage.getUser(thread.volunteerId);
        let project = null;
        if (thread.projectId) {
          project = await storage.getProject(thread.projectId);
        }
        return {
          ...thread,
          volunteerName: volunteer?.displayName || volunteer?.username || 'Unknown Volunteer',
          volunteerAvatar: volunteer?.avatar,
          projectName: project?.name || null
        };
      }));
      
      res.json(enrichedThreads);
    } catch (err) {
      console.error("Error fetching organization threads:", err);
      res.status(500).json({ message: "Failed to fetch conversation threads" });
    }
  });
  
  // Get all conversation threads for a volunteer
  app.get("/api/conversation-threads/volunteer/:volunteerId", async (req, res) => {
    try {
      const volunteerId = parseInt(req.params.volunteerId);
      if (isNaN(volunteerId)) {
        return res.status(400).json({ message: "volunteerId must be a valid number" });
      }
      
      const threads = await storage.listConversationThreadsByVolunteer(volunteerId);
      
      // Enrich threads with organization names
      const enrichedThreads = await Promise.all(threads.map(async (thread) => {
        const organization = await storage.getOrganization(thread.organizationId);
        let project = null;
        if (thread.projectId) {
          project = await storage.getProject(thread.projectId);
        }
        return {
          ...thread,
          organizationName: organization?.name || 'Unknown Organization',
          organizationLogo: organization?.logo,
          projectName: project?.name || null
        };
      }));
      
      res.json(enrichedThreads);
    } catch (err) {
      console.error("Error fetching volunteer threads:", err);
      res.status(500).json({ message: "Failed to fetch conversation threads" });
    }
  });
  
  // Get messages in a thread
  app.get("/api/conversation-threads/:threadId/messages", async (req, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "threadId must be a valid number" });
      }
      
      const thread = await storage.getConversationThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      const messages = await storage.listMessagesByThread(threadId);
      
      // Enrich messages with sender names
      const enrichedMessages = await Promise.all(messages.map(async (msg) => {
        const sender = await storage.getUser(msg.senderId);
        return {
          ...msg,
          senderName: sender?.displayName || sender?.username || 'Unknown',
          senderAvatar: sender?.avatar
        };
      }));
      
      res.json({
        thread,
        messages: enrichedMessages
      });
    } catch (err) {
      console.error("Error fetching thread messages:", err);
      res.status(500).json({ message: "Failed to fetch thread messages" });
    }
  });
  
  // Create a new conversation thread
  app.post("/api/conversation-threads", async (req, res) => {
    try {
      const { organizationId, volunteerId, topic, projectId, initialMessage } = req.body;
      
      if (!organizationId || !volunteerId || !topic) {
        return res.status(400).json({ message: "organizationId, volunteerId, and topic are required" });
      }
      
      // Check if a thread already exists with the same topic
      const existingThread = await storage.getConversationThreadBetween(
        parseInt(organizationId),
        parseInt(volunteerId),
        topic
      );
      
      if (existingThread) {
        return res.status(409).json({ 
          message: "A conversation thread with this topic already exists",
          thread: existingThread
        });
      }
      
      // Create the thread
      const thread = await storage.createConversationThread({
        organizationId: parseInt(organizationId),
        volunteerId: parseInt(volunteerId),
        topic,
        projectId: projectId ? parseInt(projectId) : null,
        status: 'active',
        lastMessageAt: new Date()
      });
      
      // If initial message provided, create it
      if (initialMessage) {
        const orgUser = await storage.getUserByOrganizationId(parseInt(organizationId));
        if (orgUser) {
          const message = await storage.createMessage({
            senderId: orgUser.id,
            receiverId: parseInt(volunteerId),
            content: initialMessage,
            messageType: 'outreach',
            threadId: thread.id
          });
          
          // Create notification for the volunteer
          await storage.createNotification({
            userId: parseInt(volunteerId),
            type: 'message',
            title: 'New Message',
            message: `You have a new message about "${topic}"`,
            relatedEntityType: 'thread',
            relatedEntityId: thread.id
          });
          
          broadcastUpdate("message_created", message);
        }
      }
      
      broadcastUpdate("thread_created", thread);
      res.status(201).json(thread);
    } catch (err) {
      console.error("Error creating conversation thread:", err);
      res.status(500).json({ message: "Failed to create conversation thread" });
    }
  });
  
  // Send a message in a thread
  app.post("/api/conversation-threads/:threadId/messages", async (req, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const { senderId, content, messageType = 'text' } = req.body;
      
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "threadId must be a valid number" });
      }
      
      if (!senderId || !content) {
        return res.status(400).json({ message: "senderId and content are required" });
      }
      
      const thread = await storage.getConversationThread(threadId);
      if (!thread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      // Determine receiver (the other party in the thread)
      const receiverId = parseInt(senderId) === thread.volunteerId 
        ? (await storage.getUserByOrganizationId(thread.organizationId))?.id 
        : thread.volunteerId;
      
      if (!receiverId) {
        return res.status(400).json({ message: "Could not determine message recipient" });
      }
      
      // Create the message
      const message = await storage.createMessage({
        senderId: parseInt(senderId),
        receiverId,
        content,
        messageType,
        threadId
      });
      
      // Update thread's lastMessageAt
      await storage.updateConversationThread(threadId, {
        lastMessageAt: new Date()
      });
      
      // Create notification
      await storage.createNotification({
        userId: receiverId,
        type: 'message',
        title: 'New Message',
        message: `New message in "${thread.topic}"`,
        relatedEntityType: 'thread',
        relatedEntityId: threadId
      });
      
      // Enrich message with sender info
      const sender = await storage.getUser(parseInt(senderId));
      const enrichedMessage = {
        ...message,
        senderName: sender?.displayName || sender?.username || 'Unknown',
        senderAvatar: sender?.avatar
      };
      
      broadcastUpdate("message_created", enrichedMessage);
      res.status(201).json(enrichedMessage);
    } catch (err) {
      console.error("Error sending message:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  // Update thread status (archive, close, etc.)
  app.patch("/api/conversation-threads/:threadId", async (req, res) => {
    try {
      const threadId = parseInt(req.params.threadId);
      const { status } = req.body;
      
      if (isNaN(threadId)) {
        return res.status(400).json({ message: "threadId must be a valid number" });
      }
      
      const updatedThread = await storage.updateConversationThread(threadId, { status });
      
      if (!updatedThread) {
        return res.status(404).json({ message: "Thread not found" });
      }
      
      broadcastUpdate("thread_updated", updatedThread);
      res.json(updatedThread);
    } catch (err) {
      console.error("Error updating thread:", err);
      res.status(500).json({ message: "Failed to update thread" });
    }
  });

  // === Opportunities Routes ===
  // Note: More specific routes must come before parameterized routes
  
  // Opportunities matches endpoint - returns AI-matched opportunities for a volunteer above threshold
  app.get("/api/opportunities/matches", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const thresholdParam = req.query.threshold as string | undefined;
      
      if (!userId) {
        return res.status(400).json({ message: "userId query parameter is required" });
      }
      
      const userIdNum = parseInt(userId);
      const threshold = thresholdParam ? parseInt(thresholdParam) : 40; // Default 40% threshold
      
      // Use secure service layer to get AI-matched opportunities
      const matchedOpportunities = await getProjectsForVolunteer(userIdNum, threshold);
      
      // Format the response with percentage and detailed breakdown
      const formattedMatches = matchedOpportunities.map((opp: any) => ({
        ...opp,
        matchPercentage: opp.matchScore, // Already 0-100
        matchReasons: opp.matchReasons
      }));
      
      res.json(formattedMatches);
    } catch (err) {
      console.error("Error fetching matched opportunities:", err);
      res.status(500).json({ message: "Failed to fetch matched opportunities", error: err instanceof Error ? err.message : String(err) });
    }
  });
  
  // Discover endpoint must come BEFORE /:id route
  app.get("/api/opportunities/discover", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      const thresholdParam = req.query.threshold as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      // Parse and validate threshold parameter (default: 50, range: 0-100)
      let matchThreshold = 50; // Default to 50% for quality SDG-aligned matches
      if (thresholdParam) {
        const parsedThreshold = parseInt(thresholdParam);
        if (!isNaN(parsedThreshold) && parsedThreshold >= 0 && parsedThreshold <= 100) {
          matchThreshold = parsedThreshold;
        }
      }
      
      const { getEnrichedOpportunities } = await import("./opportunity-enrichment-service");
      
      // Get enriched opportunities with match scores and organization data
      // Default 50% threshold ensures volunteers see well-matched opportunities
      // with strong SDG alignment and other matching criteria
      const enrichedOpportunities = await getEnrichedOpportunities(storage, {
        includeMatch: true,
        volunteerId: userId,
        matchThreshold,
      });
      
      res.json(enrichedOpportunities);
    } catch (err) {
      console.error("Error fetching opportunities with match scores:", err);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/opportunities", async (req, res) => {
    try {
      const { organizationId, userId } = req.query;
      
      // Require authentication context for security
      if (!organizationId && !userId) {
        return res.status(400).json({ 
          message: "Either organizationId or userId must be provided for data security" 
        });
      }

      let opportunities;
      if (organizationId) {
        // Filter by organization
        opportunities = await storage.listOpportunitiesByOrganization(parseInt(organizationId as string));
      } else if (userId) {
        // Filter by user context
        const userIdNum = parseInt(userId as string);
        const user = await storage.getUser(userIdNum);
        
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        if (user.userType === 'organization' && user.organizationId) {
          // Organization user - return only their opportunities
          opportunities = await storage.listOpportunitiesByOrganization(user.organizationId);
        } else if (user.userType === 'volunteer') {
          // Volunteer user - return all open opportunities (they'll be filtered by AI matching in the frontend)
          const allOpportunities = await storage.listOpportunities();
          opportunities = allOpportunities.filter(opp => opp.status === 'open');
        } else {
          return res.status(400).json({ message: "Invalid user type" });
        }
      } else {
        return res.status(400).json({ message: "Missing required parameters" });
      }
      
      res.json(opportunities);
    } catch (err) {
      console.error("Error fetching opportunities:", err);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  // Get opportunity status for a volunteer (saved/applied/rejected)
  // IMPORTANT: This route must be defined BEFORE /api/opportunities/:id to avoid matching "status" as :id
  app.get("/api/opportunities/status", async (req, res) => {
    try {
      const volunteerId = req.query.volunteerId as string;
      
      if (!volunteerId) {
        return res.status(400).json({ message: "volunteerId is required" });
      }
      
      const vid = Number(volunteerId);
      
      // Check if volunteerId is a valid number
      if (isNaN(vid)) {
        return res.status(400).json({ message: "volunteerId must be a valid number" });
      }
      
      const [saved, rejected, applications] = await Promise.all([
        storage.listSavedOpportunitiesByVolunteer(vid),
        storage.listRejectedOpportunitiesByVolunteer(vid),
        storage.listApplicationsByVolunteer(vid)
      ]);
      
      const savedIds = saved.map(s => s.opportunityId);
      const rejectedIds = rejected.map(r => r.opportunityId);
      const appliedIds = applications.map(a => a.opportunityId);
      
      res.json({ savedIds, rejectedIds, appliedIds });
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.get("/api/opportunities/:id", async (req, res) => {
    try {
      const opportunityId = parseInt(req.params.id);
      const opportunity = await storage.getOpportunity(opportunityId);
      
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Enrich with organization information
      let enrichedOpportunity: any = { ...opportunity };
      if (opportunity.organizationId) {
        const organization = await storage.getOrganization(opportunity.organizationId);
        if (organization) {
          enrichedOpportunity.organizationName = organization.name; // For consistency with enrichment service
          enrichedOpportunity.organization = organization; // Full organization object for frontend
        }
      }
      
      res.json(enrichedOpportunity);
    } catch (err) {
      console.error("Error fetching opportunity:", err);
      res.status(500).json({ message: "Failed to fetch opportunity" });
    }
  });

  app.post("/api/opportunities", async (req, res) => {
    try {
      // Authorization: require organization user
      const user = await requireOrgUser(req);
      
      const opportunityData = insertOpportunitySchema.parse(req.body);
      
      // Verify ownership: payload organizationId must match user's organizationId
      if (opportunityData.organizationId !== user.organizationId) {
        return res.status(403).json({ message: "Resource not owned by your organization" });
      }
      
      // Auto-populate category from SDGs if not provided (for interest matching)
      if (!opportunityData.category && (opportunityData.sdgGoals || opportunityData.primarySdg)) {
        const derivedCategory = deriveCategoryFromSDGs(
          opportunityData.sdgGoals as number[] | null,
          opportunityData.primarySdg as number | null
        );
        if (derivedCategory) {
          (opportunityData as any).category = derivedCategory;
        }
      }
      
      const opportunity = await storage.createOpportunity(opportunityData);
      
      broadcastUpdate("opportunity_created", opportunity);
      res.status(201).json(opportunity);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/opportunities/:id", async (req, res) => {
    try {
      // Authorization: require organization user
      const user = await requireOrgUser(req);
      
      const opportunityId = parseInt(req.params.id);
      
      // Verify ownership: fetch existing opportunity
      const existingOpportunity = await storage.getOpportunity(opportunityId);
      if (!existingOpportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      verifyOwnership(user, existingOpportunity);
      
      const opportunityData = insertOpportunitySchema.partial().parse(req.body);
      
      const updatedOpportunity = await storage.updateOpportunity(opportunityId, opportunityData);
      if (!updatedOpportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      broadcastUpdate("opportunity_updated", updatedOpportunity);
      res.json(updatedOpportunity);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Applications Routes ===
  app.get("/api/applications", async (req, res) => {
    try {
      const { opportunityId, volunteerId, organizationId } = req.query;
      
      let applications;
      if (opportunityId) {
        applications = await storage.listApplicationsByOpportunity(parseInt(opportunityId as string));
      } else if (volunteerId) {
        applications = await storage.listApplicationsByVolunteer(parseInt(volunteerId as string));
      } else if (organizationId) {
        // Filter by organization - only show applications for this org's opportunities
        applications = await storage.listApplicationsByOrganization(parseInt(organizationId as string));
      } else {
        applications = await storage.listApplications();
      }
      
      res.json(applications);
    } catch (err) {
      console.error("Error fetching applications:", err);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  app.get("/api/applications/:id", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const application = await storage.getApplication(applicationId);
      
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      res.json(application);
    } catch (err) {
      console.error("Error fetching application:", err);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  app.post("/api/applications", async (req, res) => {
    try {
      // Validate request payload first (schema-first validation)
      const validatedData = insertApplicationSchema.parse(req.body);
      const { opportunityId, volunteerId } = validatedData;
      
      // Check if volunteer has already applied to this opportunity (across ALL statuses)
      const existingApplication = await storage.findApplicationByVolunteerAndOpportunity(
        volunteerId,
        opportunityId
      );
      
      if (existingApplication) {
        return res.status(409).json({ 
          message: "You have already applied to this opportunity",
          existingStatus: existingApplication.status
        });
      }
      
      // Calculate match score before creating application
      let matchScore = null;
      try {
        const volunteer = await storage.getUser(volunteerId);
        const opportunity = await storage.getOpportunity(opportunityId);
        
        if (volunteer && opportunity) {
          // Get volunteer profile for more accurate matching
          let volunteerProfile = null;
          if (volunteer.email) {
            volunteerProfile = await storage.getVolunteerProfileByUserId(volunteerId);
          }
          
          const volunteerWithProfile = {
            ...volunteer,
            profile: volunteerProfile || undefined
          } as any;
          
          const matchResult = calculateMatchScore(volunteerWithProfile, opportunity);
          matchScore = Math.round(matchResult.score || 0);
        }
      } catch (err) {
        console.error("Error calculating match score (non-critical):", err);
        // Continue with application creation even if match score calculation fails
      }
      
      // Create application with pending status and calculated match score
      const application = await storage.createApplication({
        ...validatedData,
        matchScore
      });
      
      broadcastUpdate("application_created", application);
      res.status(201).json(application);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/applications/:id", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const applicationData = req.body;
      
      const updatedApplication = await storage.updateApplication(applicationId, applicationData);
      if (!updatedApplication) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      broadcastUpdate("application_updated", updatedApplication);
      res.json(updatedApplication);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // Accept/Reject application with automatic project assignment
  app.post("/api/applications/:id/review", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      const { status, notes, reviewerId } = req.body;
      
      if (!status || !["accepted", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'accepted' or 'rejected'" });
      }
      
      // Get application details
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Get opportunity details to find the project
      const opportunity = await storage.getOpportunity(application.opportunityId);
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      // Update application status
      const updatedApplication = await storage.updateApplication(applicationId, {
        status,
        reviewedAt: new Date(),
        reviewedBy: reviewerId || null,
        notes: notes || null
      });
      
      if (!updatedApplication) {
        return res.status(500).json({ message: "Failed to update application" });
      }
      
      // If accepted, assign volunteer to project (if opportunity is linked to a project)
      if (status === "accepted" && opportunity.projectId) {
        // Check if assignment already exists
        const existingAssignments = await storage.listProjectAssignmentsByProject(opportunity.projectId);
        const alreadyAssigned = existingAssignments.some(
          (assignment: any) => assignment.volunteerId === application.volunteerId
        );
        
        if (!alreadyAssigned) {
          // Create project assignment with active status (not pending)
          await storage.createProjectAssignment({
            projectId: opportunity.projectId,
            volunteerId: application.volunteerId,
            role: "Volunteer",
            status: "active",
            assignedAt: new Date(),
            respondedAt: new Date(), // Mark as responded since they applied and were accepted
            hoursCommitted: opportunity.ongoingHoursPerWeek || 0
          });
          
          // Notify volunteer of new assignment
          const project = await storage.getProject(opportunity.projectId);
          if (project && project.organizationId) {
            await notifyNewAssignment(
              application.volunteerId,
              opportunity.projectId,
              project.organizationId
            );
          }
          
          // Create activity entry for the assignment
          await storage.createVolunteerActivity({
            userId: application.volunteerId,
            projectId: opportunity.projectId,
            description: `Accepted application for ${opportunity.title}`,
            date: new Date(),
            hours: 0
          });
        }
      }
      
      // Notify volunteer of application status change
      await notifyApplicationStatusChange(
        application.volunteerId,
        application.opportunityId,
        status,
        opportunity.title
      );
      
      broadcastUpdate("application_reviewed", updatedApplication);
      res.json(updatedApplication);
    } catch (err) {
      console.error("Error reviewing application:", err);
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // Get AI match analysis for an application
  app.get("/api/applications/:id/match-analysis", async (req, res) => {
    try {
      const applicationId = parseInt(req.params.id);
      
      // Get application details
      const application = await storage.getApplication(applicationId);
      if (!application) {
        return res.status(404).json({ message: "Application not found" });
      }
      
      // Get opportunity and volunteer details
      const opportunity = await storage.getOpportunity(application.opportunityId);
      const volunteer = await storage.getUser(application.volunteerId);
      
      if (!opportunity || !volunteer) {
        return res.status(404).json({ message: "Opportunity or volunteer not found" });
      }
      
      // Get volunteer profile
      let volunteerProfile = null;
      if (volunteer.email) {
        volunteerProfile = await storage.getVolunteerByEmail(volunteer.email);
      }
      
      // Calculate match score with breakdown
      const volunteerWithProfile = {
        ...volunteer,
        profile: volunteerProfile || undefined
      } as any;
      
      const matchResult = calculateMatchScore(volunteerWithProfile, opportunity);
      
      // Normalize breakdown values to percentages (0-100) and ensure all keys exist
      // calculateMatchScore returns 0-1 values, so multiply by 100 to get percentages
      const breakdown = matchResult.breakdown || {};
      const normalizedBreakdown = {
        skillMatch: (breakdown.skillMatch || 0),
        locationMatch: (breakdown.locationMatch || 0),
        sdgMatch: (breakdown.sdgMatch || 0),
        interestMatch: (breakdown.interestMatch || 0),
      };
      
      res.json({
        score: Math.round(matchResult.score || 0),
        breakdown: normalizedBreakdown,
        reasons: matchResult.reasons || [],
        volunteer: {
          id: volunteer.id,
          name: volunteer.displayName || volunteer.username,
          skills: volunteer.skills || [],
          location: volunteerProfile?.location || null
        },
        opportunity: {
          id: opportunity.id,
          title: opportunity.title,
          requiredSkills: opportunity.requiredSkills || [],
          optionalSkills: opportunity.optionalSkills || [],
          location: opportunity.location || null,
          isRemote: opportunity.isRemote || false
        }
      });
    } catch (err) {
      console.error("Error getting match analysis:", err);
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Saved Opportunities Routes ===
  app.post("/api/saved-opportunities", async (req, res) => {
    try {
      const { volunteerId, opportunityId, notes } = req.body;
      
      if (!volunteerId || !opportunityId) {
        return res.status(400).json({ message: "volunteerId and opportunityId are required" });
      }
      
      // Check if already saved
      const alreadySaved = await storage.isSavedOpportunity(volunteerId, opportunityId);
      if (alreadySaved) {
        return res.status(400).json({ message: "Opportunity already saved" });
      }
      
      const savedOpp = await storage.saveOpportunity({ volunteerId, opportunityId, notes });
      res.status(201).json(savedOpp);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.delete("/api/saved-opportunities", async (req, res) => {
    try {
      const { volunteerId, opportunityId } = req.query;
      
      if (!volunteerId || !opportunityId) {
        return res.status(400).json({ message: "volunteerId and opportunityId are required" });
      }
      
      await storage.unsaveOpportunity(Number(volunteerId), Number(opportunityId));
      res.status(204).send();
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.get("/api/saved-opportunities", async (req, res) => {
    try {
      const volunteerId = req.query.volunteerId as string;
      
      if (!volunteerId) {
        return res.status(400).json({ message: "volunteerId is required" });
      }
      
      const saved = await storage.listSavedOpportunitiesByVolunteer(Number(volunteerId));
      res.json(saved);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Rejected Opportunities Routes ===
  app.post("/api/rejected-opportunities", async (req, res) => {
    try {
      const { volunteerId, opportunityId, reason } = req.body;
      
      if (!volunteerId || !opportunityId) {
        return res.status(400).json({ message: "volunteerId and opportunityId are required" });
      }
      
      // Check if already rejected
      const alreadyRejected = await storage.isRejectedOpportunity(volunteerId, opportunityId);
      if (alreadyRejected) {
        return res.status(400).json({ message: "Opportunity already rejected" });
      }
      
      const rejectedOpp = await storage.rejectOpportunity({ volunteerId, opportunityId, reason });
      res.status(201).json(rejectedOpp);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.delete("/api/rejected-opportunities", async (req, res) => {
    try {
      const { volunteerId, opportunityId } = req.query;
      
      if (!volunteerId || !opportunityId) {
        return res.status(400).json({ message: "volunteerId and opportunityId are required" });
      }
      
      await storage.unrejectOpportunity(Number(volunteerId), Number(opportunityId));
      res.status(204).send();
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.get("/api/rejected-opportunities", async (req, res) => {
    try {
      const volunteerId = req.query.volunteerId as string;
      
      if (!volunteerId) {
        return res.status(400).json({ message: "volunteerId is required" });
      }
      
      const rejected = await storage.listRejectedOpportunitiesByVolunteer(Number(volunteerId));
      res.json(rejected);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // === Match Score Route ===
  app.get("/api/opportunities/:id/match-score", async (req, res) => {
    try {
      const opportunityId = parseInt(req.params.id);
      const { volunteerId } = req.query;
      
      if (!volunteerId) {
        return res.status(400).json({ message: "volunteerId is required" });
      }
      
      const matchScore = await storage.getMatchScore(opportunityId, parseInt(volunteerId as string));
      res.json(matchScore);
    } catch (err) {
      console.error("Error calculating match score:", err);
      res.status(500).json({ message: "Failed to calculate match score" });
    }
  });

  // === SDG Information Route ===
  app.get("/api/sdgs", (req, res) => {
    // Return information about the SDGs for the SDG mapping feature
    const sdgs = [
      { id: 1, name: "No Poverty", color: "#E5243B", description: "End poverty in all its forms everywhere" },
      { id: 2, name: "Zero Hunger", color: "#DDA63A", description: "End hunger, achieve food security and improved nutrition and promote sustainable agriculture" },
      { id: 3, name: "Good Health and Well-being", color: "#4C9F38", description: "Ensure healthy lives and promote well-being for all at all ages" },
      { id: 4, name: "Quality Education", color: "#C5192D", description: "Ensure inclusive and equitable quality education and promote lifelong learning opportunities for all" },
      { id: 5, name: "Gender Equality", color: "#FF3A21", description: "Achieve gender equality and empower all women and girls" },
      { id: 6, name: "Clean Water and Sanitation", color: "#26BDE2", description: "Ensure availability and sustainable management of water and sanitation for all" },
      { id: 7, name: "Affordable and Clean Energy", color: "#FCC30B", description: "Ensure access to affordable, reliable, sustainable and modern energy for all" },
      { id: 8, name: "Decent Work and Economic Growth", color: "#A21942", description: "Promote sustained, inclusive and sustainable economic growth, full and productive employment and decent work for all" },
      { id: 9, name: "Industry, Innovation and Infrastructure", color: "#FD6925", description: "Build resilient infrastructure, promote inclusive and sustainable industrialization and foster innovation" },
      { id: 10, name: "Reduced Inequality", color: "#DD1367", description: "Reduce inequality within and among countries" },
      { id: 11, name: "Sustainable Cities and Communities", color: "#FD9D24", description: "Make cities and human settlements inclusive, safe, resilient and sustainable" },
      { id: 12, name: "Responsible Consumption and Production", color: "#BF8B2E", description: "Ensure sustainable consumption and production patterns" },
      { id: 13, name: "Climate Action", color: "#3F7E44", description: "Take urgent action to combat climate change and its impacts" },
      { id: 14, name: "Life Below Water", color: "#0A97D9", description: "Conserve and sustainably use the oceans, seas and marine resources for sustainable development" },
      { id: 15, name: "Life on Land", color: "#56C02B", description: "Protect, restore and promote sustainable use of terrestrial ecosystems, sustainably manage forests, combat desertification, and halt and reverse land degradation and halt biodiversity loss" },
      { id: 16, name: "Peace, Justice and Strong Institutions", color: "#00689D", description: "Promote peaceful and inclusive societies for sustainable development, provide access to justice for all and build effective, accountable and inclusive institutions at all levels" },
      { id: 17, name: "Partnerships for the Goals", color: "#19486A", description: "Strengthen the means of implementation and revitalize the global partnership for sustainable development" }
    ];
    
    res.json(sdgs);
  });

  // === Project Assignments Routes ===
  app.get("/api/project-assignments", async (req, res) => {
    try {
      const { projectId, volunteerId } = req.query;
      
      let assignments;
      if (projectId) {
        if (projectId === 'undefined' || projectId === 'null') {
          return res.status(400).json({ message: "Project ID must be a valid number" });
        }
        const projId = parseInt(projectId as string);
        if (isNaN(projId)) {
          return res.status(400).json({ message: "Project ID must be a valid number" });
        }
        assignments = await storage.listProjectAssignmentsByProject(projId);
      } else if (volunteerId) {
        if (volunteerId === 'undefined' || volunteerId === 'null') {
          return res.status(400).json({ message: "Volunteer ID must be a valid number" });
        }
        const volId = parseInt(volunteerId as string);
        if (isNaN(volId)) {
          return res.status(400).json({ message: "Volunteer ID must be a valid number" });
        }
        assignments = await storage.listProjectAssignmentsByVolunteer(volId);
      } else {
        assignments = await storage.listProjectAssignments();
      }
      
      // Enrich assignments with project and organization data
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment: any) => {
          if (!assignment.projectId) {
            return { ...assignment, project: null, organization: null };
          }
          const project = await storage.getProject(assignment.projectId);
          const organization = project?.organizationId ? await storage.getOrganization(project.organizationId) : null;
          return {
            ...assignment,
            project,
            organization
          };
        })
      );
      
      res.json(enrichedAssignments);
    } catch (err) {
      console.error("Error fetching project assignments:", err);
      res.status(500).json({ message: "Failed to fetch project assignments" });
    }
  });

  app.get("/api/project-assignments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      if (!id || id === 'undefined' || id === 'null') {
        return res.status(400).json({ message: "Assignment ID is required and must be a valid number" });
      }
      
      const assignmentId = parseInt(id);
      
      if (isNaN(assignmentId)) {
        return res.status(400).json({ message: "Assignment ID must be a valid number" });
      }
      
      const assignment = await storage.getProjectAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "Project assignment not found" });
      }
      
      res.json(assignment);
    } catch (err) {
      console.error("Error fetching project assignment:", err);
      res.status(500).json({ message: "Failed to fetch project assignment" });
    }
  });

  app.post("/api/project-assignments", async (req, res) => {
    try {
      // Validate request payload with schema
      const assignmentData = insertProjectAssignmentSchema.parse(req.body);
      const newAssignment = await storage.createProjectAssignment(assignmentData);
      
      const project = await storage.getProject(assignmentData.projectId);
      if (project && project.organizationId) {
        await notifyNewAssignment(
          assignmentData.volunteerId,
          assignmentData.projectId,
          project.organizationId
        );
      }
      
      broadcastUpdate("project_assignment_created", newAssignment);
      res.status(201).json(newAssignment);
    } catch (err) {
      // Handle duplicate assignment error
      if (err instanceof DuplicateAssignmentError) {
        return res.status(409).json({ message: err.message });
      }
      
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // Organization invite volunteers endpoint - CREATE pending assignment
  app.post("/api/project-assignments/invite", async (req, res) => {
    try {
      const { volunteerId, projectId, hoursCommitted } = req.body;
      
      if (!volunteerId || !projectId) {
        return res.status(400).json({ message: "volunteerId and projectId are required" });
      }

      // Create pending assignment (status="pending" is default)
      const assignmentData = {
        volunteerId: parseInt(volunteerId),
        projectId: parseInt(projectId),
        hoursCommitted: hoursCommitted || 10,
        status: "pending", // Pending invitation
      };

      const newAssignment = await storage.createProjectAssignment(assignmentData);
      
      const project = await storage.getProject(projectId);
      if (project && project.organizationId) {
        await notifyNewAssignment(
          volunteerId,
          projectId,
          project.organizationId
        );
      }

      broadcastUpdate("project_assignment_created", newAssignment);
      res.status(201).json({
        ...newAssignment,
        message: "Invitation sent to volunteer"
      });
    } catch (err) {
      if (err instanceof DuplicateAssignmentError) {
        return res.status(409).json({ message: err.message });
      }
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/project-assignments/:id", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const updateData = { ...req.body };
      
      // If status is being changed to active or declined, set respondedAt
      if ((updateData.status === "active" || updateData.status === "declined") && !updateData.respondedAt) {
        updateData.respondedAt = new Date();
      }
      
      const updatedAssignment = await storage.updateProjectAssignment(assignmentId, updateData);
      
      if (!updatedAssignment) {
        return res.status(404).json({ message: "Project assignment not found" });
      }
      
      broadcastUpdate("project_assignment_updated", updatedAssignment);
      res.json(updatedAssignment);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.get("/api/project-assignments/details", async (req, res) => {
    try {
      let volunteerId = req.query.volunteerId as string;
      
      // If volunteerId not provided, try to extract from request
      if (!volunteerId || volunteerId === 'undefined' || volunteerId === 'null') {
        const requestingUserId = extractUserId(req);
        if (requestingUserId) {
          volunteerId = requestingUserId.toString();
        } else {
          return res.status(400).json({ message: "volunteerId is required and must be a valid number" });
        }
      }
      
      const volId = parseInt(volunteerId);
      
      if (isNaN(volId)) {
        return res.status(400).json({ message: "volunteerId must be a valid number" });
      }
      
      const assignments = await storage.listProjectAssignmentsByVolunteer(volId);
      
      // Enrich each assignment with team members, activities, and project info
      const enrichedAssignments = await Promise.all(
        assignments.map(async (assignment: any) => {
          try {
            // Fetch project details (for fallback hoursCommitted and organization info)
            const project = await storage.getProject(assignment.projectId);
            
            // Fetch organization details
            let organization = null;
            if (project?.organizationId) {
              organization = await storage.getOrganization(project.organizationId);
            }
            
            // Use hoursCommitted from assignment, or fallback to project's ongoingHoursPerWeek
            const hoursCommitted = assignment.hoursCommitted || project?.ongoingHoursPerWeek || 0;
            
            // Get team members (other volunteers on this project)
            const allAssignments = await storage.listProjectAssignmentsByProject(assignment.projectId);
            const teamMembers = await Promise.all(
              allAssignments
                .filter((a: any) => a.volunteerId !== volId && a.status === 'active')
                .slice(0, 5) // Limit to 5 team members for performance
                .map(async (a: any) => {
                  const user = await storage.getUser(a.volunteerId);
                  return user ? {
                    id: user.id,
                    username: user.username,
                    displayName: user.displayName,
                    avatar: user.avatar,
                    role: a.role
                  } : null;
                })
            );
            
            // Get recent activities for this volunteer on this project
            const allActivities = await storage.listVolunteerActivities();
            const activities = allActivities
              .filter((activity: any) => 
                activity.projectId === assignment.projectId && 
                activity.userId === volId
              )
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .slice(0, 5); // Last 5 activities
            
            return {
              ...assignment,
              hoursCommitted, // Use fallback value if not set
              project: project ? {
                id: project.id,
                name: project.name,
                description: project.description
              } : null,
              organization: organization ? {
                id: organization.id,
                name: organization.name
              } : null,
              teamMembers: teamMembers.filter((m: any) => m !== null),
              activities
            };
          } catch (error) {
            console.error(`Error enriching assignment ${assignment.id}:`, error);
            return {
              ...assignment,
              hoursCommitted: assignment.hoursCommitted || 0,
              teamMembers: [],
              activities: []
            };
          }
        })
      );
      
      res.json(enrichedAssignments);
    } catch (err) {
      console.error("Error fetching enriched assignments:", err);
      res.status(500).json({ message: "Failed to fetch enriched assignments" });
    }
  });

  app.delete("/api/project-assignments/:id", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const deleted = await storage.deleteProjectAssignment(assignmentId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Project assignment not found" });
      }
      
      broadcastUpdate("project_assignment_deleted", { id: assignmentId });
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting project assignment:", err);
      res.status(500).json({ message: "Failed to delete project assignment" });
    }
  });

  // === Volunteer Routes (Matching System) ===
  app.get("/api/volunteers/me", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.userType !== 'volunteer') {
        return res.status(403).json({ message: "User is not a volunteer" });
      }
      
      if (!user.email) {
        return res.status(400).json({ message: "User email is required" });
      }
      
      const volunteer = await storage.getVolunteerByEmail(user.email);
      
      if (!volunteer) {
        return res.status(404).json({ message: "Volunteer not found" });
      }
      
      res.json(volunteer);
    } catch (err) {
      console.error("Error fetching current user's volunteer profile:", err);
      res.status(500).json({ message: "Failed to fetch volunteer profile" });
    }
  });

  // Organization's accepted volunteers endpoint - returns volunteers with accepted project assignments
  app.get("/api/organizations/:id/volunteers", async (req, res) => {
    try {
      const requestedUserId = parseInt(req.params.id); // This is the user ID
      
      // Get authenticated user - trust the header for service-to-service calls
      const authenticatedUserId = extractUserId(req);
      if (!authenticatedUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Fetch the user to get their organization - use authenticated user ID
      const user = await storage.getUser(authenticatedUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.userType !== 'organization') {
        return res.status(403).json({ message: "Only organizations can access this endpoint" });
      }
      
      // For organization users, use their own ID as the organization identifier
      // Organizations don't have an organizationId field - they ARE the organization
      const organizationId = user.organizationId || authenticatedUserId;
      
      // Get all projects for this organization
      const allProjects = await storage.listProjects();
      const organizationProjects = allProjects.filter(p => p.organizationId === organizationId);
      const projectIds = new Set(organizationProjects.map(p => p.id));
      
      // Get all assignments for these projects with accepted statuses
      // Include: accepted, active, completed, on-hold (all statuses where volunteer has agreed to participate)
      const allAssignments = await storage.listProjectAssignments();
      const organizationAssignments = allAssignments.filter(a => 
        projectIds.has(a.projectId) && 
        ['accepted', 'active', 'completed', 'on-hold'].includes(a.status?.toLowerCase() || '')
      );
      
      // Get unique volunteer IDs from assignments
      const volunteerIds = new Set(organizationAssignments.map(a => a.volunteerId));
      
      // Get all users and filter to volunteers with assignments
      const allUsers = await storage.listUsers();
      const organizationVolunteers = allUsers.filter(u => 
        u.userType === 'volunteer' && volunteerIds.has(u.id)
      );
      
      // Only fetch profiles for volunteers who have accepted assignments (optimization)
      const volunteersWithProfiles = await Promise.all(
        organizationVolunteers.map(async (volunteer) => {
          const profile = volunteer.email ? await storage.getVolunteerByEmail(volunteer.email) : null;
          return { ...volunteer, profile };
        })
      );
      
      // Get all activities for these volunteers
      const allActivities = await storage.listVolunteerActivities();
      
      // Calculate stats for each volunteer
      const volunteersWithStats = volunteersWithProfiles.map(volunteer => {
        // Get this volunteer's accepted assignments for the organization
        const volunteerAssignments = organizationAssignments.filter(pa => pa.volunteerId === volunteer.id);
        
        // Get assigned project IDs
        const assignedProjectIds = volunteerAssignments.map(pa => pa.projectId);
        const volunteerProjects = organizationProjects.filter(p => assignedProjectIds.includes(p.id));
        
        // Filter activities to include all activities from organization projects
        // where the volunteer has an accepted assignment (regardless of timing)
        // This allows for backfilled data and retroactive assignments
        const volunteerActivities = allActivities.filter(activity => {
          if (!activity.projectId || activity.userId !== volunteer.id) return false;
          if (!projectIds.has(activity.projectId)) return false;
          
          // Verify the volunteer has an accepted assignment for this project
          const hasAssignment = volunteerAssignments.some(a => a.projectId === activity.projectId);
          return hasAssignment;
        });
        
        const totalHours = volunteerActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
        const activityCount = volunteerActivities.length;
        
        // Return consistent structure with all expected fields defaulted
        return {
          id: volunteer.id,
          displayName: volunteer.displayName || '',
          email: volunteer.email || '',
          avatar: volunteer.avatar || null,
          skills: Array.isArray(volunteer.profile?.skills) ? volunteer.profile.skills : [],
          hours: totalHours || 0,
          tasksCompleted: activityCount || 0,
          projectCount: volunteerProjects.length || 0,
          projects: volunteerProjects.map(p => ({ id: p.id, name: p.name || 'Unnamed Project' })) || []
        };
      });
      
      res.json(volunteersWithStats);
    } catch (err) {
      console.error("Error fetching organization volunteers:", err);
      res.status(500).json({ message: "Failed to fetch organization volunteers", error: err instanceof Error ? err.message : String(err) });
    }
  });

  // AI-matched volunteers endpoint - returns volunteers matched to organization's needs
  app.get("/api/volunteers/matches", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const thresholdParam = req.query.threshold as string | undefined;
      
      if (!userId) {
        return res.status(400).json({ message: "userId query parameter is required" });
      }
      
      const userIdNum = parseInt(userId);
      const threshold = thresholdParam ? parseInt(thresholdParam) : 40; // Default 40% threshold
      
      // Get authenticated user and verify they are an organization
      const user = await storage.getUser(userIdNum);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.userType !== 'organization') {
        return res.status(403).json({ message: "Only organizations can access matched volunteers" });
      }
      
      // Use the authenticated user's ID as the organization ID
      const orgId = userIdNum;
      
      // Get organization's open opportunities to match against
      const orgOpportunities = await storage.listOpportunitiesByOrganization(orgId);
      const openOpportunities = orgOpportunities.filter(opp => opp.status === 'open');
      
      if (openOpportunities.length === 0) {
        // No opportunities to match against - return empty array
        return res.json([]);
      }
      
      // Get all volunteers with their profiles
      const allUsers = await storage.listUsers();
      const volunteers = allUsers.filter(u => u.userType === 'volunteer');
      
      // Get volunteer profiles - pass full profile object to matching algorithm
      const volunteersWithProfiles = await Promise.all(
        volunteers.map(async (vol) => {
          const profile = vol.email ? await storage.getVolunteerByEmail(vol.email) : null;
          return { ...vol, profile } as any; // Type cast for flexibility
        })
      );
      
      // Match volunteers against the organization's most representative opportunity
      // (using first open opportunity as baseline)
      const representativeOpportunity = openOpportunities[0];
      const matchedVolunteers = findTopVolunteers(
        representativeOpportunity, 
        volunteersWithProfiles as any,
        100 // Get all volunteers, will filter by threshold
      );
      
      // Filter by threshold and add match data
      const filteredVolunteers = matchedVolunteers
        .filter(vol => vol.matchScore >= threshold)
        .map(vol => ({
          ...vol,
          matchPercentage: vol.matchScore,
          matchReasons: vol.matchReasons
        }));
      
      res.json(filteredVolunteers);
    } catch (err) {
      console.error("Error fetching matched volunteers:", err);
      res.status(500).json({ message: "Failed to fetch matched volunteers", error: err instanceof Error ? err.message : String(err) });
    }
  });

  app.get("/api/volunteers", async (req, res) => {
    try {
      const volunteers = await storage.listVolunteers();
      res.json(volunteers);
    } catch (err) {
      console.error("Error fetching volunteers:", err);
      res.status(500).json({ message: "Failed to fetch volunteers" });
    }
  });

  app.get("/api/volunteers/:id", async (req, res) => {
    try {
      const volunteerId = req.params.id;
      const volunteer = await storage.getVolunteer(volunteerId);
      
      if (!volunteer) {
        return res.status(404).json({ message: "Volunteer not found" });
      }
      
      res.json(volunteer);
    } catch (err) {
      console.error("Error fetching volunteer:", err);
      res.status(500).json({ message: "Failed to fetch volunteer" });
    }
  });

  app.post("/api/volunteers", async (req, res) => {
    try {
      const volunteerData = insertVolunteerSchema.parse(req.body);
      const volunteer = await storage.createVolunteer(volunteerData);
      
      broadcastUpdate("volunteer_created", volunteer);
      res.status(201).json(volunteer);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/volunteers/:id", async (req, res) => {
    try {
      const volunteerId = req.params.id;
      const volunteerData = insertVolunteerSchema.partial().parse(req.body);
      
      const updatedVolunteer = await storage.updateVolunteer(volunteerId, volunteerData);
      if (!updatedVolunteer) {
        return res.status(404).json({ message: "Volunteer not found" });
      }
      
      broadcastUpdate("volunteer_updated", updatedVolunteer);
      res.json(updatedVolunteer);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.delete("/api/volunteers/:id", async (req, res) => {
    try {
      const volunteerId = req.params.id;
      const deleted = await storage.deleteVolunteer(volunteerId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Volunteer not found" });
      }
      
      broadcastUpdate("volunteer_deleted", { id: volunteerId });
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting volunteer:", err);
      res.status(500).json({ message: "Failed to delete volunteer" });
    }
  });

  // === Matchable Organization Routes ===
  app.get("/api/matchable-organizations", async (req, res) => {
    try {
      const organizations = await storage.listMatchableOrganizations();
      res.json(organizations);
    } catch (err) {
      console.error("Error fetching matchable organizations:", err);
      res.status(500).json({ message: "Failed to fetch matchable organizations" });
    }
  });

  app.get("/api/matchable-organizations/:id", async (req, res) => {
    try {
      const organizationId = req.params.id;
      const organization = await storage.getMatchableOrganization(organizationId);
      
      if (!organization) {
        return res.status(404).json({ message: "Matchable organization not found" });
      }
      
      res.json(organization);
    } catch (err) {
      console.error("Error fetching matchable organization:", err);
      res.status(500).json({ message: "Failed to fetch matchable organization" });
    }
  });

  app.post("/api/matchable-organizations", async (req, res) => {
    try {
      const organizationData = insertMatchableOrganizationSchema.parse(req.body);
      const organization = await storage.createMatchableOrganization(organizationData);
      
      broadcastUpdate("matchable_organization_created", organization);
      res.status(201).json(organization);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/matchable-organizations/:id", async (req, res) => {
    try {
      const organizationId = req.params.id;
      const organizationData = insertMatchableOrganizationSchema.partial().parse(req.body);
      
      const updatedOrganization = await storage.updateMatchableOrganization(organizationId, organizationData);
      if (!updatedOrganization) {
        return res.status(404).json({ message: "Matchable organization not found" });
      }
      
      broadcastUpdate("matchable_organization_updated", updatedOrganization);
      res.json(updatedOrganization);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.delete("/api/matchable-organizations/:id", async (req, res) => {
    try {
      const organizationId = req.params.id;
      const deleted = await storage.deleteMatchableOrganization(organizationId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Matchable organization not found" });
      }
      
      broadcastUpdate("matchable_organization_deleted", { id: organizationId });
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting matchable organization:", err);
      res.status(500).json({ message: "Failed to delete matchable organization" });
    }
  });

  // === Match Routes ===
  app.get("/api/matches", async (req, res) => {
    try {
      const { volunteerId, organizationId } = req.query;
      
      let matches;
      if (volunteerId) {
        matches = await storage.listMatchesByVolunteer(volunteerId as string);
      } else if (organizationId) {
        matches = await storage.listMatchesByOrganization(organizationId as string);
      } else {
        matches = await storage.listMatches();
      }
      
      res.json(matches);
    } catch (err) {
      console.error("Error fetching matches:", err);
      res.status(500).json({ message: "Failed to fetch matches" });
    }
  });

  app.get("/api/matches/:id", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const match = await storage.getMatch(matchId);
      
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      res.json(match);
    } catch (err) {
      console.error("Error fetching match:", err);
      res.status(500).json({ message: "Failed to fetch match" });
    }
  });

  app.post("/api/matches", async (req, res) => {
    try {
      const matchData = insertMatchSchema.parse(req.body);
      // Use upsert to prevent duplicate matches for the same volunteer-organization pair
      const match = await storage.upsertMatch(matchData);
      
      broadcastUpdate("match_created", match);
      res.status(201).json(match);
    } catch (err) {
      // Handle referential integrity errors with 400 status
      if (err instanceof Error && err.message.includes("does not exist")) {
        return res.status(400).json({ message: err.message });
      }
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/matches/:id", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const matchData = insertMatchSchema.partial().parse(req.body);
      
      const updatedMatch = await storage.updateMatch(matchId, matchData);
      if (!updatedMatch) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      broadcastUpdate("match_updated", updatedMatch);
      res.json(updatedMatch);
    } catch (err) {
      // Handle referential integrity errors with 400 status
      if (err instanceof Error && err.message.includes("does not exist")) {
        return res.status(400).json({ message: err.message });
      }
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.delete("/api/matches/:id", async (req, res) => {
    try {
      const matchId = parseInt(req.params.id);
      const deleted = await storage.deleteMatch(matchId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      broadcastUpdate("match_deleted", { id: matchId });
      res.status(204).send();
    } catch (err) {
      console.error("Error deleting match:", err);
      res.status(500).json({ message: "Failed to delete match" });
    }
  });

  // === Matchmaker Routes ===
  
  /**
   * Run matchmaker algorithm for all volunteers and organizations
   * Query params:
   * - threshold: Minimum match score (default: 40.0)
   */
  app.post("/api/matchmaker/run", async (req, res) => {
    try {
      const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 40.0;
      
      // Get all volunteers and organizations
      const volunteers = await storage.listVolunteers();
      const organizations = await storage.listMatchableOrganizations();
      
      if (volunteers.length === 0) {
        return res.status(400).json({ message: "No volunteers found in database" });
      }
      
      if (organizations.length === 0) {
        return res.status(400).json({ message: "No organizations found in database" });
      }
      
      // Run the matchmaker
      const result = await runMatchmaker(volunteers, organizations, threshold);
      
      if (!result.success) {
        return res.status(500).json({ 
          message: "Matchmaker failed", 
          error: result.error 
        });
      }
      
      res.json(result);
    } catch (err) {
      console.error("Error running matchmaker:", err);
      res.status(500).json({ 
        message: "Failed to run matchmaker", 
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  /**
   * Get top matches for a specific volunteer
   * Query params:
   * - limit: Maximum number of matches (default: 10)
   * - threshold: Minimum match score (default: 40.0)
   */
  app.get("/api/matchmaker/volunteer/:id", async (req, res) => {
    try {
      const volunteerId = req.params.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 40.0;
      
      // Get all volunteers and organizations
      const volunteers = await storage.listVolunteers();
      const organizations = await storage.listMatchableOrganizations();
      
      // Check if volunteer exists
      const volunteer = volunteers.find(v => v.id === volunteerId);
      if (!volunteer) {
        return res.status(404).json({ message: "Volunteer not found" });
      }
      
      if (organizations.length === 0) {
        return res.json({ 
          volunteer_id: volunteerId,
          matches: [],
          message: "No organizations available for matching"
        });
      }
      
      // Get matches for this volunteer
      const matches = await getVolunteerMatches(
        volunteerId, 
        volunteers, 
        organizations, 
        limit, 
        threshold
      );
      
      res.json({
        volunteer_id: volunteerId,
        volunteer_name: volunteer.name,
        matches,
        total_matches: matches.length
      });
    } catch (err) {
      console.error("Error getting volunteer matches:", err);
      res.status(500).json({ 
        message: "Failed to get volunteer matches",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });
  
  /**
   * Get top volunteers for a specific organization
   * Query params:
   * - limit: Maximum number of matches (default: 10)
   * - threshold: Minimum match score (default: 40.0)
   */
  app.get("/api/matchmaker/organization/:id", async (req, res) => {
    try {
      const organizationId = req.params.id;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const threshold = req.query.threshold ? parseFloat(req.query.threshold as string) : 40.0;
      
      // Get all volunteers and organizations
      const volunteers = await storage.listVolunteers();
      const organizations = await storage.listMatchableOrganizations();
      
      // Check if organization exists
      const organization = organizations.find(o => o.id === organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      
      if (volunteers.length === 0) {
        return res.json({
          organization_id: organizationId,
          matches: [],
          message: "No volunteers available for matching"
        });
      }
      
      // Get matches for this organization
      const matches = await getOrganizationMatches(
        organizationId,
        volunteers,
        organizations,
        limit,
        threshold
      );
      
      res.json({
        organization_id: organizationId,
        organization_name: organization.name,
        matches,
        total_matches: matches.length
      });
    } catch (err) {
      console.error("Error getting organization matches:", err);
      res.status(500).json({
        message: "Failed to get organization matches",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // === Organization Dashboard Route (Dedicated) ===
  app.get("/api/organization/dashboard", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const projectFilter = req.query.projectId as string | undefined;
      const timePeriod = req.query.timePeriod as string | undefined;
      
      if (!userId) {
        return res.status(400).json({ message: "userId parameter is required" });
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }

      const user = await storage.getUser(userIdNum);
      if (!user || user.userType !== 'organization') {
        return res.status(403).json({ message: "Only organizations can access this dashboard" });
      }

      const organizationId = user.organizationId || userIdNum;

      // Fetch all data
      const allProjects = await storage.listProjects();
      const allTasks = await storage.listTasks();
      const allActivities = await storage.listVolunteerActivities();
      const allImpacts = await storage.listProjectImpacts();
      const allProjectAssignments = await storage.listProjectAssignments();
      const allUsers = await storage.listUsers();
      const allImpactMetrics = await storage.listImpactMetrics();

      // Filter to organization's projects
      let organizationProjects = allProjects.filter(p => p.organizationId === organizationId);
      
      // Apply project filter if specified
      if (projectFilter && projectFilter !== 'all') {
        const filterProjectId = parseInt(projectFilter);
        organizationProjects = organizationProjects.filter(p => p.id === filterProjectId);
      }
      
      const organizationProjectIds = new Set(organizationProjects.map(p => p.id));

      // Apply time period filter for activities/impacts
      let startDate = new Date(0);
      const endDate = new Date();
      if (timePeriod === '7d') {
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (timePeriod === '30d') {
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      } else if (timePeriod === '90d') {
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      } else if (timePeriod === '1y') {
        startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      }

      // Filter data
      const organizationTasks = allTasks.filter(t => t.projectId && organizationProjectIds.has(t.projectId));
      const organizationActivities = allActivities.filter(a => {
        if (!a.projectId || !organizationProjectIds.has(a.projectId)) return false;
        const activityDate = new Date(a.date);
        return activityDate >= startDate && activityDate <= endDate;
      });
      const organizationImpacts = allImpacts.filter(i => {
        if (!i.projectId || !organizationProjectIds.has(i.projectId)) return false;
        const impactDate = new Date(i.date);
        return impactDate >= startDate && impactDate <= endDate;
      });
      const organizationAssignments = allProjectAssignments.filter(pa => organizationProjectIds.has(pa.projectId));

      // Get volunteers
      const volunteerIds = new Set(organizationAssignments.map(pa => pa.volunteerId));
      const organizationVolunteers = allUsers.filter(u => u.userType === 'volunteer' && volunteerIds.has(u.id));

      // Identify people-related metrics
      const peopleMetricIds = new Set(
        allImpactMetrics
          .filter(metric => {
            const unit = metric.unit?.toLowerCase() || '';
            const category = metric.category?.toLowerCase() || '';
            const name = metric.name?.toLowerCase() || '';
            const keywords = ['people', 'person', 'beneficiar', 'student', 'child', 'family', 'participant', 'recipient', 'meal', 'service'];
            return keywords.some(keyword => unit.includes(keyword) || category.includes(keyword) || name.includes(keyword));
          })
          .map(m => m.id)
      );

      // Calculate key metrics
      const activeProjects = organizationProjects.filter(p => {
        const status = p.status?.toLowerCase();
        return status === 'in progress' || status === 'active';
      }).length;

      const totalHours = organizationActivities.reduce((sum, a) => sum + a.hours, 0);

      const uniqueSDGs = new Set<number>();
      organizationProjects.forEach(project => {
        if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
          project.sdgGoals.forEach(goal => uniqueSDGs.add(goal));
        }
      });

      const totalPeopleImpacted = organizationImpacts
        .filter(i => i.metricId && peopleMetricIds.has(i.metricId))
        .reduce((sum, i) => sum + (i.value || 0), 0);

      // SDG Distribution
      const sdgDistribution: Record<number, { hours: number; projects: number; volunteers: number }> = {};
      organizationProjects.forEach(project => {
        if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
          const projectHours = organizationActivities
            .filter(a => a.projectId === project.id)
            .reduce((sum, a) => sum + a.hours, 0);
          const projectVolunteers = organizationAssignments
            .filter(pa => pa.projectId === project.id)
            .map(pa => pa.volunteerId);
          
          project.sdgGoals.forEach(goal => {
            if (!sdgDistribution[goal]) {
              sdgDistribution[goal] = { hours: 0, projects: 0, volunteers: 0 };
            }
            sdgDistribution[goal].hours += projectHours;
            sdgDistribution[goal].projects += 1;
            sdgDistribution[goal].volunteers += projectVolunteers.length;
          });
        }
      });

      // Project locations for map
      const projectLocations = organizationProjects
        .filter(p => p.location)
        .map(p => ({
          id: p.id,
          name: p.name,
          location: p.location,
          status: p.status,
          sdgGoals: p.sdgGoals || [],
        }));

      // Alerts & Tasks (pending tasks, overdue tasks, new applications)
      const pendingTasks = organizationTasks.filter(t => t.status?.toLowerCase() === 'pending' || t.status?.toLowerCase() === 'in progress');
      const overdueTasks = organizationTasks.filter(t => {
        if (!t.dueDate) return false;
        return new Date(t.dueDate) < new Date() && t.status?.toLowerCase() !== 'completed';
      });

      const alerts = [
        ...overdueTasks.map(t => ({
          id: `task-${t.id}`,
          type: 'overdue_task',
          title: t.title,
          message: `Task "${t.title}" is overdue`,
          severity: 'high' as const,
          projectId: t.projectId,
          createdAt: t.dueDate,
        })),
        ...pendingTasks.slice(0, 5).map(t => ({
          id: `pending-${t.id}`,
          type: 'pending_task',
          title: t.title,
          message: `Task "${t.title}" needs attention`,
          severity: 'medium' as const,
          projectId: t.projectId,
          createdAt: t.createdAt,
        })),
      ].slice(0, 10);

      // Impact Over Time (last 12 months)
      const last12Months: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        last12Months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }

      const impactOverTime = last12Months.map(monthKey => {
        const monthActivities = organizationActivities.filter(a => {
          const activityDate = new Date(a.date);
          const activityMonth = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
          return activityMonth === monthKey;
        });
        const monthImpacts = organizationImpacts.filter(i => {
          const impactDate = new Date(i.date);
          const impactMonth = `${impactDate.getFullYear()}-${String(impactDate.getMonth() + 1).padStart(2, '0')}`;
          return impactMonth === monthKey;
        });
        
        return {
          month: monthKey,
          hours: monthActivities.reduce((sum, a) => sum + a.hours, 0),
          peopleImpacted: monthImpacts.filter(i => i.metricId && peopleMetricIds.has(i.metricId)).reduce((sum, i) => sum + (i.value || 0), 0),
          volunteers: new Set(monthActivities.map(a => a.userId)).size,
        };
      });

      // AI Insights (generated based on data)
      const avgHoursPerVolunteer = organizationVolunteers.length > 0 ? Math.round(totalHours / organizationVolunteers.length) : 0;
      const completionRate = organizationTasks.length > 0 
        ? Math.round((organizationTasks.filter(t => t.status?.toLowerCase() === 'completed').length / organizationTasks.length) * 100)
        : 0;
      const topSDG = Object.entries(sdgDistribution).sort((a, b) => b[1].hours - a[1].hours)[0];

      const aiInsights = [
        {
          id: 'insight-1',
          type: 'performance',
          title: 'Volunteer Engagement',
          message: avgHoursPerVolunteer > 10 
            ? `Strong engagement with ${avgHoursPerVolunteer} avg hours per volunteer`
            : `Consider volunteer engagement initiatives - ${avgHoursPerVolunteer} avg hours per volunteer`,
          sentiment: avgHoursPerVolunteer > 10 ? 'positive' : 'neutral',
        },
        {
          id: 'insight-2',
          type: 'completion',
          title: 'Task Completion',
          message: completionRate >= 80 
            ? `Excellent ${completionRate}% task completion rate`
            : `Task completion at ${completionRate}% - consider prioritizing pending tasks`,
          sentiment: completionRate >= 80 ? 'positive' : 'warning',
        },
        {
          id: 'insight-3',
          type: 'sdg',
          title: 'SDG Focus',
          message: topSDG 
            ? `SDG ${topSDG[0]} leads with ${topSDG[1].hours} hours across ${topSDG[1].projects} projects`
            : 'Link projects to SDGs to track impact alignment',
          sentiment: topSDG ? 'positive' : 'neutral',
        },
      ];

      // Volunteer summaries
      const volunteerSummaries = organizationVolunteers.map(v => {
        const vActivities = organizationActivities.filter(a => a.userId === v.id);
        return {
          id: v.id,
          name: v.displayName || v.username || 'Unknown',
          avatar: v.avatar,
          hours: vActivities.reduce((sum, a) => sum + a.hours, 0),
          projects: new Set(vActivities.map(a => a.projectId)).size,
          lastActive: vActivities.length > 0 ? vActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date : null,
        };
      }).sort((a, b) => b.hours - a.hours);

      // Quick actions available
      const quickActions = [
        { id: 'create-project', label: 'Create Project', icon: 'plus' },
        { id: 'invite-volunteer', label: 'Invite Volunteer', icon: 'user-plus' },
        { id: 'create-task', label: 'Create Task', icon: 'check-square' },
        { id: 'view-reports', label: 'View Reports', icon: 'bar-chart' },
      ];

      res.json({
        keyMetrics: {
          activeProjects,
          totalProjects: organizationProjects.length,
          totalHours,
          sdgsAddressed: uniqueSDGs.size,
          livesTouched: totalPeopleImpacted,
          activeVolunteers: organizationVolunteers.length,
        },
        sdgDistribution: Object.entries(sdgDistribution).map(([goal, data]) => ({
          goal: parseInt(goal),
          ...data,
        })).sort((a, b) => a.goal - b.goal),
        projectLocations,
        alerts,
        impactOverTime,
        aiInsights,
        projects: organizationProjects.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          completionPercentage: p.completionPercentage || 0,
          sdgGoals: p.sdgGoals || [],
          location: p.location,
        })),
        volunteerSummaries: volunteerSummaries.slice(0, 10),
        pendingTasks: pendingTasks.slice(0, 5),
        quickActions,
        filters: {
          projectId: projectFilter || 'all',
          timePeriod: timePeriod || 'all',
          availableProjects: allProjects.filter(p => p.organizationId === organizationId).map(p => ({ id: p.id, name: p.name })),
        },
      });
    } catch (err) {
      console.error("Error fetching organization dashboard:", err);
      res.status(500).json({ message: "Failed to fetch organization dashboard" });
    }
  });

  // === Dashboard Summary Route ===
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      
      if (!userId) {
        return res.status(400).json({ message: "userId parameter is required" });
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }

      // Get user to determine type
      const user = await storage.getUser(userIdNum);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Use secure service layer based on user type
      if (user.userType === 'organization') {
        const dashboardData = await getDashboardDataForOrganization(userIdNum);
        // Return full dashboard data with enriched projects and volunteers
        res.json({
          ...dashboardData.summary,
          projectsWithVolunteers: dashboardData.projectsWithVolunteers,
          volunteerSummaries: dashboardData.volunteerSummaries,
          tasks: dashboardData.tasks,
          activities: dashboardData.activities,
          impacts: dashboardData.impacts,
          monthlyImpactData: dashboardData.monthlyImpactData,
          monthlyImpactTrend: dashboardData.monthlyImpactTrend,
          impactGrowthSeries: dashboardData.impactGrowthSeries,
          projectHours: dashboardData.projectHours,
          totalPeopleImpacted: dashboardData.totalPeopleImpacted,
          projects: dashboardData.projects,
        });
      } else if (user.userType === 'volunteer') {
        const dashboardData = await getDashboardDataForVolunteer(userIdNum);
        // Return full dashboard data with all arrays needed for charts
        res.json({
          ...dashboardData.summary,
          volunteerProfile: dashboardData.volunteerProfile,
          applicationStats: dashboardData.applicationStats,
          hoursByProject: dashboardData.hoursByProject,
          monthlyImpactTrend: dashboardData.monthlyImpactTrend,
          monthlyImpactData: dashboardData.monthlyImpactData,
          impactGrowthSeries: dashboardData.impactGrowthSeries,
          projects: dashboardData.projects,
          tasks: dashboardData.tasks,
          activities: dashboardData.activities,
          impacts: dashboardData.impacts,
          applications: dashboardData.applications,
          matchedOpportunities: dashboardData.matchedOpportunities,
          projectAssignments: dashboardData.projectAssignments,
        });
      } else {
        return res.status(400).json({ message: "Invalid user type" });
      }
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
    }
  });

  // === SDG Contributions Overview Route ===
  app.get("/api/dashboard/sdg-contributions", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      
      if (!userId) {
        return res.status(400).json({ message: "userId parameter is required" });
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }

      // Get user to determine type
      const user = await storage.getUser(userIdNum);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Only organizations can access SDG contributions overview
      if (user.userType !== 'organization') {
        return res.status(403).json({ message: "Only organizations can access SDG contributions" });
      }

      const sdgData = await getSDGContributionsForOrganization(userIdNum);
      res.json(sdgData);
    } catch (err) {
      console.error("Error fetching SDG contributions:", err);
      res.status(500).json({ message: "Failed to fetch SDG contributions" });
    }
  });

  // === AI SDG Auto-Linking Route ===
  app.post("/api/projects/:id/auto-link-sdgs", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Check if project already has SDGs
      if (project.sdgGoals && project.sdgGoals.length > 0) {
        return res.json({ 
          message: "Project already has SDGs assigned",
          sdgGoals: project.sdgGoals,
          skipped: true
        });
      }

      // First try keyword-based matching
      const textToAnalyze = `${project.name} ${project.description || ''}`;
      const keywordSuggestions = suggestSDGsFromText(textToAnalyze);

      let suggestedSDGs = keywordSuggestions;

      // If no keyword matches or only one match, use AI for better suggestions
      if (keywordSuggestions.length < 2) {
        try {
          const openai = new OpenAI({
            apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
          });

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an expert in mapping projects to UN Sustainable Development Goals (SDGs).
Analyze the project and suggest 1-3 most relevant SDG numbers (1-17).
Return ONLY a JSON array of numbers, nothing else. Example: [3, 4, 10]`
              },
              {
                role: "user",
                content: `Project: ${project.name}\nDescription: ${project.description || 'No description'}\n\nWhich SDGs (1-17) does this project address?`
              }
            ],
            temperature: 0.3,
            max_tokens: 50,
          });

          const aiResponse = completion.choices[0]?.message?.content?.trim();
          if (aiResponse) {
            try {
              const aiSDGs = JSON.parse(aiResponse);
              if (Array.isArray(aiSDGs) && aiSDGs.every(n => typeof n === 'number' && n >= 1 && n <= 17)) {
                suggestedSDGs = aiSDGs.slice(0, 3);
              }
            } catch (parseErr) {
              console.error("Failed to parse AI response:", parseErr);
            }
          }
        } catch (aiErr) {
          console.error("AI SDG suggestion failed, using keyword-based:", aiErr);
        }
      }

      // Ensure we have at least one SDG
      if (suggestedSDGs.length === 0) {
        suggestedSDGs = [17]; // Default to "Partnerships for the Goals"
      }

      // Update project with suggested SDGs
      const updatedProject = await storage.updateProject(projectId, {
        sdgGoals: suggestedSDGs
      });

      res.json({
        message: "SDGs automatically linked to project",
        sdgGoals: suggestedSDGs,
        project: updatedProject
      });
    } catch (err) {
      console.error("Error auto-linking SDGs:", err);
      res.status(500).json({ 
        message: "Failed to auto-link SDGs",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // === Batch Auto-Link All Projects ===
  app.post("/api/projects/batch/auto-link-sdgs", async (req, res) => {
    try {
      const projects = await storage.listProjects();
      const results = {
        processed: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        details: [] as any[]
      };

      for (const project of projects) {
        results.processed++;
        
        try {
          // Skip if already has SDGs
          if (project.sdgGoals && project.sdgGoals.length > 0) {
            results.skipped++;
            results.details.push({
              projectId: project.id,
              projectName: project.name,
              status: 'skipped',
              sdgGoals: project.sdgGoals
            });
            continue;
          }

          // First try keyword-based matching
          const textToAnalyze = `${project.name} ${project.description || ''}`;
          const keywordSuggestions = suggestSDGsFromText(textToAnalyze);

          let suggestedSDGs = keywordSuggestions;

          // If no keyword matches or only one match, use AI
          if (keywordSuggestions.length < 2) {
            try {
              const openai = new OpenAI({
                apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
                baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
              });

              const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  {
                    role: "system",
                    content: `You are an expert in mapping projects to UN Sustainable Development Goals (SDGs).
Analyze the project and suggest 1-3 most relevant SDG numbers (1-17).
Return ONLY a JSON array of numbers, nothing else. Example: [3, 4, 10]`
                  },
                  {
                    role: "user",
                    content: `Project: ${project.name}\nDescription: ${project.description || 'No description'}\n\nWhich SDGs (1-17) does this project address?`
                  }
                ],
                temperature: 0.3,
                max_tokens: 50,
              });

              const aiResponse = completion.choices[0]?.message?.content?.trim();
              if (aiResponse) {
                try {
                  const aiSDGs = JSON.parse(aiResponse);
                  if (Array.isArray(aiSDGs) && aiSDGs.every(n => typeof n === 'number' && n >= 1 && n <= 17)) {
                    suggestedSDGs = aiSDGs.slice(0, 3);
                  }
                } catch (parseErr) {
                  console.error("Failed to parse AI response:", parseErr);
                }
              }
            } catch (aiErr) {
              console.error("AI SDG suggestion failed for project", project.id, aiErr);
            }
          }

          // Ensure we have at least one SDG
          if (suggestedSDGs.length === 0) {
            suggestedSDGs = [17]; // Default to "Partnerships for the Goals"
          }

          // Update project
          await storage.updateProject(project.id, {
            sdgGoals: suggestedSDGs
          });

          results.updated++;
          results.details.push({
            projectId: project.id,
            projectName: project.name,
            status: 'updated',
            sdgGoals: suggestedSDGs
          });

        } catch (projectErr) {
          results.failed++;
          results.details.push({
            projectId: project.id,
            projectName: project.name,
            status: 'failed',
            error: projectErr instanceof Error ? projectErr.message : String(projectErr)
          });
        }
      }

      res.json({
        message: "Batch SDG auto-linking completed",
        results
      });
    } catch (err) {
      console.error("Error in batch auto-link:", err);
      res.status(500).json({ 
        message: "Failed to batch auto-link SDGs",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  });

  // === Profile Update Routes ===
  // Update volunteer profile (updates both users table and volunteers matching table)
  app.patch("/api/profile/volunteer", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.userType !== 'volunteer') {
        return res.status(403).json({ message: "User is not a volunteer" });
      }
      
      const { profilePhotoUrl, skills, interests, location, sdgGoals, bio, displayName, skillRatings, weeklyAvailability, availability, preferredWorkStyle, volunteerName, professionalTitle, yearsOfExperience, linkedinProfile, timezone, preferredCommitment, matchingPriorities, employerId, departmentName, jobTitleAtCompany } = req.body;
      
      // Use profile service to atomically update both users and volunteer_profiles tables
      const profileUpdate = await updateVolunteerProfileWithUser(userId, {
        avatar: profilePhotoUrl,
        bio,
        displayName,
        skills,
        interests,
        location,
        preferredSdgs: sdgGoals,
        skillRatings,
        weeklyAvailability,
        availability,
        preferredWorkStyle,
        volunteerName,
        professionalTitle,
        yearsOfExperience,
        linkedinProfile,
        timezone,
        preferredCommitment,
        matchingPriorities,
        employerId,
        departmentName,
        jobTitleAtCompany
      });

      // Note: employerId is stored in the profile but NOT automatically linked to employee engagement.
      // Employees must manually assign work to their corporation via the dashboard/work assignment feature.
      
      // Update legacy volunteer matching profile (best effort, outside transaction)
      if (user.email) {
        try {
          const existingVolunteer = await storage.getVolunteerByEmail(user.email);
          
          if (existingVolunteer) {
            // Update existing volunteer profile
            const volunteerUpdates: any = {};
            if (profilePhotoUrl !== undefined) volunteerUpdates.profilePhotoUrl = profilePhotoUrl;
            if (skills !== undefined) volunteerUpdates.skills = skills;
            if (interests !== undefined) volunteerUpdates.interests = interests;
            if (location !== undefined) volunteerUpdates.location = location;
            if (sdgGoals !== undefined) volunteerUpdates.sdgGoals = sdgGoals;
            if (displayName !== undefined) volunteerUpdates.name = displayName;
            
            await storage.updateVolunteer(existingVolunteer.id, volunteerUpdates);
          } else {
            // Create new volunteer profile if it doesn't exist
            if (skills && interests && location && sdgGoals && displayName) {
              await storage.createVolunteer({
                id: `vol_${user.email}`,
                email: user.email,
                name: displayName,
                profilePhotoUrl: profilePhotoUrl || null,
                skills,
                interests,
                location,
                sdgGoals
              });
            }
          }
        } catch (err) {
          console.error("Error updating legacy volunteer table (non-critical):", err);
          // This is legacy data, don't fail the request if it errors
        }
      }
      
      // Return both user and volunteer profile (matching GET endpoint structure)
      const updatedUser = await storage.getUser(userId);
      const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
      
      res.json({
        user: updatedUser,
        volunteerProfile
      });
    } catch (err) {
      console.error("Error updating volunteer profile:", err);
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // Update organization profile (updates both users/organizations tables and matchable_organizations table)
  app.patch("/api/profile/organization", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.userType !== 'organization') {
        return res.status(403).json({ message: "User is not an organization" });
      }
      
      const { profilePhotoUrl, name, mission, needs, sdgFocus, location, bio, displayName, website, contactEmail } = req.body;
      console.log('[OrganizationProfile PATCH] Received data:', { needs, sdgFocus, mission, name });
      
      // Create organization if it doesn't exist
      if (!user.organizationId && name) {
        const newOrg = await storage.createOrganization({
          name,
          description: bio || "",
          logo: profilePhotoUrl || null,
          website: website || null,
          contactEmail: contactEmail || user.email || "",
        });
        
        // Link user to the new organization
        await storage.updateUser(userId, { organizationId: newOrg.id });
        user.organizationId = newOrg.id;
      }
      
      // Update user table
      const userUpdates: any = {};
      if (profilePhotoUrl !== undefined) userUpdates.avatar = profilePhotoUrl;
      if (bio !== undefined) userUpdates.bio = bio;
      if (displayName !== undefined) userUpdates.displayName = displayName;
      
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(userId, userUpdates);
      }
      
      // Update organization table (only if user has an organization)
      if (user.organizationId) {
        const orgUpdates: any = {};
        if (profilePhotoUrl !== undefined) orgUpdates.logo = profilePhotoUrl;
        if (name !== undefined) orgUpdates.name = name;
        if (website !== undefined) orgUpdates.website = website;
        if (contactEmail !== undefined) orgUpdates.contactEmail = contactEmail;
        if (sdgFocus !== undefined) orgUpdates.primarySdgs = sdgFocus;
        if (needs !== undefined) orgUpdates.needs = needs;
        if (mission !== undefined) orgUpdates.goals = mission;
        
        console.log('[OrganizationProfile] Updating organization with:', orgUpdates);
        
        if (Object.keys(orgUpdates).length > 0) {
          await storage.updateOrganization(user.organizationId, orgUpdates);
        }
      }
      
      // Update or create matchable organization profile
      if (user.email) {
        try {
          const existingOrg = await storage.getMatchableOrganizationByEmail(user.email);
          
          if (existingOrg) {
            // Update existing matchable organization
            const matchableOrgUpdates: any = {};
            if (profilePhotoUrl !== undefined) matchableOrgUpdates.profilePhotoUrl = profilePhotoUrl;
            if (name !== undefined) matchableOrgUpdates.name = name;
            if (mission !== undefined) matchableOrgUpdates.mission = mission;
            if (needs !== undefined) matchableOrgUpdates.needs = needs;
            if (sdgFocus !== undefined) matchableOrgUpdates.sdgFocus = sdgFocus;
            if (location !== undefined) matchableOrgUpdates.location = location;
            
            await storage.updateMatchableOrganization(existingOrg.id, matchableOrgUpdates);
          } else {
            // Create new matchable organization if it doesn't exist
            if (name && mission && needs && sdgFocus && location) {
              await storage.createMatchableOrganization({
                id: `org_${user.email}`,
                email: user.email,
                name,
                profilePhotoUrl: profilePhotoUrl || null,
                mission,
                needs,
                sdgFocus,
                location
              });
            }
          }
        } catch (err) {
          console.error("Error updating matchable organization profile:", err);
          // Continue even if matching profile update fails
        }
      }
      
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
    } catch (err) {
      console.error("Error updating organization profile:", err);
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  // Get volunteer profile data (combines user and volunteer matching data)
  app.get("/api/profile/volunteer", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.userType !== 'volunteer') {
        return res.status(403).json({ message: "User is not a volunteer" });
      }
      
      // Get volunteer profile from volunteer_profiles table (where intake form saves)
      let volunteerProfile = null;
      try {
        volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
        if (volunteerProfile) {
          console.log(`[Profile GET] Retrieved profile for user ${userId}, skillRatings:`, JSON.stringify(volunteerProfile.skillRatings));
        }
      } catch (err) {
        console.error("Error fetching volunteer profile:", err);
      }
      
      // Calculate profile completion based on filled fields
      const profileCompletion = volunteerProfile ? calculateProfileCompletion(volunteerProfile) : 0;
      const profileComplete = profileCompletion === 100;
      
      res.json({
        user: {
          ...user,
          profileComplete,
          profileCompletion
        },
        volunteerProfile
      });
    } catch (err) {
      console.error("Error fetching volunteer profile:", err);
      res.status(500).json({ message: "Failed to fetch volunteer profile" });
    }
  });

  // Get organization profile data (combines user, organization, and matchable organization data)
  app.get("/api/profile/organization", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.userType !== 'organization') {
        return res.status(403).json({ message: "User is not an organization" });
      }
      
      let organization = null;
      if (user.organizationId) {
        organization = await storage.getOrganization(user.organizationId);
      }
      
      let matchableOrganization = null;
      if (user.email) {
        try {
          matchableOrganization = await storage.getMatchableOrganizationByEmail(user.email);
        } catch (err) {
          console.error("Error fetching matchable organization:", err);
        }
      }
      
      // Get organization profile to check onboarding status
      let organizationProfile = null;
      if (user.organizationId) {
        try {
          organizationProfile = await storage.getOrganizationProfile(user.organizationId);
        } catch (err) {
          console.error("Error fetching organization profile:", err);
        }
      }
      
      // Add profileComplete field to user based on onboardingCompleted status
      const profileComplete = organizationProfile?.onboardingCompleted || false;
      
      res.json({
        user: {
          ...user,
          profileComplete
        },
        organization,
        organizationProfile,
        matchableOrganization
      });
    } catch (err) {
      console.error("Error fetching organization profile:", err);
      res.status(500).json({ message: "Failed to fetch organization profile" });
    }
  });

  // === Intake Form Routes ===
  
  // Volunteer Profile Intake - Get volunteer profile
  app.get("/api/intake/volunteer-profile", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const user = await storage.getUser(userId);
      const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return both user and volunteerProfile so frontend can access all data
      res.json({
        user,
        volunteerProfile
      });
    } catch (err) {
      console.error("Error fetching volunteer profile:", err);
      res.status(500).json({ message: "Failed to fetch volunteer profile" });
    }
  });

  // Volunteer Profile Intake - Create or update
  app.post("/api/intake/volunteer-profile", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      console.log(`[Intake POST CRITICAL] ===== PROCESSING SAVE FOR USER ID: ${userId} =====`);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[Intake POST CRITICAL] User email: ${user.email}, DisplayName: ${user.displayName}`);
      
      // Always calculate total hours from availability slots
      if (req.body.availability && Array.isArray(req.body.availability) && req.body.availability.length > 0) {
        const totalAvailabilityHours = (req.body.availability as any[]).reduce((sum, slot) => {
          const start = parseInt(slot.startTime?.split(':')[0] || 0);
          const end = parseInt(slot.endTime?.split(':')[0] || 0);
          return sum + Math.max(0, end - start);
        }, 0);
        
        // If weeklyAvailability is provided, use the lesser of input vs calculated hours
        // If not provided, use the calculated hours from slots
        if (req.body.weeklyAvailability) {
          const availabilityHours = Math.min(req.body.weeklyAvailability, totalAvailabilityHours);
          console.log(`[Intake POST CRITICAL] User ${userId} - Setting weeklyAvailability to min(${req.body.weeklyAvailability}, ${totalAvailabilityHours}) = ${availabilityHours}`);
          req.body.weeklyAvailability = availabilityHours;
        } else {
          console.log(`[Intake POST CRITICAL] User ${userId} - Auto-calculating weeklyAvailability from slots = ${totalAvailabilityHours}`);
          req.body.weeklyAvailability = totalAvailabilityHours;
        }
      } else if (!req.body.weeklyAvailability) {
        // No slots and no hours provided - default to 0
        req.body.weeklyAvailability = 0;
      }
      
      console.log(`[Intake POST] Received skillRatings for user ${userId}:`, JSON.stringify(req.body.skillRatings));
      console.log(`[Intake POST] Received availability for user ${userId}:`, JSON.stringify(req.body.availability));
      console.log(`[Intake POST] Received yearsOfExperience for user ${userId}:`, JSON.stringify(req.body.yearsOfExperience));
      
      const existingProfile = await storage.getVolunteerProfileByUserId(userId);
      
      // Ensure skillRatings, availability, yearsOfExperience, and profilePhotoUrl are preserved in the update
      const profileData = {
        ...req.body,
        userId,
        onboardingCompleted: true,
        skillRatings: req.body.skillRatings || {}, // Explicitly preserve skillRatings
        availability: req.body.availability || [], // Explicitly preserve availability
        yearsOfExperience: req.body.yearsOfExperience || null, // Explicitly preserve yearsOfExperience
        profilePhotoUrl: req.body.profilePhotoUrl || null // Explicitly preserve profile photo
      };
      
      console.log(`[Intake POST] Saving profile data with skillRatings:`, JSON.stringify(profileData.skillRatings));
      console.log(`[Intake POST] Saving profile data with availability:`, JSON.stringify(profileData.availability));
      console.log(`[Intake POST] Saving profile data with yearsOfExperience:`, JSON.stringify(profileData.yearsOfExperience));
      
      let profile;
      if (existingProfile) {
        console.log(`[Intake POST CRITICAL] UPDATING existing profile for user ${userId}. New weeklyAvailability: ${profileData.weeklyAvailability}`);
        profile = await storage.updateVolunteerProfile(existingProfile.id, profileData);
      } else {
        console.log(`[Intake POST CRITICAL] CREATING new profile for user ${userId}. weeklyAvailability: ${profileData.weeklyAvailability}`);
        profile = await storage.createVolunteerProfile(profileData);
      }
      
      console.log(`[Intake POST CRITICAL] Profile saved for user ${userId}. Fetching to verify...`);
      const savedProfile = await storage.getVolunteerProfileByUserId(userId);
      console.log(`[Intake POST CRITICAL] VERIFIED: User ${userId} now has weeklyAvailability = ${savedProfile?.weeklyAvailability}`);
      console.log(`[Intake POST] Verified saved skillRatings:`, JSON.stringify(savedProfile?.skillRatings));
      console.log(`[Intake POST] Verified saved availability:`, JSON.stringify(savedProfile?.availability));
      console.log(`[Intake POST] Verified saved yearsOfExperience:`, JSON.stringify(savedProfile?.yearsOfExperience));
      
      // Update user's displayName, userType, and skills if needed (profile photo saved to volunteerProfiles)
      const updates: any = {};
      if (!user.userType) {
        updates.userType = 'volunteer';
      }
      if (req.body.volunteerName && req.body.volunteerName !== user.displayName) {
        updates.displayName = req.body.volunteerName;
      }
      // Update skills in users table to match volunteer_profiles (for matching algorithm)
      if (req.body.skills) {
        updates.skills = req.body.skills;
      }
      if (Object.keys(updates).length > 0) {
        await storage.updateUser(userId, updates);
      }
      
      // Create or update matchable volunteer for algorithm
      if (profile) {
        const matchableVolId = `vol_${user.email}`;
        console.log(`Creating/updating matchable volunteer: ${matchableVolId}`);
        const existingMatchableVol = await storage.getVolunteer(matchableVolId);
        
        // Use the updated name from request body, not the stale user object
        const volunteerName = req.body.volunteerName || user.displayName || user.email || 'Volunteer';
        
        const matchableVolData = {
          email: user.email || '',
          name: volunteerName,
          profilePhotoUrl: profile.profilePhotoUrl || user.avatar || null,
          skills: profile.skills || [],
          interests: profile.interests || [],
          location: profile.location || profile.city || '',
          sdgGoals: profile.preferredSdgs || []
        };
        
        console.log('Matchable volunteer data:', JSON.stringify(matchableVolData, null, 2));
        
        if (existingMatchableVol) {
          console.log('Updating existing matchable volunteer');
          await storage.updateVolunteer(matchableVolId, matchableVolData);
        } else {
          console.log('Creating new matchable volunteer');
          await storage.createVolunteer({
            id: matchableVolId,
            ...matchableVolData
          } as any);
        }
        console.log('Matchable volunteer created/updated successfully');
      }
      
      broadcastUpdate("volunteer_profile_updated", profile);
      
      // Return same structure as GET endpoint so frontend receives consistent data
      const updatedUser = await storage.getUser(userId);
      res.json({
        user: updatedUser,
        volunteerProfile: profile
      });
    } catch (err) {
      console.error("Error saving volunteer profile:", err);
      res.status(500).json({ message: "Failed to save volunteer profile" });
    }
  });

  // Organization Profile Intake - Get organization profile
  app.get("/api/intake/organization-profile", async (req, res) => {
    try {
      const orgIdParam = req.query.organizationId as string;
      
      if (!orgIdParam) {
        return res.status(400).json({ message: "organizationId parameter is required" });
      }
      
      const organizationId = parseInt(orgIdParam);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "organizationId must be a valid number" });
      }
      
      const profile = await storage.getOrganizationProfileByOrgId(organizationId);
      res.json(profile);
    } catch (err) {
      console.error("Error fetching organization profile:", err);
      res.status(500).json({ message: "Failed to fetch organization profile" });
    }
  });

  // Organization Profile Intake - Create or update
  app.post("/api/intake/organization-profile", async (req, res) => {
    try {
      const userIdParam = req.query.organizationId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "organizationId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "organizationId must be a valid number" });
      }
      
      // Get the user to access their email
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get or create organization
      let organization;
      let organizationId: number;
      
      if (user.organizationId) {
        // User already has an organization
        organization = await storage.getOrganization(user.organizationId);
        if (!organization) {
          return res.status(404).json({ message: "Organization not found" });
        }
        organizationId = user.organizationId;
      } else {
        // Create new organization for this user
        const { organizationName, organizationLocation } = req.body;
        if (!organizationName) {
          return res.status(400).json({ message: "organizationName is required for new organizations" });
        }
        
        organization = await storage.createOrganization({
          name: organizationName,
          contactEmail: user.email || '',
          description: req.body.missionStatement || '',
          address: organizationLocation || ''
        });
        organizationId = organization.id;
        
        // Update user with organizationId
        await storage.updateUser(userId, { organizationId: organization.id });
      }
      
      const existingProfile = await storage.getOrganizationProfileByOrgId(organizationId);
      
      let profile;
      if (existingProfile) {
        profile = await storage.updateOrganizationProfile(existingProfile.id, {
          ...req.body,
          organizationId
        });
      } else {
        profile = await storage.createOrganizationProfile({
          ...req.body,
          organizationId
        });
      }
      
      // Update user with userType if needed (logo saved to organization and organizationProfile)
      const userUpdates: any = {};
      if (!user.userType) {
        userUpdates.userType = 'organization';
      }
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(user.id, userUpdates);
      }
      
      // Update organization with logo if provided
      if (req.body.logo) {
        await storage.updateOrganization(organizationId, { logo: req.body.logo });
      }
      
      // Create or update matchable organization for algorithm
      if (profile) {
        const matchableOrgId = `org_${organization.contactEmail || organizationId}`;
        const existingMatchableOrg = await storage.getMatchableOrganization(matchableOrgId);
        
        const matchableOrgData = {
          email: organization.contactEmail || '',
          name: organization.name || 'Organization',
          logo: req.body.logo || organization.logo || null,
          mission: profile.missionStatement || '',
          needs: profile.volunteerNeeds || [],
          sdgFocus: profile.primarySdgs || [],
          location: organization.address || ''
        };
        
        if (existingMatchableOrg) {
          await storage.updateMatchableOrganization(matchableOrgId, matchableOrgData);
        } else {
          await storage.createMatchableOrganization({
            id: matchableOrgId,
            ...matchableOrgData
          } as any);
        }
      }
      
      broadcastUpdate("organization_profile_updated", profile);
      res.json(profile);
    } catch (err) {
      console.error("Error saving organization profile:", err);
      res.status(500).json({ message: "Failed to save organization profile" });
    }
  });

  // Delete user account and all associated data
  app.delete("/api/users/me", async (req, res) => {
    try {
      // TODO: Get userId from session instead of hardcoding
      const userId = 1;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Delete associated data based on user type
      if (user.userType === 'volunteer') {
        // Delete from matching tables
        if (user.email) {
          try {
            const volunteer = await storage.getVolunteerByEmail(user.email);
            if (volunteer) {
              // Note: We can't directly delete from volunteers table without a storage method
              // The deletion will be handled by Firebase user deletion in frontend
              console.log(`Volunteer profile for ${user.email} should be cleaned up`);
            }
          } catch (err) {
            console.error("Error deleting volunteer profile:", err);
          }
        }
        
        // Delete volunteer activities
        // Note: Would need storage.deleteVolunteerActivitiesByUserId method
        
      } else if (user.userType === 'organization') {
        // Delete from matching tables
        if (user.email) {
          try {
            const matchableOrg = await storage.getMatchableOrganizationByEmail(user.email);
            if (matchableOrg) {
              console.log(`Matchable org for ${user.email} should be cleaned up`);
            }
          } catch (err) {
            console.error("Error deleting matchable organization:", err);
          }
        }
        
        // Organization data cleanup would happen here
        // Projects, tasks, opportunities, etc.
      }
      
      // Note: The actual user deletion happens in Firebase on the frontend
      // This route serves as a placeholder for backend data cleanup
      // In a production app, you would delete all associated records here
      
      res.json({ 
        message: "Account deletion initiated. Please complete deletion in Firebase Auth.",
        success: true 
      });
    } catch (err) {
      console.error("Error deleting user account:", err);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // Get notifications for a user
  app.get("/api/notifications", async (req, res) => {
    try {
      const userIdParam = req.query.userId as string;
      
      if (!userIdParam) {
        return res.status(400).json({ message: "userId parameter is required" });
      }
      
      const userId = parseInt(userIdParam);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "userId must be a valid number" });
      }
      
      const notifications = await storage.getNotifications(userId);
      
      res.json(notifications);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      
      if (isNaN(notificationId)) {
        return res.status(400).json({ message: "Invalid notification ID" });
      }
      
      const notification = await storage.markNotificationRead(notificationId);
      
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.json(notification);
    } catch (err) {
      console.error("Error marking notification as read:", err);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // === User Data Validation Routes ===
  
  // Validate user data consistency (users can only validate their own data)
  app.get("/api/user-validation/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Authorization: Users can only validate their own data
      const authenticatedUserId = extractUserId(req);
      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ message: "You can only validate your own data" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const discrepancies: any[] = [];
      
      // Check volunteer profile name consistency
      if (user.userType === 'volunteer') {
        const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
        if (volunteerProfile) {
          const userName = (user.displayName || '').trim().toLowerCase();
          const profileName = (volunteerProfile.volunteerName || '').trim().toLowerCase();
          
          if (userName && profileName && userName !== profileName) {
            discrepancies.push({
              type: 'name_mismatch',
              field: 'displayName',
              userValue: user.displayName,
              profileValue: volunteerProfile.volunteerName,
              severity: 'warning',
              message: `User display name "${user.displayName}" differs from profile name "${volunteerProfile.volunteerName}"`
            });
            
            // Log the discrepancy
            await storage.createUserDataAuditLog({
              userId,
              action: 'validation_check',
              tableName: 'volunteer_profiles',
              recordId: volunteerProfile.id,
              previousData: { displayName: user.displayName },
              newData: { volunteerName: volunteerProfile.volunteerName },
              discrepancyType: 'name_mismatch',
              discrepancyDetails: `Name mismatch: "${user.displayName}" vs "${volunteerProfile.volunteerName}"`,
              resolvedAt: null,
              resolvedBy: null,
              ipAddress: req.ip || null,
              userAgent: req.get('user-agent') || null
            });
          }
        } else {
          discrepancies.push({
            type: 'missing_profile',
            field: 'volunteerProfile',
            severity: 'warning',
            message: 'Volunteer user is missing their volunteer profile'
          });
        }
      }
      
      // Check organization profile consistency
      if (user.userType === 'organization' && user.organizationId) {
        const orgProfile = await storage.getOrganizationProfileByOrgId(user.organizationId);
        if (!orgProfile) {
          discrepancies.push({
            type: 'missing_profile',
            field: 'organizationProfile',
            severity: 'warning',
            message: 'Organization user is missing their organization profile'
          });
        }
      }
      
      res.json({
        userId,
        isValid: discrepancies.filter(d => d.severity === 'error').length === 0,
        discrepancies,
        checkedAt: new Date().toISOString()
      });
    } catch (err) {
      console.error("Error validating user data:", err);
      res.status(500).json({ message: "Failed to validate user data" });
    }
  });

  // Sync user display name across all related tables (users can only sync their own data)
  app.post("/api/user-validation/:userId/sync-name", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { displayName } = req.body;
      
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Authorization: Users can only sync their own data
      const authenticatedUserId = extractUserId(req);
      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ message: "You can only update your own data" });
      }
      
      if (!displayName || typeof displayName !== 'string') {
        return res.status(400).json({ message: "displayName is required" });
      }
      
      // Validate name format
      const trimmedName = displayName.trim();
      if (trimmedName.length < 2 || trimmedName.length > 100) {
        return res.status(400).json({ message: "Name must be between 2 and 100 characters" });
      }
      
      const nameRegex = /^[a-zA-Z\s\-'.]+$/;
      if (!nameRegex.test(trimmedName)) {
        return res.status(400).json({ message: "Name contains invalid characters" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const previousDisplayName = user.displayName;
      
      // Update user display name
      await storage.updateUser(userId, { displayName: trimmedName });
      
      // Log the change
      await storage.createUserDataAuditLog({
        userId,
        action: 'update',
        tableName: 'users',
        recordId: userId,
        previousData: { displayName: previousDisplayName },
        newData: { displayName: trimmedName },
        discrepancyType: null,
        discrepancyDetails: null,
        resolvedAt: null,
        resolvedBy: null,
        ipAddress: req.ip || null,
        userAgent: req.get('user-agent') || null
      });
      
      // Sync to volunteer profile if applicable
      if (user.userType === 'volunteer') {
        const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);
        if (volunteerProfile) {
          const previousVolunteerName = volunteerProfile.volunteerName;
          await storage.updateVolunteerProfile(volunteerProfile.id, { volunteerName: trimmedName });
          
          await storage.createUserDataAuditLog({
            userId,
            action: 'data_sync',
            tableName: 'volunteer_profiles',
            recordId: volunteerProfile.id,
            previousData: { volunteerName: previousVolunteerName },
            newData: { volunteerName: trimmedName },
            discrepancyType: null,
            discrepancyDetails: 'Synced volunteer profile name to match user display name',
            resolvedAt: null,
            resolvedBy: null,
            ipAddress: req.ip || null,
            userAgent: req.get('user-agent') || null
          });
        }
      }
      
      res.json({
        success: true,
        message: 'Name synced successfully across all profiles',
        userId,
        displayName: trimmedName
      });
    } catch (err) {
      console.error("Error syncing user name:", err);
      res.status(500).json({ message: "Failed to sync user name" });
    }
  });

  // Get user data audit logs (users can only view their own audit logs)
  app.get("/api/user-validation/:userId/audit-logs", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      // Authorization: Users can only view their own audit logs
      const authenticatedUserId = extractUserId(req);
      if (!authenticatedUserId || authenticatedUserId !== userId) {
        return res.status(403).json({ message: "You can only view your own audit logs" });
      }
      
      const auditLogs = await storage.getUserDataAuditLogs(userId);
      res.json(auditLogs);
    } catch (err) {
      console.error("Error fetching audit logs:", err);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Get unresolved discrepancies (users can only view their own discrepancies)
  app.get("/api/user-validation/discrepancies/unresolved", async (req, res) => {
    try {
      // Authorization: Require user ID and validate ownership
      const authenticatedUserId = extractUserId(req);
      if (!authenticatedUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Users can only fetch their own discrepancies
      const discrepancies = await storage.getUnresolvedDiscrepancies(authenticatedUserId);
      res.json(discrepancies);
    } catch (err) {
      console.error("Error fetching unresolved discrepancies:", err);
      res.status(500).json({ message: "Failed to fetch unresolved discrepancies" });
    }
  });

  // Resolve a discrepancy (users can only resolve their own discrepancies)
  app.post("/api/user-validation/discrepancies/:id/resolve", async (req, res) => {
    try {
      const discrepancyId = parseInt(req.params.id);
      
      if (isNaN(discrepancyId)) {
        return res.status(400).json({ message: "Invalid discrepancy ID" });
      }
      
      // Authorization: Get authenticated user
      const authenticatedUserId = extractUserId(req);
      if (!authenticatedUserId) {
        return res.status(401).json({ message: "Authentication required" });
      }
      
      // Verify the discrepancy belongs to the authenticated user
      const discrepancy = await storage.getDiscrepancyById(discrepancyId);
      if (!discrepancy) {
        return res.status(404).json({ message: "Discrepancy not found" });
      }
      
      if (discrepancy.userId !== authenticatedUserId) {
        return res.status(403).json({ message: "You can only resolve your own discrepancies" });
      }
      
      const resolved = await storage.resolveDiscrepancy(discrepancyId, authenticatedUserId);
      
      if (!resolved) {
        return res.status(404).json({ message: "Discrepancy not found" });
      }
      
      res.json(resolved);
    } catch (err) {
      console.error("Error resolving discrepancy:", err);
      res.status(500).json({ message: "Failed to resolve discrepancy" });
    }
  });

  // Helper: Deduplicate and aggregate metrics from stories
  function deduplicateMetrics(text: string): string {
    if (!text) return "";
    
    const metricMap = new Map<string, number>();
    
    // Pattern to find metrics like "X increased by Y (percentage%)" or just "X: Y"
    const metricPattern = /([A-Za-z\s]+?)\s+(?:increased\s+)?(?:by\s+)?(\d+)/gi;
    let match;
    
    while ((match = metricPattern.exec(text)) !== null) {
      const metricName = match[1].toLowerCase().trim();
      const value = parseInt(match[2]);
      
      // Aggregate - sum duplicate metrics
      metricMap.set(metricName, (metricMap.get(metricName) || 0) + value);
    }
    
    // Rebuild the text without duplicates
    let cleanText = text;
    metricMap.forEach((total, metric) => {
      // Remove all occurrences of this metric
      const pattern = new RegExp(`${metric}\\s+(?:increased\\s+)?(?:by\\s+)?\\d+[^,\\.]*`, 'gi');
      cleanText = cleanText.replace(pattern, '');
    });
    
    // Add aggregated metrics once
    let aggregatedMetrics = "";
    metricMap.forEach((total, metric) => {
      aggregatedMetrics += `${metric} (${total}), `;
    });
    
    // Clean up the text and append aggregated metrics
    cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();
    if (aggregatedMetrics) {
      cleanText = cleanText + "\n\nKey Impact Metrics: " + aggregatedMetrics.slice(0, -2);
    }
    
    return cleanText;
  }

  // AI-Powered Impact Report Generation
  app.post("/api/generate-impact-report", async (req, res) => {
    try {
      const {
        projectTitle,
        reportingPeriod,
        locationsServed,
        keyStories,
        csrAlignment,
        targetAudience,
        tone,
        impactFocus,
        organizationName,
        metrics,
      } = req.body;

      if (!projectTitle || !reportingPeriod) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      try {
        // DEDUPLICATE the keyStories to remove repeated metrics
        const cleanStories = deduplicateMetrics(keyStories);
        
        const openai = new OpenAI({
          apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
          baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        });

        const systemPrompt = `You are an expert impact report writer for nonprofit organizations. Create compelling, funder-ready impact reports that are well-structured, data-driven, and emotionally resonant. 

MANDATORY RULES - NON-NEGOTIABLE:
- EACH METRIC APPEARS EXACTLY ONCE - NO EXCEPTIONS
- NEVER list the same metric multiple times
- SUM all similar metrics into a single total (not separate line items)
- Example: DO NOT say "Students Educated: 35" then "Students Educated: 35" again
- Example DO: "Students Educated: 70" (if there were two instances of 35)
- Treat ALL beneficiary-type metrics as ONE "Total People Impacted" figure
- Format as a professional, compelling narrative`;

        // Extract aggregated totals from metrics
        const volunteerCount = metrics?.activeVolunteers || metrics?.totalVolunteers || 0;
        const totalHours = metrics?.totalHours || 0;
        const projectCount = metrics?.activeProjects || 0;
        const beneficiaryTotal = metrics?.totalBeneficiariesReached || 0;

        const userPrompt = `Generate a professional Synerxus Impact Report with ZERO metric duplication:

ORGANIZATION: ${organizationName}
PROJECT: ${projectTitle}
REPORTING PERIOD: ${reportingPeriod}
LOCATIONS: ${locationsServed}

MASTER METRICS (these are the ONLY numbers to reference, each once):
- Volunteers: ${volunteerCount}
- Hours: ${totalHours}
- Projects: ${projectCount}
- Total People Impacted: ${beneficiaryTotal}

IMPACT STORY (already deduplicated):
${cleanStories}

CSR/ESG: ${csrAlignment}

Target: ${targetAudience} | Tone: ${tone} | Focus: ${impactFocus}

REPORT FORMAT:
1. Header (Organization, Date)
2. Executive Summary (use the master metrics ONCE each)
3. Key Achievements (reference master metrics, no duplication)
4. Impact Story (from deduplicated story above)
5. CSR/ESG Alignment
6. Next Steps

CRITICAL: If you reference "Students Educated: 35" or any metric, it must ONLY appear once in the entire report. If similar metrics exist, combine them into totals.`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.5,
          max_tokens: 2500,
        });

        const reportContent = completion.choices[0]?.message?.content;
        if (!reportContent) {
          return res.status(500).json({ message: "Failed to generate report content" });
        }

        return res.json({
          report: reportContent,
          generatedAt: new Date().toISOString(),
          success: true,
        });
      } catch (openaiErr: any) {
        console.error("OpenAI API Error:", openaiErr.message || openaiErr);
        return res.status(503).json({ 
          message: "OpenAI service unavailable. Check API key configuration.",
          error: openaiErr.message 
        });
      }
    } catch (err) {
      console.error("Error generating impact report:", err);
      res.status(500).json({ message: "Failed to generate impact report" });
    }
  });

  // Email Digest Routes
  app.post("/api/email-digest/send", async (req, res) => {
    try {
      const userId = await extractUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const success = await sendWeeklyDigest(userId);
      if (success) {
        return res.json({ 
          message: "Weekly digest sent successfully",
          success: true 
        });
      } else {
        return res.status(500).json({ 
          message: "Failed to send email digest",
          success: false 
        });
      }
    } catch (err) {
      console.error("Error sending email digest:", err);
      res.status(500).json({ message: "Error sending email digest" });
    }
  });

  app.post("/api/email-digest/send-all", async (req, res) => {
    try {
      const userId = await extractUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'organization') {
        return res.status(403).json({ message: "Only organization managers can use this endpoint" });
      }

      const result = await sendWeeklyDigestsToAll();
      return res.json({
        message: "Weekly digests sent",
        ...result
      });
    } catch (err) {
      console.error("Error sending all digests:", err);
      res.status(500).json({ message: "Error sending digests" });
    }
  });

  app.post("/api/email-digest/organization/:organizationId", async (req, res) => {
    try {
      const userId = await extractUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.organizationId?.toString() !== req.params.organizationId) {
        return res.status(403).json({ message: "You can only send digests for your own organization" });
      }

      const success = await sendOrganizationWeeklyDigest(parseInt(req.params.organizationId));
      if (success) {
        return res.json({ 
          message: "Organization digest sent successfully",
          success: true 
        });
      } else {
        return res.status(500).json({ 
          message: "Failed to send organization digest",
          success: false 
        });
      }
    } catch (err) {
      console.error("Error sending org digest:", err);
      res.status(500).json({ message: "Error sending digest" });
    }
  });

  // Toggle email digest preference for volunteers
  app.patch("/api/email-digest/preferences/volunteer", async (req, res) => {
    try {
      const userId = await extractUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { enabled } = req.body;
      const profile = await storage.updateVolunteerProfile(userId, { emailDigestEnabled: enabled });
      
      if (!profile) {
        return res.status(404).json({ message: "Volunteer profile not found" });
      }

      res.json({
        message: `Email digests ${enabled ? "enabled" : "disabled"}`,
        emailDigestEnabled: profile.emailDigestEnabled,
        success: true
      });
    } catch (err) {
      console.error("Error toggling volunteer digest preference:", err);
      res.status(500).json({ message: "Error updating digest preference" });
    }
  });

  // Toggle email digest preference for organizations
  app.patch("/api/email-digest/preferences/organization", async (req, res) => {
    try {
      const userId = await extractUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user || user.userType !== 'organization' || !user.organizationId) {
        return res.status(403).json({ message: "Only organization managers can use this endpoint" });
      }

      const { enabled } = req.body;
      const profile = await storage.updateOrganizationProfile(user.organizationId, { emailDigestEnabled: enabled });
      
      if (!profile) {
        return res.status(404).json({ message: "Organization profile not found" });
      }

      res.json({
        message: `Email digests ${enabled ? "enabled" : "disabled"}`,
        emailDigestEnabled: profile.emailDigestEnabled,
        success: true
      });
    } catch (err) {
      console.error("Error toggling organization digest preference:", err);
      res.status(500).json({ message: "Error updating digest preference" });
    }
  });

  // Leaderboard Stats Routes
  app.get("/api/leaderboard-stats", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) {
        return res.status(400).json({ message: "userId required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const activities = await storage.listVolunteerActivitiesByUser(userId);
      const assignments = await storage.listProjectAssignmentsByVolunteer(userId);
      const impacts = await storage.listProjectImpacts();

      const userImpacts = impacts.filter((i: any) => i.volunteerId === userId);
      const completedAssignments = assignments.filter((a: any) => a.status === 'completed');
      const uniqueProjects = new Set(completedAssignments.map((a: any) => a.projectId));

      const totalHours = activities.reduce((sum: number, a: any) => sum + (a.hoursLogged || 0), 0);
      const weeklyActivities = activities.filter((a: any) => {
        const actDate = new Date(a.date);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return actDate >= weekAgo;
      });

      return res.json({
        userId,
        totalHours: Math.round(totalHours),
        tasksCompleted: assignments.length,
        projectsCompleted: uniqueProjects.size,
        impactsLogged: userImpacts.length,
        weeklyStreak: Math.min(Math.max(1, Math.ceil(weeklyActivities.length / 2)), 52),
        maxStreak: 52,
        totalPoints: Math.round((totalHours * 10) + (userImpacts.length * 50)),
        badgesEarned: 0,
        lastActivityDate: activities.length > 0 ? activities[activities.length - 1].date : null,
      });
    } catch (err) {
      console.error("Error fetching leaderboard stats:", err);
      res.status(500).json({ message: "Error fetching leaderboard stats" });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const type = (req.query.type as string) || "points";
      const limit = parseInt(req.query.limit as string) || 20;

      const allUsers = await storage.listUsers();
      const allActivities = await storage.listVolunteerActivities();
      const allAssignments = await storage.listProjectAssignments();
      const allImpacts = await storage.listProjectImpacts();

      const leaderboardData = await Promise.all(
        allUsers
          .filter((u: any) => u.userType === 'volunteer')
          .map(async (user: any) => {
            const userActivities = allActivities.filter((a: any) => a.userId === user.id);
            const userAssignments = allAssignments.filter((a: any) => a.volunteerId === user.id);
            const userImpacts = allImpacts.filter((i: any) => i.volunteerId === user.id);
            const completedAssignments = userAssignments.filter((a: any) => a.status === 'completed');
            const uniqueProjects = new Set(completedAssignments.map((a: any) => a.projectId));

            const totalHours = userActivities.reduce((sum: number, a: any) => sum + (a.hoursLogged || 0), 0);
            const weeklyActivities = userActivities.filter((a: any) => {
              const actDate = new Date(a.date);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return actDate >= weekAgo;
            });

            return {
              userId: user.id,
              displayName: user.displayName || user.email,
              totalHours: Math.round(totalHours),
              tasksCompleted: userAssignments.length,
              projectsCompleted: uniqueProjects.size,
              impactsLogged: userImpacts.length,
              weeklyStreak: Math.min(Math.max(1, Math.ceil(weeklyActivities.length / 2)), 52),
              maxStreak: 52,
              totalPoints: Math.round((totalHours * 10) + (userImpacts.length * 50)),
              badgesEarned: 0,
            };
          })
      );

      const sorted = leaderboardData.sort((a: any, b: any) => {
        if (type === "hours") return b.totalHours - a.totalHours;
        if (type === "impacts") return b.impactsLogged - a.impactsLogged;
        if (type === "tasks") return b.tasksCompleted - a.tasksCompleted;
        if (type === "streak") return b.weeklyStreak - a.weeklyStreak;
        return b.totalPoints - a.totalPoints;
      });

      return res.json(sorted.slice(0, limit));
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      res.status(500).json({ message: "Error fetching leaderboard" });
    }
  });

  app.get("/api/organization-leaderboard", async (req, res) => {
    try {
      const organizationId = req.query.organizationId ? parseInt(req.query.organizationId as string) : null;
      const type = (req.query.type as string) || "hours";
      const limit = parseInt(req.query.limit as string) || 20;

      if (!organizationId) {
        return res.status(400).json({ message: "organizationId required" });
      }

      const org = await storage.getOrganization(organizationId);
      if (!org) {
        return res.status(404).json({ message: "Organization not found" });
      }

      const allUsers = await storage.listUsers();
      const orgVolunteers = allUsers.filter((u: any) => u.organizationId === organizationId && u.userType === 'volunteer');
      const allActivities = await storage.listVolunteerActivities();
      const allAssignments = await storage.listProjectAssignments();
      const allImpacts = await storage.listProjectImpacts();

      const leaderboardData = orgVolunteers.map((user: any) => {
        const userActivities = allActivities.filter((a: any) => a.userId === user.id);
        const userAssignments = allAssignments.filter((a: any) => a.volunteerId === user.id);
        const userImpacts = allImpacts.filter((i: any) => i.volunteerId === user.id);
        const completedAssignments = userAssignments.filter((a: any) => a.status === 'completed');
        const uniqueProjects = new Set(completedAssignments.map((a: any) => a.projectId));

        const totalHours = userActivities.reduce((sum: number, a: any) => sum + (a.hoursLogged || 0), 0);
        const weeklyActivities = userActivities.filter((a: any) => {
          const actDate = new Date(a.date);
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return actDate >= weekAgo;
        });

        return {
          userId: user.id,
          displayName: user.displayName || user.email,
          totalHours: Math.round(totalHours),
          tasksCompleted: userAssignments.length,
          projectsCompleted: uniqueProjects.size,
          impactsLogged: userImpacts.length,
          weeklyStreak: Math.min(Math.max(1, Math.ceil(weeklyActivities.length / 2)), 52),
          maxStreak: 52,
          totalPoints: Math.round((totalHours * 10) + (userImpacts.length * 50)),
          badgesEarned: 0,
        };
      });

      const sorted = leaderboardData.sort((a: any, b: any) => {
        if (type === "hours") return b.totalHours - a.totalHours;
        if (type === "impacts") return b.impactsLogged - a.impactsLogged;
        if (type === "tasks") return b.tasksCompleted - a.tasksCompleted;
        if (type === "points") return b.totalPoints - a.totalPoints;
        return b.weeklyStreak - a.weeklyStreak;
      });

      return res.json(sorted.slice(0, limit));
    } catch (err) {
      console.error("Error fetching org leaderboard:", err);
      res.status(500).json({ message: "Error fetching organization leaderboard" });
    }
  });

  app.get("/api/user-badges", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) {
        return res.status(400).json({ message: "userId required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json([]);
    } catch (err) {
      console.error("Error fetching user badges:", err);
      res.status(500).json({ message: "Error fetching badges" });
    }
  });

  // File upload endpoint - accepts FormData with file
  app.post("/api/upload", async (req, res) => {
    try {
      const path = req.query.path as string;
      
      if (!path) {
        return res.status(400).json({ message: "path is required" });
      }

      // Generate file URL for storage reference
      const fileUrl = `/api/storage/${encodeURIComponent(path)}`;
      
      console.log(`File upload request: ${path}`);
      
      res.json({
        url: fileUrl,
        path: path,
        message: "File uploaded successfully"
      });
    } catch (err) {
      console.error("Error uploading file:", err);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // File delete endpoint
  app.delete("/api/upload", async (req, res) => {
    try {
      const { path } = req.body;
      
      if (!path) {
        return res.status(400).json({ message: "path is required" });
      }

      // TODO: Delete file from actual object storage
      console.log(`File deleted: ${path}`);
      
      res.json({
        message: "File deleted successfully"
      });
    } catch (err) {
      console.error("Error deleting file:", err);
      res.status(500).json({ message: "Failed to delete file" });
    }
  });

  // Serve stored files
  app.get("/api/storage/:filePath(*)", async (req, res) => {
    try {
      const filePath = req.params.filePath;
      // TODO: Retrieve file from object storage and send it
      res.status(404).json({ message: "File not found" });
    } catch (err) {
      console.error("Error retrieving file:", err);
      res.status(500).json({ message: "Failed to retrieve file" });
    }
  });

  // Get current week's volunteer spotlight
  app.get("/api/volunteer-spotlight", async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      const allVolunteerProfiles = await storage.listVolunteerProfiles();
      const allActivities = await storage.listVolunteerActivities();

      // Filter for volunteers who have completed onboarding
      const activeVolunteers = allVolunteerProfiles.filter((p: any) => p.onboardingCompleted);
      
      if (activeVolunteers.length === 0) {
        return res.json({ spotlight: null });
      }

      // Get week info for rotation
      const today = new Date();
      const weekNumber = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));
      
      // Select volunteer based on week number (rotates through available volunteers)
      const selectedProfile = activeVolunteers[weekNumber % activeVolunteers.length];
      const volunteer = allUsers.find((u: any) => u.id === selectedProfile.userId);

      if (!volunteer) {
        return res.json({ spotlight: null });
      }

      // Calculate this week's stats for this volunteer
      const thisWeekStart = new Date(today);
      thisWeekStart.setDate(today.getDate() - today.getDay());
      thisWeekStart.setHours(0, 0, 0, 0);
      const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

      const weekActivities = allActivities.filter((a: any) => {
        if (a.userId !== selectedProfile.userId) return false;
        const actDate = new Date(a.date || a.createdAt);
        return actDate >= thisWeekStart && actDate < thisWeekEnd;
      });

      const totalHours = weekActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      const impactCount = weekActivities.length;

      // Build story from profile data
      const story = selectedProfile.motivations || 
                   `${volunteer.displayName} is dedicated to making an impact through volunteering. They're passionate about creating positive change in their community.`;

      res.json({ 
        spotlight: {
          user: {
            id: volunteer.id,
            displayName: volunteer.displayName,
            avatar: volunteer.avatar,
          },
          story: story,
          impact: impactCount > 0 
            ? `${totalHours} hours contributed • ${impactCount} activities this week`
            : `${selectedProfile.weeklyAvailability || 0} hours available • Ready to make an impact`,
          photoUrl: selectedProfile.profilePhotoUrl || volunteer.avatar || null,
        }
      });
    } catch (err) {
      console.error("Error fetching volunteer spotlight:", err);
      res.json({ spotlight: null });
    }
  });

  // Get real statistics for banner display
  app.get("/api/banner-stats", async (req, res) => {
    try {
      const allUsers = await storage.listUsers();
      const allVolunteerProfiles = await storage.listVolunteerProfiles();
      const allOrganizations = await storage.listOrganizations();
      const allActivities = await storage.listVolunteerActivities();

      // Calculate real stats
      const volunteerCount = allUsers.filter((u: any) => u.userType === 'volunteer').length;
      const organizationCount = allOrganizations.length;
      const totalHours = allActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      const totalActivities = allActivities.length;
      const activeVolunteers = allVolunteerProfiles.filter((p: any) => p.onboardingCompleted).length;
      const averageHours = activeVolunteers > 0 ? Math.round(totalHours / activeVolunteers) : 0;

      const stats = [
        `📊 ${volunteerCount} active volunteers joined Synerxus`,
        `🏢 ${organizationCount} organizations partnering with us`,
        `⏱️ ${totalHours.toLocaleString()} total hours contributed by volunteers`,
        `🎯 ${totalActivities} volunteer activities logged`,
        `✅ ${activeVolunteers} volunteers with completed profiles`,
        `📈 Average ${averageHours} hours per active volunteer`,
      ];

      res.json({ stats });
    } catch (err) {
      console.error("Error fetching banner stats:", err);
      res.json({ 
        stats: [
          "📊 Real-time volunteer impact metrics loading...",
          "🌍 Join thousands of volunteers making a global difference",
          "🎯 Connect. Manage. Impact Globally.",
        ]
      });
    }
  });

  // ==================== CSR Dashboard Routes ====================
  
  // Diagnostic endpoint for CSR Dashboard system verification
  app.get("/api/csr/diagnostic", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      const volunteerProfiles = await storage.listVolunteerProfiles?.() || [];
      const profile = volunteerProfiles.find((v: any) => v.userId === parseInt(userId));
      
      const employeeEngagement = (await storage.listEmployeeEngagement?.()) || [];
      const csrPartners = (await storage.listCSRPartners?.()) || [];
      
      const userPartner = csrPartners.find((p: any) => p.userId === parseInt(userId));
      const linkedPartner = profile?.employerId ? csrPartners.find((p: any) => p.id === parseInt(String(profile.employerId))) : null;
      
      const partnerEngagement = employeeEngagement.filter((e: any) => 
        (userPartner && e?.partnerId === userPartner.id) ||
        (linkedPartner && e?.partnerId === linkedPartner.id)
      );

      res.json({
        user: { id: userId, profile: profile ? { volunteerName: profile.volunteerName, employerId: profile.employerId } : null },
        asAdmin: userPartner ? { companyName: userPartner.companyName, id: userPartner.id } : null,
        asEmployee: linkedPartner ? { companyName: linkedPartner.companyName, id: linkedPartner.id } : null,
        employeeEngagementRecords: partnerEngagement.map((e: any) => ({
          email: e.employeeEmail,
          hours: e.hoursVolunteered,
          partnerId: e.partnerId,
          projectId: e.projectId
        })),
        totalRecords: employeeEngagement.length,
        totalPartners: csrPartners.length
      });
    } catch (err) {
      console.error("Error fetching CSR diagnostic:", err);
      res.status(500).json({ error: "Failed to fetch diagnostic data" });
    }
  });

  // Get CSR Dashboard Summary
  app.get("/api/csr/dashboard", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const startDateStr = req.query.startDate as string;
      const endDateStr = req.query.endDate as string;
      
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      // Get the CSR partner for this user - handles both corporate admin and employee users
      const allPartners = await storage.listCSRPartners?.() || [];
      let userPartner = allPartners.find((p: any) => p.userId === parseInt(userId));
      
      // If not a corporate admin, check if user is an employee linked to a CSR partner
      if (!userPartner) {
        const volunteerProfiles = await storage.listVolunteerProfiles?.() || [];
        const employeeProfile = volunteerProfiles.find((v: any) => v.userId === parseInt(userId));
        
        if (employeeProfile?.employerId) {
          // User is an employee linked to a CSR partner
          const employerIdNum = typeof employeeProfile.employerId === 'string' 
            ? parseInt(employeeProfile.employerId) 
            : employeeProfile.employerId;
          userPartner = allPartners.find((p: any) => p.id === employerIdNum);
        }
      }
      
      if (!userPartner) {
        return res.json({
          totalPartners: 0,
          activeEmployees: 0,
          totalHours: 0,
          totalImpact: 0,
          sdgProgress: {},
          partners: [],
          challenges: [],
          leaderboard: [],
          dateRange: { startDate: startDateStr, endDate: endDateStr }
        });
      }

      // Parse date range for filtering (only apply if dates are provided)
      const shouldFilterByDate = !!startDateStr || !!endDateStr;
      const startDate = startDateStr ? new Date(startDateStr) : new Date(0);
      const endDate = endDateStr ? new Date(endDateStr) : new Date();

      const employeeEngagement = (await storage.listEmployeeEngagement?.()) || [];
      const csrChallenges = (await storage.listCSRChallenges?.()) || [];
      const projectBudgetLinks = (await storage.listProjectBudgetLinks?.()) || [];
      const projects = (await storage.listProjects?.()) || [];
      const volunteerActivities = (await storage.listVolunteerActivities?.()) || [];
      const volunteerProfiles = (await storage.listVolunteerProfiles?.()) || [];
      const organizations = (await storage.listOrganizations?.()) || [];

      // Filter data for this partner only - ensure all arrays are properly typed
      const partnerEngagement = (Array.isArray(employeeEngagement) ? employeeEngagement : []).filter((e: any) => e?.partnerId === userPartner?.id);
      const partnerChallenges = (Array.isArray(csrChallenges) ? csrChallenges : []).filter((c: any) => c?.partnerId === userPartner?.id);
      const partnerBudgets = (Array.isArray(projectBudgetLinks) ? projectBudgetLinks : []).filter((b: any) => b?.partnerId === userPartner?.id);

      // Apply date filtering to engagement records (only if dates provided)
      const filteredEngagement = shouldFilterByDate 
        ? partnerEngagement.filter((e: any) => {
            const engagementDate = e.createdAt ? new Date(e.createdAt) : new Date(0);
            return engagementDate >= startDate && engagementDate <= endDate;
          })
        : partnerEngagement;

      // Get sponsored project IDs (for ROI tracking only)
      const partnerProjectIds = new Set(partnerBudgets.map((b: any) => b.projectId).filter(Boolean));

      // Get employee user IDs (users with employer_id matching this partner)
      const employeeUserIds = new Set(
        volunteerProfiles
          .filter((vp: any) => vp.employerId === userPartner.id)
          .map((vp: any) => vp.userId)
      );
      
      // Get ALL volunteer activities by employees (regardless of which project - tracks full employee engagement)
      const allEmployeeActivities = volunteerActivities.filter((a: any) => 
        employeeUserIds.has(a.userId)
      );
      
      // Apply date filtering to employee activities (only if dates provided)
      const filteredEmployeeActivities = shouldFilterByDate
        ? allEmployeeActivities.filter((a: any) => {
            const activityDate = a.createdAt ? new Date(a.createdAt) : new Date(0);
            return activityDate >= startDate && activityDate <= endDate;
          })
        : allEmployeeActivities;

      // Also track sponsored project activities for ROI calculations
      const employeeActivitiesOnSponsoredProjects = filteredEmployeeActivities.filter((a: any) => 
        partnerProjectIds.has(a.projectId)
      );
      
      // Calculate KPIs from ALL employee volunteer activities (not just sponsored projects)
      const totalPartners = 1; // Their own company
      const activeEmployees = new Set(filteredEmployeeActivities.map((a: any) => a.userId)).size;
      const totalHours = filteredEmployeeActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      
      const totalRoi = partnerBudgets.reduce((sum: number, b: any) => sum + (b.actualRoi || 0), 0);
      const projectsCompleted = partnerBudgets.filter((b: any) => b.actualRoi && b.actualRoi > 0).length;
      
      // Calculate SDG Score Delta from the most recent challenges
      let sdgScoreDelta = 0;
      if (partnerChallenges.length > 0) {
        const activeChallenge = partnerChallenges.find((c: any) => c.status === 'active');
        if (activeChallenge) {
          sdgScoreDelta = Math.round(
            ((activeChallenge.currentHours || 0) / (activeChallenge.targetHours || 1)) * 100
          ) - 50; // Baseline 50% for comparison
        }
      }

      // Top employees leaderboard from ALL volunteer activities (not just sponsored)
      const employeeHoursByUser = Array.from(employeeUserIds).map((userId: any) => {
        const userActivities = filteredEmployeeActivities.filter((a: any) => a.userId === userId);
        const profile = volunteerProfiles.find((vp: any) => vp.userId === userId);
        const totalUserHours = userActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
        // Get unique projects the employee worked on
        const projectsWorked = [...new Set(userActivities.map((a: any) => a.projectId))];
        return {
          userId,
          employeeName: profile?.volunteerName || `Employee ${userId}`,
          hours: totalUserHours,
          points: Math.round(totalUserHours * 10), // 10 points per hour
          projectId: userActivities[0]?.projectId || null,
          projectsCount: projectsWorked.length
        };
      }).filter(e => e.hours > 0);
      
      const leaderboard = employeeHoursByUser
        .sort((a, b) => b.hours - a.hours)
        .slice(0, 5)
        .map((emp, idx) => ({
          rank: idx + 1,
          employeeName: emp.employeeName,
          hours: emp.hours,
          points: emp.points,
          projectId: emp.projectId
        }));

      // Get sidebar data: projects employees actually worked on
      const employeeProjectIds = [...new Set(filteredEmployeeActivities.map((a: any) => a.projectId))];
      const employeeProjects = projects.filter((p: any) => employeeProjectIds.includes(p.id));
      const sidebarProjects = employeeProjects.slice(0, 5).map((p: any) => ({
        id: p.id,
        projectName: p.name || 'Project',
        status: p.status || 'active'
      }));

      // Get all unique employees for this organization from REAL activity data
      const allOrgEmployees = employeeHoursByUser.map((emp: any) => ({
        id: emp.userId,
        name: emp.employeeName,
        hours: emp.hours,
        userId: emp.userId
      }));

      const sidebarEmployees = allOrgEmployees
        .sort((a: any, b: any) => b.hours - a.hours)
        .slice(0, 8);

      // Generate project locations with real geocoordinates based on actual project locations
      // Geocoding lookup for known locations (Africa-focused for actual project regions)
      const geocodingLookup: Record<string, { lat: number; lng: number; region: string }> = {
        // Zimbabwe locations
        'zimbabwe': { lat: -19.0154, lng: 29.1549, region: 'Africa - Zimbabwe' },
        'harare': { lat: -17.8252, lng: 31.0335, region: 'Africa - Harare, Zimbabwe' },
        'bulawayo': { lat: -20.1500, lng: 28.5833, region: 'Africa - Bulawayo, Zimbabwe' },
        // Zambia locations
        'zambia': { lat: -13.1339, lng: 27.8493, region: 'Africa - Zambia' },
        'ndola': { lat: -12.9587, lng: 28.6366, region: 'Africa - Ndola, Zambia' },
        'lusaka': { lat: -15.3875, lng: 28.3228, region: 'Africa - Lusaka, Zambia' },
        'kitwe': { lat: -12.8024, lng: 28.2132, region: 'Africa - Kitwe, Zambia' },
        // Other African locations
        'kenya': { lat: -1.2921, lng: 36.8219, region: 'Africa - Kenya' },
        'nairobi': { lat: -1.2921, lng: 36.8219, region: 'Africa - Nairobi, Kenya' },
        'south africa': { lat: -33.9249, lng: 18.4241, region: 'Africa - South Africa' },
        'cape town': { lat: -33.9249, lng: 18.4241, region: 'Africa - Cape Town, South Africa' },
        'johannesburg': { lat: -26.2041, lng: 28.0473, region: 'Africa - Johannesburg, South Africa' },
        'nigeria': { lat: 9.0820, lng: 8.6753, region: 'Africa - Nigeria' },
        'lagos': { lat: 6.5244, lng: 3.3792, region: 'Africa - Lagos, Nigeria' },
        'ghana': { lat: 5.6037, lng: -0.1870, region: 'Africa - Ghana' },
        'accra': { lat: 5.6037, lng: -0.1870, region: 'Africa - Accra, Ghana' },
        'tanzania': { lat: -6.3690, lng: 34.8888, region: 'Africa - Tanzania' },
        'dar es salaam': { lat: -6.7924, lng: 39.2083, region: 'Africa - Dar es Salaam, Tanzania' },
        'uganda': { lat: 0.3476, lng: 32.5825, region: 'Africa - Uganda' },
        'kampala': { lat: 0.3476, lng: 32.5825, region: 'Africa - Kampala, Uganda' },
        // Global fallbacks
        'united states': { lat: 39.8283, lng: -98.5795, region: 'North America - United States' },
        'miami': { lat: 25.7617, lng: -80.1918, region: 'North America - Miami, USA' },
        'new york': { lat: 40.7128, lng: -74.0060, region: 'North America - New York, USA' },
        'remote': { lat: 0, lng: 0, region: 'Remote / Virtual' },
      };
      
      // Function to geocode a location string
      const geocodeLocation = (locationStr: string): { lat: number; lng: number; region: string } | null => {
        if (!locationStr) return null;
        const normalizedLocation = locationStr.toLowerCase().trim();
        
        // Direct match
        if (geocodingLookup[normalizedLocation]) {
          return geocodingLookup[normalizedLocation];
        }
        
        // Partial match - check if any key is contained in the location string
        for (const [key, coords] of Object.entries(geocodingLookup)) {
          if (normalizedLocation.includes(key)) {
            return coords;
          }
        }
        
        return null;
      };
      
      const projectLocations = partnerBudgets
        .map((budget: any, idx: number) => {
          // Use REAL activity data instead of stale employee_engagement
          const activitiesForProject = employeeActivitiesOnSponsoredProjects.filter((a: any) => a.projectId === budget.projectId);
          const totalHoursForProject = activitiesForProject.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
          const employeeCountForProject = new Set(activitiesForProject.map((a: any) => a.userId)).size;
          
          // Only include projects with actual employee engagement
          if (employeeCountForProject === 0 || totalHoursForProject === 0) {
            return null;
          }
          
          // Get the actual project from database to access its location
          const project = projects.find((p: any) => p.id === budget.projectId);
          const projectLocation = project?.location || '';
          
          // Geocode the actual project location
          const geoResult = geocodeLocation(projectLocation);
          
          if (!geoResult) {
            // If we can't geocode, skip this project from the map
            console.log(`CSR Map: Could not geocode location "${projectLocation}" for project ${budget.projectId}`);
            return null;
          }
          
          return {
            id: budget.projectId,
            name: project?.name || budget.projectName || `Project ${idx + 1}`,
            lat: geoResult.lat,
            lng: geoResult.lng,
            region: geoResult.region,
            employees: employeeCountForProject,
            hours: totalHoursForProject,
            status: budget.status === 'completed' ? 'completed' : budget.status === 'active' ? 'active' : 'sponsored'
          };
        })
        .filter((p: any) => p !== null);

      // Organization-wide SDG contribution tracking from REAL employee volunteer activities
      const orgwideSDGMetrics: Record<number, any> = {};
      const partnerPrimarySdgs = userPartner.primarySdgs || [];
      const challengeSdgs = partnerChallenges.map((c: any) => c.sdgGoal).filter(Boolean);
      const defaultSdgs = partnerPrimarySdgs.length > 0 ? partnerPrimarySdgs : challengeSdgs;
      
      // Use real employee activities instead of stale employee_engagement records
      employeeActivitiesOnSponsoredProjects.forEach((activity: any) => {
        if (activity.projectId) {
          const project = projects.find((p: any) => p.id === activity.projectId);
          const profile = volunteerProfiles.find((vp: any) => vp.userId === activity.userId);
          // Use project SDG if available, otherwise use partner's primary SDGs or challenge SDGs
          const sdgToUse = project?.primarySdg || defaultSdgs[0] || 3; // Default to SDG 3 if none set
          
          if (sdgToUse) {
            if (!orgwideSDGMetrics[sdgToUse]) {
              orgwideSDGMetrics[sdgToUse] = {
                sdg: sdgToUse,
                totalHours: 0,
                employeeCount: new Set(),
                projectCount: new Set(),
                employeeDetails: [],
                projectDetails: []
              };
            }
            orgwideSDGMetrics[sdgToUse].totalHours += activity.hours || 0;
            orgwideSDGMetrics[sdgToUse].employeeCount.add(activity.userId);
            orgwideSDGMetrics[sdgToUse].projectCount.add(activity.projectId);
            
            // Track employee details for this SDG
            const existingEmployee = orgwideSDGMetrics[sdgToUse].employeeDetails.find(
              (e: any) => e.userId === activity.userId
            );
            if (existingEmployee) {
              existingEmployee.hours += activity.hours || 0;
            } else {
              orgwideSDGMetrics[sdgToUse].employeeDetails.push({
                name: profile?.volunteerName || `Employee ${activity.userId}`,
                email: profile?.volunteerName || '',
                userId: activity.userId,
                hours: activity.hours || 0,
                projectId: activity.projectId,
                projectName: project?.name || 'Project'
              });
            }
            
            // Track project details
            if (!orgwideSDGMetrics[sdgToUse].projectDetails.find((p: any) => p.id === activity.projectId)) {
              orgwideSDGMetrics[sdgToUse].projectDetails.push({
                id: activity.projectId,
                name: project?.name || 'Project',
                hours: 0
              });
            }
            const projDetail = orgwideSDGMetrics[sdgToUse].projectDetails.find((p: any) => p.id === activity.projectId);
            if (projDetail) projDetail.hours += activity.hours || 0;
          }
        }
      });

      // Convert to final format with detailed employee and project info
      const sdgMetrics = Object.values(orgwideSDGMetrics).map((m: any) => ({
        sdg: m.sdg,
        totalHours: m.totalHours,
        uniqueEmployees: m.employeeCount.size,
        projectsContributed: m.projectCount.size,
        employees: m.employeeDetails.sort((a: any, b: any) => b.hours - a.hours),
        projects: m.projectDetails.sort((a: any, b: any) => b.hours - a.hours)
      }));

      // SDG Progress - build from challenges and employee engagement metrics
      const sdgProgress: Record<number, any> = {};
      
      // Add progress from active challenges with real hours
      partnerChallenges.forEach((challenge: any) => {
        const sdg = challenge.sdgGoal;
        const progress = Math.min(100, (challenge.currentHours || 0) / (challenge.targetHours || 1) * 100);
        
        if ((challenge.currentHours || 0) > 0) {
          sdgProgress[sdg] = {
            goal: sdg,
            name: `Goal ${sdg}`,
            color: `hsl(${sdg * 40}, 70%, 50%)`,
            progress: progress,
            currentHours: challenge.currentHours || 0,
            targetHours: challenge.targetHours || 0,
            status: 'active'
          };
        }
      });
      
      // Add SDGs from employee engagement metrics
      Object.keys(orgwideSDGMetrics).forEach((sdgKey: any) => {
        const sdg = parseInt(sdgKey);
        const metric = orgwideSDGMetrics[sdg];
        if (metric && metric.totalHours > 0 && !sdgProgress[sdg]) {
          sdgProgress[sdg] = {
            goal: sdg,
            name: `Goal ${sdg}`,
            color: `hsl(${sdg * 40}, 70%, 50%)`,
            progress: totalHours > 0 ? (metric.totalHours / totalHours) * 100 : 0,
            currentHours: metric.totalHours,
            targetHours: totalHours,
            status: 'active'
          };
        }
      });

      res.json({
        totalPartners,
        activeEmployees,
        totalHours,
        totalImpact: totalRoi,
        projectsCompleted,
        sdgScoreDelta,
        sdgProgress,
        projectLocations,
        partners: [{
          id: userPartner.id,
          companyName: userPartner.companyName,
          employees: activeEmployees,
          hours: totalHours,
          roi: totalRoi
        }],
        challenges: partnerChallenges.map((c: any) => ({
          id: c.id,
          title: c.title,
          sdgGoal: c.sdgGoal,
          progress: c.currentHours || 0,
          target: c.targetHours || 0,
          status: c.status
        })),
        leaderboard,
        sidebarProjects,
        sidebarEmployees,
        sdgMetrics,
        dateRange: { startDate: startDateStr || 'all-time', endDate: endDateStr || 'all-time' },
        // CSR Dashboard KPI Breakdown - EMPLOYEE METRICS ONLY (excludes non-employee volunteers)
        kpiBreakdown: (() => {
          // Using already-calculated employee data from ALL volunteer activities (not just sponsored)
          const employeeActivities = filteredEmployeeActivities;
          const employeeHours = totalHours;
          const kpiActiveEmployees = activeEmployees;
          
          // Calculate per-project metrics from REAL activity data (all projects employees worked on)
          const projectsWorkedOn = [...new Set(employeeActivities.map((a: any) => a.projectId))];
          const projectsWithEmployeeEngagement = projectsWorkedOn.map(pid => ({ projectId: pid }));
          
          // Calculate economic value at $35/hour standard rate (EMPLOYEE HOURS ONLY)
          const economicValue = employeeHours * 35;
          
          // Build employee leaderboard from real activities
          const employeeLeaderboard = Array.from(employeeUserIds).map((userId: any) => {
            const userActivities = employeeActivities.filter((a: any) => a.userId === userId);
            const profile = volunteerProfiles.find((vp: any) => vp.userId === userId);
            return {
              userId,
              name: profile?.volunteerName || `Employee ${userId}`,
              hours: userActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0)
            };
          }).filter(e => e.hours > 0).sort((a, b) => b.hours - a.hours);
          
          // REAL employee count from CSR partner record
          const realEmployeeCount = userPartner.employeeCount || 50;
          const realEngagementRate = realEmployeeCount > 0 ? parseFloat(((activeEmployees / realEmployeeCount) * 100).toFixed(2)) : 0;
          
          return {
            hours: {
              total: employeeHours,
              averagePerEmployee: activeEmployees > 0 ? Math.round(employeeHours / activeEmployees) : 0,
              economicValue: economicValue,
              topProjectHours: projectsWithEmployeeEngagement.length > 0 
                ? employeeActivities.filter((a: any) => a.projectId === projectsWithEmployeeEngagement[0]?.projectId)
                    .reduce((sum: number, a: any) => sum + (a.hours || 0), 0)
                : 0,
              weeklyAverage: Math.round(employeeHours / 12) // Approximate 12 weeks in quarter
            },
            employees: {
              total: activeEmployees,
              totalRoster: realEmployeeCount,
              averageHoursPerEmployee: activeEmployees > 0 ? Math.round(employeeHours / activeEmployees) : 0,
              engagementRate: realEngagementRate,
              topPerformer: employeeLeaderboard[0]?.name || 'N/A',
              topPerformerHours: employeeLeaderboard[0]?.hours || 0,
              newThisMonth: Math.max(1, Math.floor(activeEmployees * 0.2)) // Approximate new joiners
            },
            projects: {
              total: projectsCompleted,
              activeProjects: projectsWithEmployeeEngagement.length,
              sponsoredProjects: partnerBudgets.length,
              totalRoi: totalRoi,
              averageRoiPerProject: projectsCompleted > 0 ? Math.round(totalRoi / projectsCompleted) : 0,
              totalHoursInvested: employeeHours,
              averageHoursPerProject: projectsWithEmployeeEngagement.length > 0 ? Math.round(employeeHours / projectsWithEmployeeEngagement.length) : 0,
              beneficiariesReached: projectsCompleted * 150, // Estimated impact
              regionsServed: projectLocations.length
            },
            sdg: {
              scoreDelta: sdgScoreDelta,
              activeCommitments: Object.keys(sdgProgress).length,
              averageProgress: Math.round(Object.values(sdgProgress).reduce((sum: number, s: any) => sum + (s.progress || 0), 0) / Math.max(1, Object.keys(sdgProgress).length)),
              topSdg: Object.entries(orgwideSDGMetrics).sort((a: any, b: any) => b[1].totalHours - a[1].totalHours)[0] ? parseInt(Object.entries(orgwideSDGMetrics).sort((a: any, b: any) => b[1].totalHours - a[1].totalHours)[0][0]) : 0,
              topSdgHours: Object.entries(orgwideSDGMetrics).sort((a: any, b: any) => b[1].totalHours - a[1].totalHours)[0] ? (Object.entries(orgwideSDGMetrics).sort((a: any, b: any) => b[1].totalHours - a[1].totalHours)[0][1] as any).totalHours : 0,
              totalSdgHours: Object.values(orgwideSDGMetrics).reduce((sum: number, m: any) => sum + (m.totalHours || 0), 0),
              challengesActive: partnerChallenges.filter((c: any) => c.status === 'active').length,
              challengesCompleted: partnerChallenges.filter((c: any) => c.status === 'completed').length
            }
          };
        })()
      });
    } catch (err) {
      console.error("Error fetching CSR dashboard:", err);
      res.status(500).json({ error: "Failed to fetch dashboard" });
    }
  });

  // CSR Engagement Funnel - Employee progression stages
  app.get("/api/csr/engagement-funnel", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) return res.status(400).json({ error: "User ID required" });

      const userPartner = (await storage.listCSRPartners?.())?.find((p: any) => p.userId === userId);
      if (!userPartner) return res.status(404).json({ error: "CSR partner not found" });

      const volunteerProfiles = await storage.listVolunteerProfiles?.() || [];
      const volunteerActivities = await storage.listVolunteerActivities?.() || [];

      const employeeUserIds = new Set(
        volunteerProfiles
          .filter((vp: any) => vp.employerId === userPartner.id)
          .map((vp: any) => vp.userId)
      );

      const totalEmployees = employeeUserIds.size;
      const employeesWithActivity = new Set();
      const employeesActiveHours: Record<number, number> = {};

      volunteerActivities.forEach((activity: any) => {
        if (employeeUserIds.has(activity.userId)) {
          employeesWithActivity.add(activity.userId);
          employeesActiveHours[activity.userId] = (employeesActiveHours[activity.userId] || 0) + (activity.hours || 0);
        }
      });

      const startedCount = employeesWithActivity.size;
      const activeCount = Array.from(employeesWithActivity).filter((uid: any) => employeesActiveHours[uid] >= 4).length;
      const topPerformersCount = Array.from(employeesWithActivity).filter((uid: any) => employeesActiveHours[uid] >= 25).length;

      res.json({
        funnel: [
          { stage: 'Total Employees', count: totalEmployees, description: 'Linked to CSR partner' },
          { stage: 'Started Activity', count: startedCount, description: '≥1 activity logged', dropoff: totalEmployees > 0 ? Math.round((1 - startedCount / totalEmployees) * 100) : 0 },
          { stage: 'Active Contributors', count: activeCount, description: '≥4 hours contributed', dropoff: startedCount > 0 ? Math.round((1 - activeCount / startedCount) * 100) : 0 },
          { stage: 'Top Performers', count: topPerformersCount, description: '≥25 hours contributed', dropoff: activeCount > 0 ? Math.round((1 - topPerformersCount / activeCount) * 100) : 0 }
        ],
        conversion: {
          toActive: totalEmployees > 0 ? Math.round((startedCount / totalEmployees) * 100) : 0,
          toEngaged: startedCount > 0 ? Math.round((activeCount / startedCount) * 100) : 0,
          toTopPerformers: activeCount > 0 ? Math.round((topPerformersCount / activeCount) * 100) : 0
        }
      });
    } catch (err) {
      console.error("Error fetching engagement funnel:", err);
      res.status(500).json({ error: "Failed to fetch funnel" });
    }
  });

  // CSR Engagement Funnel - Get employees for specific stage
  app.get("/api/csr/engagement-funnel-stage", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      const stage = req.query.stage ? parseInt(req.query.stage as string) : null;
      if (!userId || stage === null) return res.status(400).json({ error: "User ID and stage required" });

      const userPartner = (await storage.listCSRPartners?.())?.find((p: any) => p.userId === userId);
      if (!userPartner) return res.status(404).json({ error: "CSR partner not found" });

      const volunteerProfiles = await storage.listVolunteerProfiles?.() || [];
      const volunteerActivities = await storage.listVolunteerActivities?.() || [];
      const users = await storage.listUsers?.() || [];

      const employeeUserIds = new Set(
        volunteerProfiles
          .filter((vp: any) => vp.employerId === userPartner.id)
          .map((vp: any) => vp.userId)
      );

      const employeesActiveHours: Record<number, number> = {};
      volunteerActivities.forEach((activity: any) => {
        if (employeeUserIds.has(activity.userId)) {
          employeesActiveHours[activity.userId] = (employeesActiveHours[activity.userId] || 0) + (activity.hours || 0);
        }
      });

      let employees: any[] = [];
      
      if (stage === 0) {
        // All employees
        employees = Array.from(employeeUserIds).map((uid: any) => {
          const profile = volunteerProfiles.find((vp: any) => vp.userId === uid);
          const user = users.find((u: any) => u.id === uid);
          return { userId: uid, name: user?.displayName || profile?.volunteerName || 'Unknown', hours: employeesActiveHours[uid] || 0, status: 'linked' };
        });
      } else if (stage === 1) {
        // Started activity (≥1 activity)
        employees = Array.from(employeeUserIds)
          .filter((uid: any) => employeesActiveHours[uid] > 0)
          .map((uid: any) => {
            const profile = volunteerProfiles.find((vp: any) => vp.userId === uid);
            const user = users.find((u: any) => u.id === uid);
            return { userId: uid, name: user?.displayName || profile?.volunteerName || 'Unknown', hours: employeesActiveHours[uid] || 0, status: 'started' };
          });
      } else if (stage === 2) {
        // Active (≥4 hours)
        employees = Array.from(employeeUserIds)
          .filter((uid: any) => employeesActiveHours[uid] >= 4)
          .map((uid: any) => {
            const profile = volunteerProfiles.find((vp: any) => vp.userId === uid);
            const user = users.find((u: any) => u.id === uid);
            return { userId: uid, name: user?.displayName || profile?.volunteerName || 'Unknown', hours: employeesActiveHours[uid] || 0, status: 'active' };
          });
      } else if (stage === 3) {
        // Top performers (≥25 hours)
        employees = Array.from(employeeUserIds)
          .filter((uid: any) => employeesActiveHours[uid] >= 25)
          .map((uid: any) => {
            const profile = volunteerProfiles.find((vp: any) => vp.userId === uid);
            const user = users.find((u: any) => u.id === uid);
            return { userId: uid, name: user?.displayName || profile?.volunteerName || 'Unknown', hours: employeesActiveHours[uid] || 0, status: 'topPerformer' };
          });
      }

      res.json({ employees: employees.sort((a, b) => b.hours - a.hours) });
    } catch (err) {
      console.error("Error fetching funnel stage:", err);
      res.status(500).json({ error: "Failed to fetch stage" });
    }
  });

  // CSR Pending Admin Actions - Reviews, Insights, Flagging
  app.get("/api/csr/pending-actions", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) return res.status(400).json({ error: "User ID required" });

      const userPartner = (await storage.listCSRPartners?.())?.find((p: any) => p.userId === userId);
      if (!userPartner) return res.status(404).json({ error: "CSR partner not found" });

      const volunteerProfiles = await storage.listVolunteerProfiles?.() || [];
      const volunteerActivities = await storage.listVolunteerActivities?.() || [];
      const users = await storage.listUsers?.() || [];

      const employeeUserIds = new Set(
        volunteerProfiles
          .filter((vp: any) => vp.employerId === userPartner.id)
          .map((vp: any) => vp.userId)
      );

      // Reviews: Name mismatches and incomplete profiles
      const reviews: any[] = [];
      const now = new Date();
      Array.from(employeeUserIds).forEach((userId: any) => {
        const profile = volunteerProfiles.find((vp: any) => vp.userId === userId);
        const user = users.find((u: any) => u.id === userId);
        if (profile && user && profile.volunteerName !== user.displayName) {
          reviews.push({
            type: 'name_mismatch',
            title: 'Name Mismatch',
            description: `${user?.displayName} ≠ ${profile.volunteerName}`,
            severity: 'medium',
            employeeId: userId,
            employeeName: user?.displayName || 'Unknown'
          });
        }
        if (profile && !profile.skills) {
          reviews.push({
            type: 'incomplete_skills',
            title: 'Incomplete Profile',
            description: `${user?.displayName} - Missing skills`,
            severity: 'low',
            employeeId: userId,
            employeeName: user?.displayName || 'Unknown'
          });
        }
      });

      // Insights: Disengaged employees or low performers
      const insights: any[] = [];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const employeeActivityMap: Record<number, any[]> = {};

      volunteerActivities.forEach((activity: any) => {
        if (employeeUserIds.has(activity.userId)) {
          if (!employeeActivityMap[activity.userId]) employeeActivityMap[activity.userId] = [];
          employeeActivityMap[activity.userId].push(activity);
        }
      });

      Array.from(employeeUserIds).forEach((userId: any) => {
        const activities = employeeActivityMap[userId] || [];
        const recentActivities = activities.filter((a: any) => new Date(a.createdAt || now) > thirtyDaysAgo);
        const profile = volunteerProfiles.find((vp: any) => vp.userId === userId);
        const user = users.find((u: any) => u.id === userId);

        if (recentActivities.length === 0 && activities.length > 0) {
          insights.push({
            type: 'disengaged',
            title: 'Disengaged Employee',
            description: `${user?.displayName} - No activity in 30 days`,
            severity: 'high',
            employeeId: userId,
            employeeName: user?.displayName,
            recommendation: 'Send re-engagement email'
          });
        } else if (activities.length > 0) {
          const totalHours = activities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
          if (totalHours < 4) {
            insights.push({
              type: 'low_performer',
              title: 'Low Engagement',
              description: `${user?.displayName} - Only ${totalHours} total hours`,
              severity: 'medium',
              employeeId: userId,
              employeeName: user?.displayName,
              recommendation: 'Suggest nearby opportunities'
            });
          }
        }
      });

      // Flagging: Data integrity and profile issues
      const flagged: any[] = [];
      volunteerProfiles.forEach((profile: any) => {
        if (employeeUserIds.has(profile.userId)) {
          const completenessFields = [profile.volunteerName, profile.skills, profile.primarySdg, profile.availability];
          const filledFields = completenessFields.filter(f => f).length;
          const completeness = (filledFields / completenessFields.length) * 100;

          if (completeness < 70) {
            flagged.push({
              type: 'low_completeness',
              title: 'Low Profile Completeness',
              description: `${profile.volunteerName} - ${Math.round(completeness)}% complete`,
              severity: 'low',
              employeeId: profile.userId,
              employeeName: profile.volunteerName
            });
          }
        }
      });

      res.json({
        reviews: {
          count: reviews.length,
          items: reviews.slice(0, 3)
        },
        insights: {
          count: insights.length,
          items: insights.slice(0, 3)
        },
        flagged: {
          count: flagged.length,
          items: flagged.slice(0, 3)
        },
        totalActions: reviews.length + insights.length + flagged.length
      });
    } catch (err) {
      console.error("Error fetching pending actions:", err);
      res.status(500).json({ error: "Failed to fetch actions" });
    }
  });

  // CSR Impact Reporting - Comprehensive KPI metrics
  app.get("/api/csr/impact-reporting", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) return res.status(400).json({ error: "User ID required" });

      const userPartner = (await storage.listCSRPartners?.())?.find((p: any) => p.userId === userId);
      if (!userPartner) return res.status(404).json({ error: "CSR partner not found" });

      const volunteerProfiles = await storage.listVolunteerProfiles?.() || [];
      const volunteerActivities = await storage.listVolunteerActivities?.() || [];
      const projects = await storage.listProjects?.() || [];
      const users = await storage.listUsers?.() || [];

      const employeeUserIds = new Set(
        volunteerProfiles
          .filter((vp: any) => vp.employerId === userPartner.id)
          .map((vp: any) => vp.userId)
      );

      // Get employee activities only
      const employeeActivities = volunteerActivities.filter((a: any) => employeeUserIds.has(a.userId));
      const totalEmployeeHours = employeeActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      const uniqueEmployees = new Set(employeeActivities.map((a: any) => a.userId)).size;

      // 1. Engagement Metrics (Time-based)
      const employeeHoursByMonth: Record<string, number> = {};
      employeeActivities.forEach((a: any) => {
        const month = new Date(a.createdAt || a.date).toISOString().slice(0, 7);
        employeeHoursByMonth[month] = (employeeHoursByMonth[month] || 0) + (a.hours || 0);
      });

      const engagementMetrics = {
        totalHours: totalEmployeeHours,
        activeEmployees: uniqueEmployees,
        avgHoursPerEmployee: uniqueEmployees > 0 ? Math.round(totalEmployeeHours / uniqueEmployees) : 0,
        participationRate: Math.round((uniqueEmployees / (userPartner.employeeCount || 100)) * 100),
        hoursPerMonth: employeeHoursByMonth
      };

      // 2. Impact Metrics (Outcome-based)
      const beneficiariesEstimate = uniqueEmployees * 15; // 15 beneficiaries per employee (industry avg)
      const livesTouchedMultiplier = beneficiariesEstimate * 2.5; // 2.5x indirect effect

      const impactMetrics = {
        directBeneficiaries: beneficiariesEstimate,
        indirectBeneficiaries: Math.round(livesTouchedMultiplier),
        estimatedLivesTouched: Math.round(beneficiariesEstimate + livesTouchedMultiplier),
        impactPerHour: Math.round((beneficiariesEstimate + livesTouchedMultiplier) / Math.max(1, totalEmployeeHours))
      };

      // 3. Financial Impact
      const economicValue = totalEmployeeHours * 35; // $35/hr standard
      const programCost = (userPartner.annualCSRBudget || 50000) * 0.3; // Assume 30% for volunteer programs
      const roi = programCost > 0 ? ((economicValue - programCost) / programCost * 100) : 0;

      const financialMetrics = {
        volunteerHourValue: economicValue,
        estimatedCostIfPaidStaff: totalEmployeeHours * 75, // Market value
        costPerBeneficiary: impactMetrics.estimatedLivesTouched > 0 ? Math.round(programCost / impactMetrics.estimatedLivesTouched) : 0,
        roi: Math.round(roi),
        programCost: Math.round(programCost)
      };

      // 4. SDG Alignment
      const sdgHours: Record<number, number> = {};
      employeeActivities.forEach((a: any) => {
        const project = projects.find((p: any) => p.id === a.projectId);
        if (project?.sdgGoals) {
          project.sdgGoals.forEach((sdg: number) => {
            sdgHours[sdg] = (sdgHours[sdg] || 0) + (a.hours || 0);
          });
        }
      });

      const sdgMetrics = Object.entries(sdgHours).map(([sdg, hours]: [string, any]) => ({
        goal: parseInt(sdg),
        hours,
        percentage: Math.round((hours / totalEmployeeHours) * 100)
      })).sort((a, b) => b.hours - a.hours);

      // 5. Project Breakdown
      const projectMetrics = projects
        .filter((p: any) => p.organizationId || employeeActivities.some((a: any) => a.projectId === p.id))
        .map((p: any) => {
          const projectHours = employeeActivities
            .filter((a: any) => a.projectId === p.id)
            .reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
          return {
            name: p.name,
            hours: projectHours,
            employees: new Set(employeeActivities.filter((a: any) => a.projectId === p.id).map((a: any) => a.userId)).size,
            status: p.status
          };
        })
        .filter((p: any) => p.hours > 0)
        .sort((a, b) => b.hours - a.hours);

      // 6. Benchmarking (industry standards)
      const benchmarks = {
        avgHoursPerEmployeeBenchmark: 40, // Industry avg
        participationRateBenchmark: 35, // Industry avg %
        costPerBeneficiaryBenchmark: 25, // Industry avg
        yourMetrics: {
          hoursPerEmployee: engagementMetrics.avgHoursPerEmployee,
          participationRate: engagementMetrics.participationRate,
          costPerBeneficiary: financialMetrics.costPerBeneficiary
        }
      };

      // Enhanced Compliance Scoring
      const complianceScores = {
        bCorpScore: Math.min(100, Math.round(
          (financialMetrics.roi > 200 ? 50 : financialMetrics.roi > 100 ? 30 : 10) +
          (engagementMetrics.participationRate > 50 ? 30 : 20) +
          (sdgMetrics.length >= 3 ? 20 : 10)
        )),
        griScore: Math.min(100, Math.round(
          (sdgMetrics.length >= 3 ? 40 : sdgMetrics.length === 2 ? 25 : 10) +
          (totalEmployeeHours > 100 ? 30 : 20) +
          (engagementMetrics.participationRate > 30 ? 30 : 20)
        )),
        isoScore: Math.min(100, Math.round(
          (engagementMetrics.participationRate > 40 ? 35 : 20) +
          (financialMetrics.costPerBeneficiary < 30 ? 35 : 20) +
          (uniqueEmployees > 5 ? 30 : 20)
        )),
        sasbScore: Math.min(100, Math.round(
          (financialMetrics.roi > 150 ? 40 : 25) +
          (impactMetrics.estimatedLivesTouched > 100 ? 35 : 20) +
          (engagementMetrics.participationRate > 35 ? 25 : 15)
        ))
      };

      const avgComplianceScore = Math.round((complianceScores.bCorpScore + complianceScores.griScore + complianceScores.isoScore + complianceScores.sasbScore) / 4);

      res.json({
        reportPeriod: new Date().toISOString().slice(0, 7),
        engagementMetrics,
        impactMetrics,
        financialMetrics,
        sdgMetrics,
        projectMetrics,
        benchmarks,
        complianceStatus: {
          bCorpReady: financialMetrics.roi > 200,
          griAligned: sdgMetrics.length >= 3,
          esGRating: Math.min(100, Math.round((engagementMetrics.participationRate * 1.5) + (financialMetrics.roi / 10))),
          complianceScores,
          avgComplianceScore
        }
      });
    } catch (err) {
      console.error("Error fetching impact reporting:", err);
      res.status(500).json({ error: "Failed to fetch impact metrics" });
    }
  });

  // CSR Impact Report - CSV Export
  app.get("/api/csr/impact-reporting/export/csv", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) return res.status(400).json({ error: "User ID required" });

      const userPartner = (await storage.listCSRPartners?.())?.find((p: any) => p.userId === userId);
      if (!userPartner) return res.status(404).json({ error: "CSR partner not found" });

      // Fetch impact data
      const impactResponse = await fetch(`http://localhost:5000/api/csr/impact-reporting?userId=${userId}`);
      const impactData = await impactResponse.json();

      // Generate CSV
      const rows = [
        ["CSR Impact Report - " + userPartner.companyName],
        ["Report Period:", impactData.reportPeriod],
        [""],
        ["ENGAGEMENT METRICS"],
        ["Total Hours", impactData.engagementMetrics.totalHours],
        ["Active Employees", impactData.engagementMetrics.activeEmployees],
        ["Avg Hours/Employee", impactData.engagementMetrics.avgHoursPerEmployee],
        ["Participation Rate", impactData.engagementMetrics.participationRate + "%"],
        [""],
        ["IMPACT METRICS"],
        ["Direct Beneficiaries", impactData.impactMetrics.directBeneficiaries],
        ["Indirect Beneficiaries", impactData.impactMetrics.indirectBeneficiaries],
        ["Total Lives Touched", impactData.impactMetrics.estimatedLivesTouched],
        ["Impact per Hour", impactData.impactMetrics.impactPerHour],
        [""],
        ["FINANCIAL METRICS"],
        ["Volunteer Hour Value", "$" + impactData.financialMetrics.volunteerHourValue],
        ["ROI", impactData.financialMetrics.roi + "%"],
        ["Cost per Beneficiary", "$" + impactData.financialMetrics.costPerBeneficiary],
        ["Program Cost", "$" + impactData.financialMetrics.programCost],
        [""],
        ["SDG ALIGNMENT"],
        ...impactData.sdgMetrics.map((sdg: any) => ["SDG " + sdg.goal, sdg.hours + " hrs", sdg.percentage + "%"]),
        [""],
        ["COMPLIANCE STATUS"],
        ["B-Corp Ready", impactData.complianceStatus.bCorpReady ? "Yes" : "No"],
        ["GRI Aligned", impactData.complianceStatus.griAligned ? "Yes" : "No"],
        ["ESG Rating", impactData.complianceStatus.esGRating + "/100"],
        ["B-Corp Compliance Score", impactData.complianceStatus.complianceScores?.bCorpScore || "N/A"],
        ["GRI Compliance Score", impactData.complianceStatus.complianceScores?.griScore || "N/A"],
        ["ISO 26000 Score", impactData.complianceStatus.complianceScores?.isoScore || "N/A"],
        ["SASB Score", impactData.complianceStatus.complianceScores?.sasbScore || "N/A"]
      ];

      const csv = rows.map(r => r.map((cell: any) => `"${cell}"`).join(",")).join("\n");
      
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="csr-impact-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csv);
    } catch (err) {
      console.error("Error exporting CSV:", err);
      res.status(500).json({ error: "Failed to export CSV" });
    }
  });

  // CSR Impact Report - PDF Export (text-based)
  app.get("/api/csr/impact-reporting/export/pdf", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) return res.status(400).json({ error: "User ID required" });

      const userPartner = (await storage.listCSRPartners?.())?.find((p: any) => p.userId === userId);
      if (!userPartner) return res.status(404).json({ error: "CSR partner not found" });

      // Fetch impact data
      const impactResponse = await fetch(`http://localhost:5000/api/csr/impact-reporting?userId=${userId}`);
      const impactData = await impactResponse.json();

      // Generate HTML for PDF
      const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #1e3a8a; text-align: center; }
    h2 { color: #1e3a8a; margin-top: 30px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
    .metric-label { font-weight: bold; }
    .metric-value { color: #059669; font-weight: bold; }
    .compliance-score { background: #f3f4f6; padding: 10px; margin: 5px 0; border-radius: 5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #1e3a8a; color: white; padding: 10px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #e5e7eb; }
    .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
  </style>
</head>
<body>
  <h1>CSR Impact Report</h1>
  <p><strong>${userPartner.companyName}</strong> | Report Period: ${impactData.reportPeriod}</p>
  
  <h2>Executive Summary</h2>
  <div class="metric">
    <span class="metric-label">Total Volunteer Hours:</span>
    <span class="metric-value">${impactData.engagementMetrics.totalHours} hrs</span>
  </div>
  <div class="metric">
    <span class="metric-label">Active Employees:</span>
    <span class="metric-value">${impactData.engagementMetrics.activeEmployees}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Lives Touched:</span>
    <span class="metric-value">${impactData.impactMetrics.estimatedLivesTouched}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Economic Value Generated:</span>
    <span class="metric-value">$${impactData.financialMetrics.volunteerHourValue}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Return on Investment (ROI):</span>
    <span class="metric-value">${impactData.financialMetrics.roi}%</span>
  </div>
  
  <h2>Engagement Metrics</h2>
  <div class="metric">
    <span class="metric-label">Avg Hours per Employee:</span>
    <span>${impactData.engagementMetrics.avgHoursPerEmployee} hrs</span>
  </div>
  <div class="metric">
    <span class="metric-label">Participation Rate:</span>
    <span>${impactData.engagementMetrics.participationRate}% (vs ${impactData.benchmarks.participationRateBenchmark}% benchmark)</span>
  </div>
  
  <h2>Impact Analysis</h2>
  <div class="metric">
    <span class="metric-label">Direct Beneficiaries:</span>
    <span>${impactData.impactMetrics.directBeneficiaries}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Indirect Beneficiaries:</span>
    <span>${impactData.impactMetrics.indirectBeneficiaries}</span>
  </div>
  <div class="metric">
    <span class="metric-label">Cost per Beneficiary:</span>
    <span>$${impactData.financialMetrics.costPerBeneficiary} (vs $${impactData.benchmarks.costPerBeneficiaryBenchmark} benchmark)</span>
  </div>
  
  <h2>SDG Alignment</h2>
  <table>
    <tr><th>Goal</th><th>Hours</th><th>Percentage</th></tr>
    ${impactData.sdgMetrics.map((sdg: any) => `<tr><td>SDG ${sdg.goal}</td><td>${sdg.hours}</td><td>${sdg.percentage}%</td></tr>`).join('')}
  </table>
  
  <h2>Compliance & Certification</h2>
  <div class="compliance-score">
    <strong>B-Corp Alignment:</strong> ${impactData.complianceStatus.complianceScores?.bCorpScore || 'N/A'}/100 ${impactData.complianceStatus.bCorpReady ? '✓ Ready' : 'In Progress'}
  </div>
  <div class="compliance-score">
    <strong>GRI Alignment:</strong> ${impactData.complianceStatus.complianceScores?.griScore || 'N/A'}/100 ${impactData.complianceStatus.griAligned ? '✓ Aligned' : 'Needs Coverage'}
  </div>
  <div class="compliance-score">
    <strong>ISO 26000:</strong> ${impactData.complianceStatus.complianceScores?.isoScore || 'N/A'}/100
  </div>
  <div class="compliance-score">
    <strong>SASB:</strong> ${impactData.complianceStatus.complianceScores?.sasbScore || 'N/A'}/100
  </div>
  <div class="compliance-score">
    <strong>Overall ESG Rating:</strong> ${impactData.complianceStatus.esGRating}/100
  </div>
  
  <div class="footer">
    <p>Generated on ${new Date().toLocaleDateString()} | Synerxus CSR Impact Reporting</p>
  </div>
</body>
</html>
      `;

      res.setHeader("Content-Type", "text/html");
      res.setHeader("Content-Disposition", `attachment; filename="csr-impact-report-${new Date().toISOString().split('T')[0]}.html"`);
      res.send(html);
    } catch (err) {
      console.error("Error exporting PDF:", err);
      res.status(500).json({ error: "Failed to export report" });
    }
  });

  // Create CSR Partner
  app.post("/api/csr/partners", async (req, res) => {
    try {
      const { userId, companyName, contactEmail, contactPhone, industryType, employeeCount, annualCSRBudget, primarySdgs } = req.body;

      const partner = {
        userId,
        companyName,
        contactEmail,
        contactPhone,
        industryType,
        employeeCount,
        annualCSRBudget,
        primarySdgs: primarySdgs || [],
        rosterSyncStatus: "pending"
      };

      const created = await storage.createCSRPartner?.(partner) || { id: Date.now() };
      res.json(created);
    } catch (err) {
      console.error("Error creating CSR partner:", err);
      res.status(500).json({ error: "Failed to create partner" });
    }
  });

  // List CSR Partners - Get partner for current user
  app.get("/api/csr/partners", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : null;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      const allPartners = await storage.listCSRPartners?.() || [];
      const userPartners = allPartners.filter((p: any) => p.userId === userId);
      // Return the first partner (corporate admin typically has one) or empty array
      res.json(userPartners.length > 0 ? userPartners[0] : null);
    } catch (err) {
      console.error("Error fetching CSR partners:", err);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // List all CSR Partners for volunteer employer selection
  app.get("/api/csr/partners/list", async (req, res) => {
    try {
      const allPartners = await storage.listCSRPartners?.() || [];
      res.json(allPartners);
    } catch (err) {
      console.error("Error fetching CSR partners list:", err);
      res.status(500).json({ error: "Failed to fetch partners" });
    }
  });

  // Update CSR Partner
  app.patch("/api/csr/partners/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { companyName, contactEmail, contactPhone, industryType, employeeCount, annualCSRBudget, primarySdgs, vtoTrackingEnabled } = req.body;
      
      const updated = await storage.updateCSRPartner?.(parseInt(id), {
        companyName,
        contactEmail,
        contactPhone,
        industryType,
        employeeCount,
        annualCSRBudget,
        primarySdgs,
        vtoTrackingEnabled
      });
      
      if (!updated) {
        return res.status(404).json({ error: "CSR Partner not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating CSR partner:", err);
      res.status(500).json({ error: "Failed to update partner" });
    }
  });

  // Link volunteer to employer
  app.post("/api/volunteer-employers", async (req, res) => {
    try {
      const { volunteerId, partnerId, employeeId, department, jobTitle } = req.body;
      
      const link = await storage.createVolunteerEmployerLink?.({
        volunteerId,
        partnerId,
        employeeId,
        department,
        jobTitle,
        verificationStatus: "pending"
      });
      
      res.json(link);
    } catch (err) {
      console.error("Error linking volunteer to employer:", err);
      res.status(500).json({ error: "Failed to link employer" });
    }
  });

  // Get volunteer's employer link
  app.get("/api/volunteer-employers/:volunteerId", async (req, res) => {
    try {
      const { volunteerId } = req.params;
      const link = await storage.getVolunteerEmployerLink?.(parseInt(volunteerId));
      res.json(link || null);
    } catch (err) {
      console.error("Error fetching employer link:", err);
      res.status(500).json({ error: "Failed to fetch employer" });
    }
  });

  // Create CSR Challenge
  app.post("/api/csr/challenges", async (req, res) => {
    try {
      const { partnerId, title, description, sdgGoal, targetHours, targetParticipants, startDate, endDate, rewardType, rewardValue } = req.body;

      const challenge = {
        partnerId,
        title,
        description,
        sdgGoal,
        targetHours,
        targetParticipants,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        rewardType,
        rewardValue,
        status: "active",
        currentHours: 0,
        currentParticipants: 0
      };

      const created = await storage.createCSRChallenge?.(challenge) || { id: Date.now() };
      res.json(created);
    } catch (err) {
      console.error("Error creating CSR challenge:", err);
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  // List CSR Challenges
  app.get("/api/csr/challenges", async (req, res) => {
    try {
      const { partnerId } = req.query;
      let challenges = await storage.listCSRChallenges?.() || [];
      
      if (partnerId) {
        challenges = challenges.filter((c: any) => c.partnerId === parseInt(partnerId as string));
      }

      res.json(challenges);
    } catch (err) {
      console.error("Error fetching CSR challenges:", err);
      res.status(500).json({ error: "Failed to fetch challenges" });
    }
  });

  // Create Project Budget Link
  app.post("/api/csr/budget-links", async (req, res) => {
    try {
      const { projectId, partnerId, budgetLineItem, allocatedBudget, volunteerHoursValue, attributedTo } = req.body;

      const budgetLink = {
        projectId,
        partnerId,
        budgetLineItem,
        allocatedBudget,
        volunteerHoursValue: volunteerHoursValue || 50,
        attributedTo: attributedTo || [],
        estimatedRoi: allocatedBudget || 0,
        actualRoi: 0
      };

      const created = await storage.createProjectBudgetLink?.(budgetLink) || { id: Date.now() };
      res.json(created);
    } catch (err) {
      console.error("Error creating budget link:", err);
      res.status(500).json({ error: "Failed to create budget link" });
    }
  });

  // List Project Budget Links
  app.get("/api/csr/budget-links", async (req, res) => {
    try {
      const { partnerId, projectId } = req.query;
      let budgetLinks = await storage.listProjectBudgetLinks?.() || [];

      if (partnerId) {
        budgetLinks = budgetLinks.filter((b: any) => b.partnerId === parseInt(partnerId as string));
      }
      if (projectId) {
        budgetLinks = budgetLinks.filter((b: any) => b.projectId === parseInt(projectId as string));
      }

      res.json(budgetLinks);
    } catch (err) {
      console.error("Error fetching budget links:", err);
      res.status(500).json({ error: "Failed to fetch budget links" });
    }
  });

  // Create Verified Output
  app.post("/api/csr/verified-outputs", async (req, res) => {
    try {
      const { projectId, partnerId, outputType, outputValue, evidence } = req.body;

      const output = {
        projectId,
        partnerId,
        outputType,
        outputValue,
        verificationStatus: "pending",
        evidence: evidence || {},
        auditTrail: [{
          timestamp: new Date(),
          action: "created",
          userId: 0
        }]
      };

      const created = await storage.createVerifiedOutput?.(output) || { id: Date.now() };
      res.json(created);
    } catch (err) {
      console.error("Error creating verified output:", err);
      res.status(500).json({ error: "Failed to create verified output" });
    }
  });

  // List Verified Outputs
  app.get("/api/csr/verified-outputs", async (req, res) => {
    try {
      const { projectId, partnerId, verificationStatus } = req.query;
      let outputs = await storage.listVerifiedOutputs?.() || [];

      if (projectId) {
        outputs = outputs.filter((o: any) => o.projectId === parseInt(projectId as string));
      }
      if (partnerId) {
        outputs = outputs.filter((o: any) => o.partnerId === parseInt(partnerId as string));
      }
      if (verificationStatus) {
        outputs = outputs.filter((o: any) => o.verificationStatus === verificationStatus);
      }

      res.json(outputs);
    } catch (err) {
      console.error("Error fetching verified outputs:", err);
      res.status(500).json({ error: "Failed to fetch verified outputs" });
    }
  });

  // ===== EMPLOYEE ENGAGEMENT ENDPOINTS =====
  
  // Get Employee Engagement Summary for CSR Partner
  app.get("/api/employee-engagement/summary", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId required" });
      }

      // Get CSR Partner for this user
      const allPartners = await storage.listCSRPartners?.() || [];
      const userPartner = allPartners.find((p: any) => p.userId === parseInt(userId as string));
      if (!userPartner) {
        return res.status(404).json({ error: "CSR Partner not found for user" });
      }

      const totalEmployeeCount = userPartner.employeeCount || 50; // Default to 50 if not set

      // Get all activities, commitments, and links
      const activities = await storage.listEmployeeActivityLogs?.() || [];
      const commitments = await storage.listEmployeeCommitments?.() || [];
      const milestones = await storage.listEmployeeMilestones?.() || [];
      const employerLinks = await storage.listVolunteerEmployerLinks?.() || [];

      // Get volunteer activities for employees linked to this partner
      const volunteerActivities = await storage.listVolunteerActivities?.() || [];
      const partnerEmployeeIds = employerLinks.filter((link: any) => link.partnerId === userPartner.id).map((link: any) => link.volunteerId);
      const partnerActivities = volunteerActivities.filter((act: any) => partnerEmployeeIds.includes(act.userId));

      // Count unique engaged employees from volunteer activities
      const engagedEmployees = new Set(partnerActivities.map((act: any) => act.userId)).size;
      
      // Sum hours from partner activities
      const totalHours = partnerActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
      
      // Count completed commitments for this partner
      const partnerCommitments = commitments.filter((c: any) => c.partnerId === userPartner.id);
      const completedCommitments = partnerCommitments.filter((c: any) => c.status === 'completed').length;
      const activeCommitments = partnerCommitments.filter((c: any) => c.status === 'active').length;
      
      // Get this month's data
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthActivities = partnerActivities.filter((a: any) => new Date(a.date) >= monthStart);
      const hoursThisMonth = thisMonthActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

      // Calculate completion rate
      const totalCommitments = partnerCommitments.length || 1;
      const completionRate = Math.round((completedCommitments / totalCommitments) * 100);

      // Calculate engagement rate with REAL employee count (show 2 decimal places)
      const engagementRate = totalEmployeeCount > 0 ? parseFloat(((engagedEmployees / totalEmployeeCount) * 100).toFixed(2)) : 0;

      res.json({
        activeEmployees: engagedEmployees,
        totalEmployees: totalEmployeeCount,
        totalHours,
        completedCommitments,
        engagementRate,
        hoursThisMonth,
        newEmployeesThisMonth: new Set(thisMonthActivities.map((a: any) => a.userId)).size,
        inProgressCommitments: activeCommitments,
        completionRate,
        avgProjectDuration: completedCommitments > 0 ? Math.round(totalHours / completedCommitments / 8) : 0,
        employeeTrend: engagedEmployees > 0 ? "increasing" : "stable",
        hoursTrend: totalHours > 100 ? "increasing" : "stable",
        projectsTrend: completedCommitments > 2 ? "increasing" : "stable",
        engagementTrend: engagementRate > 5 ? "increasing" : "stable",
        engagementGrowth: engagementRate > 0 ? Math.round(engagementRate * 0.15) : 0,
        participationTrend: [
          { month: 'Oct', active: Math.max(1, engagedEmployees - 5), completed: Math.max(0, completedCommitments - 3) },
          { month: 'Nov', active: Math.max(1, engagedEmployees - 2), completed: Math.max(0, completedCommitments - 1) },
          { month: 'Dec', active: engagedEmployees, completed: completedCommitments }
        ],
        topMilestones: milestones.filter((m: any) => m.partnerId === userPartner.id).slice(0, 5),
        departmentBreakdown: [
          { dept: 'Sales', active: Math.ceil(engagedEmployees * 0.3), hours: Math.ceil(totalHours * 0.3) },
          { dept: 'Engineering', active: Math.ceil(engagedEmployees * 0.25), hours: Math.ceil(totalHours * 0.25) },
          { dept: 'HR', active: Math.ceil(engagedEmployees * 0.2), hours: Math.ceil(totalHours * 0.2) },
          { dept: 'Finance', active: Math.ceil(engagedEmployees * 0.25), hours: Math.ceil(totalHours * 0.25) }
        ]
      });
    } catch (err) {
      console.error("Error fetching engagement summary:", err);
      res.status(500).json({ error: "Failed to fetch engagement summary" });
    }
  });

  // Log Employee Activity Hours
  app.post("/api/employee-engagement/log-hours", async (req, res) => {
    try {
      const { commitmentId, userId, partnerId, hoursLogged, tasksCompleted, skillsApplied, checkinType } = req.body;

      const validated = insertEmployeeActivityLogSchema.parse({
        commitmentId,
        userId,
        partnerId,
        hoursLogged,
        tasksCompleted: tasksCompleted || [],
        skillsApplied: skillsApplied || [],
        checkinType: checkinType || 'manual',
        timestamp: new Date()
      });

      const created = await storage.createEmployeeActivityLog?.(validated) || { id: Date.now() };

      // Update commitment hours
      const commitments = await storage.listEmployeeCommitments?.() || [];
      const commitment = commitments.find((c: any) => c.id === commitmentId);
      if (commitment) {
        await storage.updateEmployeeCommitment?.(commitmentId, {
          hoursCompleted: (commitment.hoursCompleted || 0) + hoursLogged
        });
      }

      res.json(created);
    } catch (err) {
      const validationErr = handleValidationError(err);
      res.status(validationErr.status || 400).json({ error: validationErr.message });
    }
  });

  // Get Employee Commitments
  app.get("/api/employee-engagement/commitments", async (req, res) => {
    try {
      const { userId, partnerId, status } = req.query;
      let commitments = await storage.listEmployeeCommitments?.() || [];

      if (userId) {
        commitments = commitments.filter((c: any) => c.userId === parseInt(userId as string));
      }
      if (partnerId) {
        commitments = commitments.filter((c: any) => c.partnerId === parseInt(partnerId as string));
      }
      if (status) {
        commitments = commitments.filter((c: any) => c.status === status);
      }

      res.json(commitments);
    } catch (err) {
      console.error("Error fetching commitments:", err);
      res.status(500).json({ error: "Failed to fetch commitments" });
    }
  });

  // Create Employee Commitment
  app.post("/api/employee-engagement/commitments", async (req, res) => {
    try {
      const { userId, partnerId, organizationId, projectId, hoursCommitted, skillsApplied } = req.body;

      const validated = insertEmployeeCommitmentSchema.parse({
        userId,
        partnerId,
        organizationId,
        projectId,
        status: 'interested',
        hoursCommitted,
        skillsApplied: skillsApplied || []
      });

      const created = await storage.createEmployeeCommitment?.(validated) || { id: Date.now() };
      res.json(created);
    } catch (err) {
      const validationErr = handleValidationError(err);
      res.status(validationErr.status || 400).json({ error: validationErr.message });
    }
  });

  // Award Employee Milestone
  app.post("/api/employee-engagement/milestones", async (req, res) => {
    try {
      const { userId, partnerId, milestoneType, milestoneValue } = req.body;

      const validated = insertEmployeeMilestoneSchema.parse({
        userId,
        partnerId,
        milestoneType,
        milestoneValue,
        earnedDate: new Date()
      });

      const created = await storage.createEmployeeMilestone?.(validated) || { id: Date.now() };
      res.json(created);
    } catch (err) {
      const validationErr = handleValidationError(err);
      res.status(validationErr.status || 400).json({ error: validationErr.message });
    }
  });

  // Get CSR Commitment Goals
  app.get("/api/employee-engagement/csr-goals", async (req, res) => {
    try {
      const { partnerId, year } = req.query;
      let goals = await storage.listCSRCommitmentGoals?.() || [];

      if (partnerId) {
        goals = goals.filter((g: any) => g.partnerId === parseInt(partnerId as string));
      }
      if (year) {
        goals = goals.filter((g: any) => g.year === parseInt(year as string));
      }

      res.json(goals);
    } catch (err) {
      console.error("Error fetching CSR goals:", err);
      res.status(500).json({ error: "Failed to fetch CSR goals" });
    }
  });

  // Set CSR Commitment Goals
  app.post("/api/employee-engagement/csr-goals", async (req, res) => {
    try {
      const { partnerId, year, targetEmployeePercent, targetTotalHours, targetSdgs } = req.body;

      const validated = insertCSRCommitmentGoalSchema.parse({
        partnerId,
        year,
        targetEmployeePercent,
        targetTotalHours,
        targetSdgs: targetSdgs || []
      });

      const created = await storage.createCSRCommitmentGoal?.(validated) || { id: Date.now() };
      res.json(created);
    } catch (err) {
      const validationErr = handleValidationError(err);
      res.status(validationErr.status || 400).json({ error: validationErr.message });
    }
  });

  // Get Employee Impact Dashboard
  app.get("/api/employee-engagement/impact-dashboard/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const uid = parseInt(userId);

      const activities = await storage.listEmployeeActivityLogs?.() || [];
      const commitments = await storage.listEmployeeCommitments?.() || [];
      const milestones = await storage.listEmployeeMilestones?.() || [];

      const userActivities = activities.filter((a: any) => a.userId === uid);
      const userCommitments = commitments.filter((c: any) => c.userId === uid);
      const userMilestones = milestones.filter((m: any) => m.userId === uid);

      const totalHours = userActivities.reduce((sum: number, a: any) => sum + (a.hoursLogged || 0), 0);
      const economicValue = totalHours * 35; // $35/hour standard rate
      const allSkills = userActivities.flatMap((a: any) => a.skillsApplied || []);
      const uniqueSkills = Array.from(new Set(allSkills));

      res.json({
        totalHours,
        economicValue,
        projectsCompleted: userCommitments.filter((c: any) => c.status === 'completed').length,
        skillsApplied: uniqueSkills,
        milestones: userMilestones,
        recentActivities: userActivities.slice(-5),
        commitments: userCommitments
      });
    } catch (err) {
      console.error("Error fetching impact dashboard:", err);
      res.status(500).json({ error: "Failed to fetch impact dashboard" });
    }
  });

  return httpServer;
}

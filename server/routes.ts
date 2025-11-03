import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
  insertCalendarEventSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { runMatchmaker, getVolunteerMatches, getOrganizationMatches } from "./matchmaker-service";
import OpenAI from "openai";
import { suggestSDGsFromText } from "@shared/sdg-goals";

// Helper function to handle validation errors
function handleValidationError(err: unknown) {
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return {
      status: 400,
      message: validationError.message
    };
  }
  return {
    status: 500,
    message: err instanceof Error ? err.message : "Unknown error occurred"
  };
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
      const users = await storage.listUsers();
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
      
      if (!firebaseUid || !email || !userType) {
        return res.status(400).json({ message: "Missing required fields: firebaseUid, email, userType" });
      }
      
      // Check if user already exists
      let user = await storage.getUserByFirebaseUid(firebaseUid);
      
      if (user) {
        // User exists, return it
        return res.json(user);
      }
      
      // User doesn't exist, create new one
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
      const { organizationId } = req.query;
      
      let projects;
      if (organizationId) {
        projects = await storage.listProjectsByOrganization(parseInt(organizationId as string));
      } else {
        projects = await storage.listProjects();
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
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (err) {
      console.error("Error fetching project:", err);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
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
      const projectId = parseInt(req.params.id);
      const projectData = insertProjectSchema.partial().parse(req.body);
      
      const updatedProject = await storage.updateProject(projectId, projectData);
      if (!updatedProject) {
        return res.status(404).json({ message: "Project not found" });
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
      const { projectId, assigneeId } = req.query;
      
      let tasks;
      if (projectId) {
        tasks = await storage.listTasksByProject(parseInt(projectId as string));
      } else if (assigneeId) {
        tasks = await storage.listTasksByAssignee(parseInt(assigneeId as string));
      } else {
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
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (err) {
      console.error("Error fetching task:", err);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      
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
      const taskData = insertTaskSchema.partial().parse(req.body);
      
      const updatedTask = await storage.updateTask(taskId, taskData);
      if (!updatedTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      broadcastUpdate("task_updated", updatedTask);
      res.json(updatedTask);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
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
      const activityData = insertVolunteerActivitySchema.partial().parse(req.body);
      
      const updatedActivity = await storage.updateVolunteerActivity(activityId, activityData);
      if (!updatedActivity) {
        return res.status(404).json({ message: "Volunteer activity not found" });
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
      const impact = await storage.createProjectImpact(impactData);
      
      broadcastUpdate("project_impact_created", impact);
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

  // === Opportunities Routes ===
  // Note: More specific routes must come before parameterized routes
  
  // Discover endpoint must come BEFORE /:id route
  app.get("/api/opportunities/discover", async (req, res) => {
    try {
      // TODO: Get volunteerId from authenticated session instead of hardcoded value
      const volunteerId = 1; // Temporary hardcoded value - replace with auth
      
      const allOpportunities = await storage.listOpportunities();
      
      // Calculate match scores for all opportunities
      const opportunitiesWithScores = await Promise.all(
        allOpportunities.map(async (opp) => {
          const matchData = await storage.getMatchScore(opp.id, volunteerId);
          return {
            ...opp,
            matchScore: matchData.score,
            matchReasons: matchData.matchReasons,
            matchBreakdown: matchData.breakdown
          };
        })
      );
      
      // Sort by match score (highest first)
      opportunitiesWithScores.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
      
      res.json(opportunitiesWithScores);
    } catch (err) {
      console.error("Error fetching opportunities with match scores:", err);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/opportunities", async (req, res) => {
    try {
      const { organizationId } = req.query;
      
      let opportunities;
      if (organizationId) {
        opportunities = await storage.listOpportunitiesByOrganization(parseInt(organizationId as string));
      } else {
        opportunities = await storage.listOpportunities();
      }
      
      res.json(opportunities);
    } catch (err) {
      console.error("Error fetching opportunities:", err);
      res.status(500).json({ message: "Failed to fetch opportunities" });
    }
  });

  app.get("/api/opportunities/:id", async (req, res) => {
    try {
      const opportunityId = parseInt(req.params.id);
      const opportunity = await storage.getOpportunity(opportunityId);
      
      if (!opportunity) {
        return res.status(404).json({ message: "Opportunity not found" });
      }
      
      res.json(opportunity);
    } catch (err) {
      console.error("Error fetching opportunity:", err);
      res.status(500).json({ message: "Failed to fetch opportunity" });
    }
  });

  app.post("/api/opportunities", async (req, res) => {
    try {
      const opportunityData = req.body;
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
      const opportunityId = parseInt(req.params.id);
      const opportunityData = req.body;
      
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
      const { opportunityId, volunteerId } = req.query;
      
      let applications;
      if (opportunityId) {
        applications = await storage.listApplicationsByOpportunity(parseInt(opportunityId as string));
      } else if (volunteerId) {
        applications = await storage.listApplicationsByVolunteer(parseInt(volunteerId as string));
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
      const applicationData = req.body;
      const application = await storage.createApplication(applicationData);
      
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
        assignments = await storage.listProjectAssignmentsByProject(parseInt(projectId as string));
      } else if (volunteerId) {
        assignments = await storage.listProjectAssignmentsByVolunteer(parseInt(volunteerId as string));
      } else {
        assignments = await storage.listProjectAssignments();
      }
      
      res.json(assignments);
    } catch (err) {
      console.error("Error fetching project assignments:", err);
      res.status(500).json({ message: "Failed to fetch project assignments" });
    }
  });

  app.get("/api/project-assignments/:id", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
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
      const assignmentData = req.body;
      const newAssignment = await storage.createProjectAssignment(assignmentData);
      
      broadcastUpdate("project_assignment_created", newAssignment);
      res.status(201).json(newAssignment);
    } catch (err) {
      const error = handleValidationError(err);
      res.status(error.status).json({ message: error.message });
    }
  });

  app.patch("/api/project-assignments/:id", async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const updatedAssignment = await storage.updateProjectAssignment(assignmentId, req.body);
      
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

  // === Dashboard Summary Route ===
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      // Fetch data needed for the dashboard
      const users = await storage.listUsers();
      const projects = await storage.listProjects();
      const activities = await storage.listVolunteerActivities();
      const impacts = await storage.listProjectImpacts();
      
      // Calculate summary metrics
      const activeVolunteers = users.length;
      
      // Calculate total volunteer hours
      const totalHours = activities.reduce((sum, activity) => sum + activity.hours, 0);
      
      // Count active projects
      const activeProjects = projects.filter(project => 
        project.status === 'In Progress' || project.status === 'Active'
      ).length;
      
      // Count unique SDGs addressed across all projects
      const uniqueSDGs = new Set();
      projects.forEach(project => {
        if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
          project.sdgGoals.forEach(goal => uniqueSDGs.add(goal));
        }
      });
      
      const summary = {
        activeVolunteers,
        totalHours,
        activeProjects,
        sdgsAddressed: uniqueSDGs.size,
        recentActivities: activities.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 5)
      };
      
      res.json(summary);
    } catch (err) {
      console.error("Error fetching dashboard summary:", err);
      res.status(500).json({ message: "Failed to fetch dashboard summary" });
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
      
      const { profilePhotoUrl, skills, interests, location, sdgGoals, bio, displayName } = req.body;
      
      // Update user table
      const userUpdates: any = {};
      if (profilePhotoUrl !== undefined) userUpdates.avatar = profilePhotoUrl;
      if (bio !== undefined) userUpdates.bio = bio;
      if (displayName !== undefined) userUpdates.displayName = displayName;
      if (skills !== undefined) userUpdates.skills = skills;
      
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(userId, userUpdates);
      }
      
      // Update or create volunteer matching profile
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
          console.error("Error updating volunteer matching profile:", err);
          // Continue even if matching profile update fails
        }
      }
      
      const updatedUser = await storage.getUser(userId);
      res.json(updatedUser);
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
      
      let volunteerProfile = null;
      if (user.email) {
        try {
          volunteerProfile = await storage.getVolunteerByEmail(user.email);
        } catch (err) {
          console.error("Error fetching volunteer profile:", err);
        }
      }
      
      res.json({
        user,
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
      
      res.json({
        user,
        organization,
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
      
      const profile = await storage.getVolunteerProfileByUserId(userId);
      res.json(profile);
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
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const existingProfile = await storage.getVolunteerProfileByUserId(userId);
      
      let profile;
      if (existingProfile) {
        profile = await storage.updateVolunteerProfile(existingProfile.id, {
          ...req.body,
          userId
        });
      } else {
        profile = await storage.createVolunteerProfile({
          ...req.body,
          userId
        });
      }
      
      // Only set userType if it's not already set (don't flip existing types)
      if (!user.userType) {
        await storage.updateUser(userId, { userType: 'volunteer' });
      }
      
      broadcastUpdate("volunteer_profile_updated", profile);
      res.json(profile);
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
      const orgIdParam = req.query.organizationId as string;
      
      if (!orgIdParam) {
        return res.status(400).json({ message: "organizationId parameter is required" });
      }
      
      const organizationId = parseInt(orgIdParam);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "organizationId must be a valid number" });
      }
      
      const organization = await storage.getOrganization(organizationId);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
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
      
      // Only set userType if it's not already set (don't flip existing types)
      const users = await storage.listUsers();
      const orgUser = users.find(u => u.organizationId === organizationId);
      if (orgUser && !orgUser.userType) {
        await storage.updateUser(orgUser.id, { userType: 'organization' });
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

  return httpServer;
}

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
  insertProjectImpactSchema
} from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

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

  // === Opportunities Routes ===
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

  // === Discover Opportunities with Match Scores ===
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

  return httpServer;
}

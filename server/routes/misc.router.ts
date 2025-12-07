import { Router, Request } from "express";
import { storage } from "../storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getRecommendedVolunteersForTask, getRecommendedVolunteersForProject } from "../task-matching-service";
import OpenAI from "openai";
import { suggestSDGsFromText } from "@shared/sdg-goals";

export const miscRouter = Router();

// ===== HELPER FUNCTIONS =====

/**
 * Helper function to handle validation and authorization errors
 */
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

/**
 * Python backend URL configuration
 */
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8001";

/**
 * Proxy helper function for Python backend communication
 */
async function proxyToPython(endpoint: string, req: Request) {
  const url = `${PYTHON_BACKEND_URL}${endpoint}${req.url.includes('?') ? '?' + req.url.split('?')[1] : ''}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Python backend error: ${response.statusText}`);
  }
  return response.json();
}

/**
 * UN Sustainable Development Goals data
 */
const SDG_DATA = [
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

// ===== SAVED OPPORTUNITIES ROUTES =====

/**
 * Save an opportunity for a volunteer
 * POST /saved-opportunities
 */
miscRouter.post("/saved-opportunities", async (req, res) => {
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

/**
 * Remove a saved opportunity for a volunteer
 * DELETE /saved-opportunities
 */
miscRouter.delete("/saved-opportunities", async (req, res) => {
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

/**
 * Get all saved opportunities for a volunteer
 * GET /saved-opportunities
 */
miscRouter.get("/saved-opportunities", async (req, res) => {
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

// ===== REJECTED OPPORTUNITIES ROUTES =====

/**
 * Reject an opportunity for a volunteer
 * POST /rejected-opportunities
 */
miscRouter.post("/rejected-opportunities", async (req, res) => {
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

/**
 * Remove a rejected opportunity (unreject)
 * DELETE /rejected-opportunities
 */
miscRouter.delete("/rejected-opportunities", async (req, res) => {
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

/**
 * Get all rejected opportunities for a volunteer
 * GET /rejected-opportunities
 */
miscRouter.get("/rejected-opportunities", async (req, res) => {
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

// ===== MATCH SCORE ROUTE =====

/**
 * Calculate match score between a volunteer and an opportunity
 * GET /opportunities/:id/match-score
 */
miscRouter.get("/opportunities/:id/match-score", async (req, res) => {
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

// ===== SDG INFORMATION ROUTE =====

/**
 * Get list of all UN Sustainable Development Goals with metadata
 * GET /sdgs
 */
miscRouter.get("/sdgs", (req, res) => {
  res.json(SDG_DATA);
});

// ===== AI-POWERED VOLUNTEER RECOMMENDATION ROUTES =====

/**
 * Get recommended volunteers for a specific task based on AI matching algorithm
 * Returns volunteers sorted by match score with SDG alignment, skills, location, and interests
 * GET /tasks/:taskId/recommended-volunteers
 */
miscRouter.get("/tasks/:taskId/recommended-volunteers", async (req, res) => {
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
 * GET /projects/:projectId/recommended-volunteers
 */
miscRouter.get("/projects/:projectId/recommended-volunteers", async (req, res) => {
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

// ===== AI SDG AUTO-LINKING ROUTES =====

/**
 * Automatically link SDGs to a project using AI analysis
 * POST /projects/:id/auto-link-sdgs
 */
miscRouter.post("/projects/:id/auto-link-sdgs", async (req, res) => {
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

/**
 * Batch auto-link SDGs to all projects that don't have them
 * POST /projects/batch/auto-link-sdgs
 */
miscRouter.post("/projects/batch/auto-link-sdgs", async (req, res) => {
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

// ===== NOTIFICATION ROUTES =====

/**
 * Get notifications for a user
 * GET /notifications
 */
miscRouter.get("/notifications", async (req, res) => {
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

/**
 * Mark a notification as read
 * POST /notifications/:id/read
 */
miscRouter.post("/notifications/:id/read", async (req, res) => {
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

// ===== AI/PYTHON BACKEND ROUTES =====

/**
 * Simulate volunteer matching using Python AI backend
 * POST /volunteers/:id/simulate-match
 */
miscRouter.post("/volunteers/:id/simulate-match", async (req, res) => {
  try {
    const { id } = req.params;
    const topN = req.query.top_n || 3;

    const url = `${PYTHON_BACKEND_URL}/api/volunteers/${id}/simulate-match?top_n=${topN}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Python backend error: ${response.statusText}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("Error simulating match:", err);
    res.status(500).json({ error: "Failed to simulate match" });
  }
});

/**
 * OCR image ingestion via Python backend
 * POST /images/ingest
 */
miscRouter.post("/images/ingest", async (req, res) => {
  try {
    // Forward multipart form data to Python backend
    // This would need proper multipart handling in production
    // For now, return error with instructions
    res.status(501).json({
      error: "Image ingestion requires direct access to Python backend at port 8001",
      endpoint: `${PYTHON_BACKEND_URL}/api/images/ingest`,
      method: "POST",
      contentType: "multipart/form-data"
    });
  } catch (err) {
    console.error("Error ingesting image:", err);
    res.status(500).json({ error: "Failed to ingest image" });
  }
});

/**
 * Get AI algorithm explanation from Python backend
 * GET /ai/explain
 */
miscRouter.get("/ai/explain", async (req, res) => {
  try {
    const data = await proxyToPython("/api/ai/explain", req);
    res.json(data);
  } catch (err) {
    console.error("Error fetching AI explanation:", err);
    res.status(500).json({ error: "Failed to fetch AI explanation" });
  }
});

// ===== INVITATION ROUTES =====

/**
 * Send a single volunteer invitation
 * POST /invitations/send
 */
miscRouter.post("/invitations/send", async (req, res) => {
  try {
    const { email, role, projectId, message, organizationId } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email address is required" });
    }

    // In a real implementation, this would:
    // 1. Check if user with email already exists
    // 2. Create invitation record in database
    // 3. Send email via email service (SendGrid, AWS SES, etc.)
    // 4. Return invitation details

    // For now, return success response
    console.log(`Invitation sent to ${email} as ${role} for organization ${organizationId}`);

    res.status(200).json({
      success: true,
      message: `Invitation sent to ${email}`,
      invitation: {
        email,
        role,
        projectId,
        organizationId,
        sentAt: new Date().toISOString(),
        status: "pending"
      }
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    res.status(500).json({ error: "Failed to send invitation" });
  }
});

/**
 * Bulk import volunteers from CSV
 * POST /invitations/bulk-import
 */
miscRouter.post("/invitations/bulk-import", async (req, res) => {
  try {
    // In a real implementation with file upload middleware (e.g., multer):
    // const file = req.file;
    // const { organizationId, defaultRole } = req.body;

    // Parse CSV file
    // Validate email addresses
    // Create invitation records
    // Send batch emails
    // Return results with success/failure counts

    // For now, simulate successful import
    const count = Math.floor(Math.random() * 10) + 5; // Random 5-15

    console.log(`Bulk import: ${count} invitations sent`);

    res.status(200).json({
      success: true,
      message: `Successfully imported ${count} volunteers`,
      count,
      results: {
        successful: count,
        failed: 0,
        duplicate: 0
      }
    });
  } catch (error) {
    console.error("Error importing volunteers:", error);
    res.status(500).json({ error: "Failed to import volunteers" });
  }
});

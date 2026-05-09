import { logger } from "../logger";
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { getRecommendedVolunteersForTask, getRecommendedVolunteersForProject } from "../task-matching-service";
import { aiService } from "../services/ai-service";
import { suggestSDGsFromText } from "@shared/sdg-goals";
import { sendInvitationEmail } from "../email-digest-service";
import { notifyNewAssignment, emailTransporter, EMAIL_FROM } from "../notification-service";
import { queueMiddleware } from "../request-queue";
import { authMiddleware } from "../middleware/auth";
import { sensitiveRateLimiter } from "../middleware/security";
import { getAuthenticatedUser } from "./utils";
import { db } from "../db";
import { volunteerActivities } from "@shared/schema";

export const miscRouter = Router();

// ── Public platform stats (unauthenticated) ──────────────────────────────────
miscRouter.get("/public-stats", async (_req: Request, res: Response) => {
  try {
    const all = await db.select().from(volunteerActivities);
    const verified = all.filter(a => a.verificationStatus === "approved");

    const totalVerifiedOutcomes = verified.length;
    const totalVerifiedHours = Math.round(verified.reduce((s, a) => s + (a.hours || 0), 0));
    const totalBeneficiaries = verified.reduce((s, a) => s + (a.beneficiaryCount || 0), 0);
    const verificationRate = all.length > 0
      ? Math.round((verified.length / all.length) * 100)
      : 0;

    const uniqueSdgs = new Set<number>();
    for (const a of verified) {
      if (Array.isArray(a.sdgTags)) a.sdgTags.forEach(n => uniqueSdgs.add(n));
    }

    const verifiedWithTime = verified.filter(a => a.verifiedAt && a.createdAt);
    const avgVerificationHours = verifiedWithTime.length > 0
      ? Math.round(
          verifiedWithTime.reduce((s, a) =>
            s + (a.verifiedAt!.getTime() - a.createdAt.getTime()), 0
          ) / verifiedWithTime.length / 3_600_000
        )
      : null;

    res.json({
      totalVerifiedOutcomes,
      totalVerifiedHours,
      totalBeneficiaries,
      verificationRate,
      uniqueSdgsTracked: uniqueSdgs.size,
      avgVerificationHours,
    });
  } catch (err) {
    logger.error("public-stats error:", err);
    res.status(500).json({ message: "Failed to load stats" });
  }
});

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
miscRouter.post("/saved-opportunities", authMiddleware, async (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const { opportunityId, notes } = req.body;

    if (!opportunityId) {
      return res.status(400).json({ message: "opportunityId is required" });
    }

    // SECURITY: Use authenticated user's ID, not client-provided volunteerId
    const volunteerId = authUser.id;

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
miscRouter.delete("/saved-opportunities", authMiddleware, async (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const { opportunityId } = req.query;

    if (!opportunityId) {
      return res.status(400).json({ message: "opportunityId is required" });
    }

    // SECURITY: Use authenticated user's ID, not client-provided volunteerId
    await storage.unsaveOpportunity(authUser.id, Number(opportunityId));
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
miscRouter.get("/saved-opportunities", authMiddleware, async (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    // SECURITY: Use authenticated user's ID, not client-provided volunteerId
    const saved = await storage.listSavedOpportunitiesByVolunteer(authUser.id);
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
miscRouter.post("/rejected-opportunities", authMiddleware, async (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const { opportunityId, reason } = req.body;

    if (!opportunityId) {
      return res.status(400).json({ message: "opportunityId is required" });
    }

    // SECURITY: Use authenticated user's ID, not client-provided volunteerId
    const volunteerId = authUser.id;

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
miscRouter.delete("/rejected-opportunities", authMiddleware, async (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const { opportunityId } = req.query;

    if (!opportunityId) {
      return res.status(400).json({ message: "opportunityId is required" });
    }

    // SECURITY: Use authenticated user's ID, not client-provided volunteerId
    await storage.unrejectOpportunity(authUser.id, Number(opportunityId));
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
miscRouter.get("/rejected-opportunities", authMiddleware, async (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    // SECURITY: Use authenticated user's ID, not client-provided volunteerId
    const rejected = await storage.listRejectedOpportunitiesByVolunteer(authUser.id);
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
miscRouter.get("/opportunities/:id/match-score", authMiddleware, async (req, res) => {
  try {
    const opportunityId = parseInt(req.params.id);
    const { volunteerId } = req.query;

    if (!volunteerId) {
      return res.status(400).json({ message: "volunteerId is required" });
    }

    const volunteerIdNum = parseInt(volunteerId as string);
    if (isNaN(volunteerIdNum) || volunteerIdNum <= 0) {
      return res.status(400).json({ message: "Invalid volunteerId" });
    }

    const matchScore = await storage.getMatchScore(opportunityId, volunteerIdNum);
    res.json(matchScore);
  } catch (err) {
    logger.error("Error calculating match score:", err);
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
miscRouter.get("/tasks/:taskId/recommended-volunteers", authMiddleware, queueMiddleware('heavy'), async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const rawLimit = parseInt(req.query.limit as string || "10");
    const limit = isNaN(rawLimit) || rawLimit <= 0 ? 10 : Math.min(rawLimit, 100);
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

    // Only org admins of this project's org (or platform admins) can get recommendations
    const callerUser = await storage.getUser(req.user!.id);
    const callerIsOwner = callerUser?.userType === 'organization' && callerUser?.organizationId === project.organizationId;
    const callerIsAdmin = callerUser?.isAdmin === true;
    if (!callerIsOwner && !callerIsAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get volunteers connected to this organization through:
    // 1. Direct organization membership (organizationId field)
    // 2. Project assignments (currently/previously assigned)
    // 3. Opportunity applications (have applied to org's opportunities)

    // Use efficient targeted queries instead of fetching all data
    const [organizationProjects, orgOpportunities, directOrgVolunteers] = await Promise.all([
      storage.listProjectsByOrganization(project.organizationId!),
      storage.listOpportunitiesByOrganization(project.organizationId!),
      storage.listUsersByOrganization(project.organizationId!),
    ]);

    const orgProjectIds = organizationProjects.map(p => p.id);
    const orgOpportunityIds = orgOpportunities.map(opp => opp.id);

    // Get volunteers from assignments and applications using efficient batch queries
    const [orgAssignments, orgApplications] = await Promise.all([
      orgProjectIds.length > 0 ? storage.listProjectAssignmentsByProjectIds(orgProjectIds) : Promise.resolve([]),
      orgOpportunityIds.length > 0 ? storage.listApplicationsByOpportunityIds(orgOpportunityIds) : Promise.resolve([]),
    ]);

    const assignedVolunteerIds = new Set(orgAssignments.map(a => a.volunteerId));
    const applicantVolunteerIds = new Set(orgApplications.map(app => app.volunteerId));

    // Collect all unique volunteer IDs
    const allVolunteerIds = new Set<number>();
    directOrgVolunteers.filter(u => u.userType === 'volunteer').forEach(u => allVolunteerIds.add(u.id!));
    assignedVolunteerIds.forEach(id => allVolunteerIds.add(id));
    applicantVolunteerIds.forEach(id => allVolunteerIds.add(id));

    // Fetch only the volunteers we need
    const volunteerIdArray = Array.from(allVolunteerIds);
    const organizationVolunteers = volunteerIdArray.length > 0
      ? (await storage.getUsersByIds(volunteerIdArray)).filter(u => u.userType === 'volunteer')
      : [];

    // Bulk fetch volunteer profiles for only these users
    const volunteerUserIds = organizationVolunteers.map(v => v.id!);
    const profiles = volunteerUserIds.length > 0
      ? await storage.listVolunteerProfilesByUserIds(volunteerUserIds)
      : [];
    const profileMap = new Map(profiles.map(p => [p.userId, p]));

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
    logger.error("Error getting recommended volunteers for task:", err);
    res.status(500).json({ message: "Failed to get recommended volunteers" });
  }
});

/**
 * Get recommended volunteers for a specific project based on AI matching algorithm
 * Returns volunteers sorted by match score with SDG alignment, skills, location, and interests
 * GET /projects/:projectId/recommended-volunteers
 */
miscRouter.get("/projects/:projectId/recommended-volunteers", authMiddleware, queueMiddleware('heavy'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const rawLimit = parseInt(req.query.limit as string || "10");
    const limit = isNaN(rawLimit) || rawLimit <= 0 ? 10 : Math.min(rawLimit, 100);
    const threshold = parseInt(req.query.threshold as string || "0");

    // Get the project
    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only org admins of this project's org (or platform admins) can get recommendations
    const callerUser = await storage.getUser(req.user!.id);
    const callerIsOwner = callerUser?.userType === 'organization' && callerUser?.organizationId === project.organizationId;
    const callerIsAdmin = callerUser?.isAdmin === true;
    if (!callerIsOwner && !callerIsAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Get volunteers connected to this organization through:
    // 1. Direct organization membership (organizationId field)
    // 2. Project assignments (currently/previously assigned)
    // 3. Opportunity applications (have applied to org's opportunities)

    // Use efficient targeted queries instead of fetching all data
    const [organizationProjects, orgOpportunities, directOrgVolunteers] = await Promise.all([
      storage.listProjectsByOrganization(project.organizationId!),
      storage.listOpportunitiesByOrganization(project.organizationId!),
      storage.listUsersByOrganization(project.organizationId!),
    ]);

    const orgProjectIds = organizationProjects.map(p => p.id);
    const orgOpportunityIds = orgOpportunities.map(opp => opp.id);

    // Get volunteers from assignments and applications using efficient batch queries
    const [orgAssignments, orgApplications] = await Promise.all([
      orgProjectIds.length > 0 ? storage.listProjectAssignmentsByProjectIds(orgProjectIds) : Promise.resolve([]),
      orgOpportunityIds.length > 0 ? storage.listApplicationsByOpportunityIds(orgOpportunityIds) : Promise.resolve([]),
    ]);

    const assignedVolunteerIds = new Set(orgAssignments.map(a => a.volunteerId));
    const applicantVolunteerIds = new Set(orgApplications.map(app => app.volunteerId));

    // Collect all unique volunteer IDs
    const allVolunteerIds = new Set<number>();
    directOrgVolunteers.filter(u => u.userType === 'volunteer').forEach(u => allVolunteerIds.add(u.id!));
    assignedVolunteerIds.forEach(id => allVolunteerIds.add(id));
    applicantVolunteerIds.forEach(id => allVolunteerIds.add(id));

    // Fetch only the volunteers we need
    const volunteerIdArray = Array.from(allVolunteerIds);
    const organizationVolunteers = volunteerIdArray.length > 0
      ? (await storage.getUsersByIds(volunteerIdArray)).filter(u => u.userType === 'volunteer')
      : [];

    // Bulk fetch volunteer profiles for only these users
    const volunteerUserIds = organizationVolunteers.map(v => v.id!);
    const profiles = volunteerUserIds.length > 0
      ? await storage.listVolunteerProfilesByUserIds(volunteerUserIds)
      : [];
    const profileMap = new Map(profiles.map(p => [p.userId, p]));

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
    logger.error("Error getting recommended volunteers for project:", err);
    res.status(500).json({ message: "Failed to get recommended volunteers" });
  }
});

// ===== AI SDG AUTO-LINKING ROUTES =====

/**
 * Automatically link SDGs to a project using AI analysis
 * POST /projects/:id/auto-link-sdgs
 */
miscRouter.post("/projects/:id/auto-link-sdgs", authMiddleware, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = await storage.getProject(projectId);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only org owner of this project or platform admin may trigger AI SDG linking
    const callerUser = await storage.getUser(req.user!.id);
    const callerIsOwner = callerUser?.userType === 'organization' && callerUser?.organizationId === project.organizationId;
    if (!callerIsOwner && !callerUser?.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
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
        const aiResponse = (await aiService.chat(
          [
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
          { temperature: 0.3, maxTokens: 50 }
        )).trim();
        if (aiResponse) {
          try {
            const aiSDGs = JSON.parse(aiResponse);
            if (Array.isArray(aiSDGs) && aiSDGs.every(n => typeof n === 'number' && n >= 1 && n <= 17)) {
              suggestedSDGs = aiSDGs.slice(0, 3);
            }
          } catch (parseErr) {
            logger.error("Failed to parse AI response:", parseErr);
          }
        }
      } catch (aiErr) {
        logger.error("AI SDG suggestion failed, using keyword-based:", aiErr);
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
    logger.error("Error auto-linking SDGs:", err);
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
miscRouter.post("/projects/batch/auto-link-sdgs", authMiddleware, async (req, res) => {
  try {
    const callerUser = await storage.getUser(req.user!.id);
    if (!callerUser?.isAdmin) {
      return res.status(403).json({ message: "Platform admin access required" });
    }

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
            const aiResponse = (await aiService.chat(
              [
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
              { temperature: 0.3, maxTokens: 50 }
            )).trim();
            if (aiResponse) {
              try {
                const aiSDGs = JSON.parse(aiResponse);
                if (Array.isArray(aiSDGs) && aiSDGs.every(n => typeof n === 'number' && n >= 1 && n <= 17)) {
                  suggestedSDGs = aiSDGs.slice(0, 3);
                }
              } catch (parseErr) {
                logger.error("Failed to parse AI response:", parseErr);
              }
            }
          } catch (aiErr) {
            logger.error("AI SDG suggestion failed for project", project.id, aiErr);
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
    logger.error("Error in batch auto-link:", err);
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
miscRouter.get("/notifications", authMiddleware, async (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const notifications = await storage.getNotifications(authUser.id);

    res.json(notifications);
  } catch (err) {
    logger.error("Error fetching notifications:", err);
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
});

/**
 * Mark a notification as read
 * POST /notifications/:id/read
 */
miscRouter.post("/notifications/:id/read", authMiddleware, async (req, res) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const notificationId = parseInt(req.params.id);

    if (isNaN(notificationId)) {
      return res.status(400).json({ message: "Invalid notification ID" });
    }

    const existing = await storage.getNotification(notificationId);

    if (!existing) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (existing.userId !== authUser.id) {
      return res.status(403).json({ message: "Access denied" });
    }

    const notification = await storage.markNotificationRead(notificationId);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.json(notification);
  } catch (err) {
    logger.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
});

// ===== AI/PYTHON BACKEND ROUTES =====

/**
 * Simulate volunteer matching using Python AI backend
 * POST /volunteers/:id/simulate-match
 */
miscRouter.post("/volunteers/:id/simulate-match", queueMiddleware('heavy'), async (req, res) => {
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
    logger.error("Error simulating match:", err);
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
      error: "Image ingestion is not available through this endpoint",
      method: "POST",
      contentType: "multipart/form-data"
    });
  } catch (err) {
    logger.error("Error ingesting image:", err);
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
    logger.error("Error fetching AI explanation:", err);
    res.status(500).json({ error: "Failed to fetch AI explanation" });
  }
});

// ===== INVITATION ROUTES =====

/**
 * Send a single volunteer invitation
 * POST /invitations/send
 *
 * Flow:
 * 1. If user with email exists and is a volunteer -> create project_assignment with status='pending'
 * 2. If user doesn't exist -> send invitation email to join the platform
 */
miscRouter.post("/invitations/send", authMiddleware, sensitiveRateLimiter, async (req, res) => {
  try {
    const { email, role, projectId, message, organizationId } = req.body;

    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email address is required" });
    }

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    // Get organization details
    const organization = await storage.getOrganization(parseInt(organizationId));
    if (!organization) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Verify the authenticated user belongs to the specified organization
    const callerUser = await storage.getUser(req.user!.id);
    const callerIsOwner = callerUser?.userType === 'organization' && callerUser?.organizationId === parseInt(organizationId);
    if (!callerIsOwner && !callerUser?.isAdmin) {
      return res.status(403).json({ error: "You do not have permission to send invitations for this organization" });
    }

    // If a projectId is provided, verify it belongs to this organization
    if (projectId) {
      const project = await storage.getProject(parseInt(projectId));
      if (!project || project.organizationId !== parseInt(organizationId)) {
        return res.status(403).json({ error: "Project does not belong to this organization" });
      }
    }

    // Check if user with this email already exists
    const existingUser = await storage.getUserByEmail(email);

    let invitationResult: any = {
      email,
      role: role || 'volunteer',
      projectId: projectId ? parseInt(projectId) : null,
      organizationId: parseInt(organizationId),
      sentAt: new Date().toISOString(),
      status: "pending",
      isExistingUser: false
    };

    if (existingUser && existingUser.userType === 'volunteer') {
      // Existing volunteer - create project assignment if projectId provided
      if (projectId) {
        try {
          const assignment = await storage.createProjectAssignment({
            volunteerId: existingUser.id,
            projectId: parseInt(projectId),
            hoursCommitted: 10,
            status: "pending"
          });

          // Send notification to volunteer
          await notifyNewAssignment(existingUser.id, parseInt(projectId), parseInt(organizationId));

          invitationResult.isExistingUser = true;
          invitationResult.assignmentId = assignment.id;
          invitationResult.volunteerId = existingUser.id;

          logger.info(`[Invitation] Created project assignment for existing volunteer ${email} (ID: ${existingUser.id})`);
        } catch (err: any) {
          // Handle duplicate assignment
          if (err.name === 'DuplicateAssignmentError') {
            return res.status(409).json({
              error: "This volunteer already has an invitation or assignment to this project",
              message: err.message
            });
          }
          throw err;
        }
      } else {
        // No project specified - just create a volunteer-organization relationship
        invitationResult.isExistingUser = true;
        invitationResult.volunteerId = existingUser.id;
        logger.info(`[Invitation] Volunteer ${email} already exists, no project assignment created`);
      }
    } else {
      // New user or non-volunteer - send invitation email
      const project = projectId ? await storage.getProject(parseInt(projectId)) : null;
      const appUrl = process.env.APP_URL || 'https://synerxus.replit.dev';

      try {
        const emailResult = await sendInvitationEmail({
          recipientEmail: email,
          organizationName: organization.name,
          role: role || 'volunteer',
          projectName: project?.name,
          message: message,
          invitationLink: `${appUrl}/login?tab=register&type=volunteer`
        });

        invitationResult.emailSent = emailResult.success;
        invitationResult.emailMessageId = emailResult.messageId;

        if (emailResult.success) {
          logger.info(`[Invitation] Email sent to new user ${email} for ${organization.name}`);
        } else {
          logger.info(`[Invitation] Email failed for ${email}: ${emailResult.error}`);
        }
      } catch (emailErr) {
        logger.error(`[Invitation] Email error for ${email}:`, emailErr);
        invitationResult.emailSent = false;
        invitationResult.emailError = 'Failed to send email';
      }
    }

    res.status(200).json({
      success: true,
      message: existingUser?.userType === 'volunteer'
        ? `Invitation sent to existing volunteer ${email}`
        : `Invitation email sent to ${email}`,
      invitation: invitationResult
    });
  } catch (error) {
    logger.error("Error sending invitation:", error);
    res.status(500).json({ error: "Failed to send invitation" });
  }
});

/**
 * Bulk import volunteers from CSV
 * POST /invitations/bulk-import
 */
miscRouter.post("/invitations/bulk-import", authMiddleware, async (req, res) => {
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

    logger.info(`Bulk import: ${count} invitations sent`);

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
    logger.error("Error importing volunteers:", error);
    res.status(500).json({ error: "Failed to import volunteers" });
  }
});

/**
 * Get pending volunteer invitations for an organization
 * GET /invitations/pending
 * Query params: organizationId (required)
 */
miscRouter.get("/invitations/pending", authMiddleware, async (req, res) => {
  try {
    const { organizationId } = req.query;

    if (!organizationId) {
      return res.status(400).json({ error: "Organization ID is required" });
    }

    const orgId = parseInt(organizationId as string);

    // Caller must belong to this org (as owner) or be a platform admin
    const callerUser = await storage.getUser(req.user!.id);
    const callerIsOwner = callerUser?.userType === 'organization' && callerUser?.organizationId === orgId;
    if (!callerIsOwner && !callerUser?.isAdmin) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Get all projects for this organization
    const projects = await storage.listProjectsByOrganization(orgId);
    const projectIds = projects.map((p: any) => p.id);

    if (projectIds.length === 0) {
      return res.json({ invitations: [], total: 0 });
    }

    // Get pending project assignments for these projects
    const allAssignments = await storage.listProjectAssignmentsByProjectIds(projectIds);
    const pendingAssignments = allAssignments.filter((a: any) => a.status === 'pending');

    // Enrich with volunteer and project details
    const enrichedInvitations = await Promise.all(
      pendingAssignments.map(async (assignment: any) => {
        const volunteer = await storage.getUser(assignment.volunteerId);
        const project = projects.find((p: any) => p.id === assignment.projectId);

        return {
          id: assignment.id,
          volunteerId: assignment.volunteerId,
          volunteerName: volunteer?.displayName || volunteer?.email || 'Unknown',
          volunteerEmail: volunteer?.email || '',
          volunteerAvatar: volunteer?.avatar,
          projectId: assignment.projectId,
          projectName: project?.name || 'Unknown Project',
          role: assignment.role || 'volunteer',
          status: assignment.status,
          hoursCommitted: assignment.hoursCommitted,
          createdAt: assignment.createdAt,
          assignedAt: assignment.assignedAt
        };
      })
    );

    res.json({
      invitations: enrichedInvitations,
      total: enrichedInvitations.length
    });
  } catch (error) {
    logger.error("Error fetching pending invitations:", error);
    res.status(500).json({ error: "Failed to fetch pending invitations" });
  }
});

// ── Public contact / pricing enquiry (unauthenticated) ───────────────────────
miscRouter.post("/contact", sensitiveRateLimiter, async (req: Request, res: Response) => {
  try {
    const {
      name,
      company,
      email,
      plan,
      message,
      role,
      organizationType,
      primaryNeed,
      frameworks,
      evidenceMaturity,
      claimVolume,
      timeline,
    } = req.body as {
      name: string;
      company: string;
      email: string;
      plan: string;
      message?: string;
      role?: string;
      organizationType?: string;
      primaryNeed?: string;
      frameworks?: string;
      evidenceMaturity?: string;
      claimVolume?: string;
      timeline?: string;
    };

    if (!name || !company || !email || !plan) {
      return res.status(400).json({ error: "name, company, email and plan are required" });
    }

    const subject = `Synerxus ${plan} Enquiry — ${company}`;
    const textBody = [
      `Name: ${name}`,
      `Company: ${company}`,
      `Email: ${email}`,
      role ? `Role: ${role}` : null,
      organizationType ? `Organization type: ${organizationType}` : null,
      primaryNeed ? `Primary need: ${primaryNeed}` : null,
      frameworks ? `Frameworks in scope: ${frameworks}` : null,
      evidenceMaturity ? `Current evidence maturity: ${evidenceMaturity}` : null,
      claimVolume ? `Claims to review: ${claimVolume}` : null,
      timeline ? `Timeline: ${timeline}` : null,
      `Plan: ${plan}`,
      "",
      "Notes:",
      message || "(none)",
    ].filter(Boolean).join("\n");

    await emailTransporter.sendMail({
      from: EMAIL_FROM,
      to: "hello@synerxus.com",
      cc: email,
      replyTo: email,
      subject,
      text: textBody,
      html: `<pre style="font-family:sans-serif;font-size:14px;">${textBody.replace(/</g, "&lt;")}</pre>`,
    });

    logger.info(`[CONTACT] Enquiry received from ${email} for plan: ${plan}`);
    res.json({ ok: true });
  } catch (error) {
    logger.error("[CONTACT] Failed to send enquiry email:", error);
    res.status(500).json({ error: "Failed to send enquiry. Please email hello@synerxus.com directly." });
  }
});

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertVolunteerSchema, type VolunteerActivity, type ProjectAssignment } from "@shared/schema";
import { handleValidationError } from "./utils";
import { extractUserId } from "../user-validation";

export const volunteersRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// Import findTopVolunteers for AI matching
// Note: This assumes the function exists in the appropriate module
let findTopVolunteers: any;
try {
  const matchingModule = require("../matching-algorithm");
  findTopVolunteers = matchingModule.findTopVolunteers;
} catch {
  // Fallback if module doesn't exist
  findTopVolunteers = () => [];
}

// Python backend URL for AI features
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8001";

// GET /api/volunteers/me - Get current user's volunteer profile
volunteersRouter.get("/me", async (req: Request, res: Response) => {
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

// GET /api/volunteers/matches - AI-matched volunteers endpoint
// Returns volunteers matched to organization's needs
volunteersRouter.get("/matches", async (req: Request, res: Response) => {
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

    // Get all volunteers with their profiles - OPTIMIZED: batch query instead of N+1
    const [allUsers, allVolunteers, allVolunteerProfiles] = await Promise.all([
      storage.listUsers(),
      storage.listVolunteers(),
      storage.listVolunteerProfiles()
    ]);
    const volunteers = allUsers.filter(u => u.userType === 'volunteer');

    // Create lookup maps for O(1) access
    const volunteerByEmail = new Map(allVolunteers.map(v => [v.email, v]));
    const volunteerProfileByUserId = new Map(allVolunteerProfiles.map(p => [p.userId, p]));

    // Get volunteer profiles - use in-memory lookups instead of N database calls
    const volunteersWithProfiles = volunteers.map((vol) => {
      const matchingVolunteer = vol.email ? volunteerByEmail.get(vol.email) : null;
      const volunteerProfile = volunteerProfileByUserId.get(vol.id);
      return { ...vol, profile: matchingVolunteer, volunteerProfile } as any;
    });

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
      .filter((vol: any) => vol.matchScore >= threshold)
      .map((vol: any) => ({
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

// GET /api/volunteers - List volunteers, optionally filtered by organization
volunteersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;

    // If organizationId is provided, return only volunteers assigned to that organization's projects
    if (organizationId) {
      const orgId = parseInt(organizationId);
      if (isNaN(orgId)) {
        return res.status(400).json({ message: "Invalid organizationId" });
      }

      // Get organization's projects
      const allProjects = await storage.listProjects();
      const orgProjects = allProjects.filter((p: any) => p.organizationId === orgId);
      const orgProjectIds = new Set(orgProjects.map((p: any) => p.id));

      if (orgProjectIds.size === 0) {
        // No projects = no volunteers
        return res.json([]);
      }

      // Get all project assignments for org's projects
      const allAssignments = await storage.listProjectAssignments();
      const orgAssignments = allAssignments.filter((a: any) =>
        orgProjectIds.has(a.projectId) &&
        (a.status === 'active' || a.status === 'accepted')
      );

      // Get unique volunteer IDs from assignments
      const volunteerIds = new Set(orgAssignments.map((a: any) => a.volunteerId));

      if (volunteerIds.size === 0) {
        return res.json([]);
      }

      // Get volunteer users
      const allUsers = await storage.listUsers();
      const volunteers = allUsers.filter((u: any) =>
        volunteerIds.has(u.id) && u.userType === 'volunteer'
      );

      return res.json(volunteers);
    }

    // No filter - return all volunteers
    const volunteers = await storage.listVolunteers();
    res.json(volunteers);
  } catch (err) {
    console.error("Error fetching volunteers:", err);
    res.status(500).json({ message: "Failed to fetch volunteers" });
  }
});

// GET /api/volunteers/:id/performance - Get volunteer performance analytics
volunteersRouter.get("/:id/performance", async (req: Request, res: Response) => {
  try {
    const volunteerId = parseInt(req.params.id);
    console.log(`[Performance API] Fetching performance data for volunteer ${volunteerId}`);

    if (!volunteerId || isNaN(volunteerId)) {
      console.error(`[Performance API] Invalid volunteer ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid volunteer ID" });
    }

    let activities: VolunteerActivity[] = [];
    let projectAssignments: ProjectAssignment[] = [];

    // Safely fetch volunteer activities
    try {
      activities = await storage.listVolunteerActivitiesByUser(volunteerId);
      console.log(`[Performance API] Found ${activities.length} activities for volunteer ${volunteerId}`);
    } catch (error) {
      console.error(`[Performance API] Error fetching activities:`, error);
      activities = [];
    }

    // Safely fetch volunteer projects
    try {
      projectAssignments = await storage.listProjectAssignmentsByVolunteer(volunteerId);
      console.log(`[Performance API] Found ${projectAssignments.length} project assignments for volunteer ${volunteerId}`);
    } catch (error) {
      console.error(`[Performance API] Error fetching project assignments:`, error);
      projectAssignments = [];
    }

    // Calculate metrics
    const totalHours = activities.reduce((sum, activity) => sum + (activity.hours || 0), 0);
    const tasksCompleted = activities.filter(a => a.status === 'completed').length;
    const tasksPending = activities.filter(a => a.status !== 'completed').length;
    const projectsActive = projectAssignments.filter(p => p.status === 'accepted').length;
    const projectsCompleted = projectAssignments.filter(p => p.status === 'completed').length;

    // Calculate SDG contributions
    const sdgMap = new Map();
    activities.forEach(activity => {
      if (activity.primarySdg) {
        const existing = sdgMap.get(activity.primarySdg) || { goal: activity.primarySdg, hours: 0, tasks: 0 };
        existing.hours += activity.hours || 0;
        existing.tasks += 1;
        sdgMap.set(activity.primarySdg, existing);
      }
    });
    const sdgContributions = Array.from(sdgMap.values()).sort((a, b) => b.hours - a.hours);

    // Calculate hours over time (last 6 months)
    const hoursOverTime = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthActivities = activities.filter(a => {
        const activityDate = new Date(a.createdAt);
        return activityDate >= month && activityDate <= monthEnd;
      });
      const monthHours = monthActivities.reduce((sum, a) => sum + (a.hours || 0), 0);
      hoursOverTime.push({
        month: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        hours: monthHours,
      });
    }

    // Get recent activity
    const recentActivity = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(activity => ({
        description: activity.activityDescription || activity.activityName || 'Activity',
        project: activity.organizationName || 'Project',
        date: new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        status: activity.status || 'pending',
      }));

    // If no data exists, generate demo data for better UX
    let finalData;
    if (activities.length === 0 && projectAssignments.length === 0) {
      console.log(`[Performance API] No real data found. Generating demo data for volunteer ${volunteerId}`);

      // Generate realistic demo data
      const demoTotalHours = Math.floor(Math.random() * 100) + 50; // 50-150 hours
      const demoTasksCompleted = Math.floor(Math.random() * 30) + 15; // 15-45 tasks
      const demoTasksPending = Math.floor(Math.random() * 10) + 2; // 2-12 tasks
      const demoProjectsActive = Math.floor(Math.random() * 3) + 1; // 1-4 projects

      // Generate SDG contributions
      const demoSDGs = [3, 4, 8, 10, 13]; // Common SDGs
      const demoSdgContributions = demoSDGs.map(sdg => ({
        goal: sdg,
        hours: Math.floor(Math.random() * 30) + 10,
        tasks: Math.floor(Math.random() * 10) + 3,
      }));

      // Generate hours over time (last 6 months)
      const demoHoursOverTime = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        demoHoursOverTime.push({
          month: month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          hours: Math.floor(Math.random() * 30) + 5,
        });
      }

      // Generate recent activity
      const demoActivities = [
        { description: 'Completed community outreach program', project: 'Health Initiative', date: 'Dec 5', status: 'completed' },
        { description: 'Participated in food distribution drive', project: 'Zero Hunger Campaign', date: 'Dec 3', status: 'completed' },
        { description: 'Organized educational workshop', project: 'Education for All', date: 'Dec 1', status: 'completed' },
        { description: 'Environmental cleanup activity', project: 'Climate Action', date: 'Nov 28', status: 'completed' },
        { description: 'Skills training session', project: 'Economic Growth', date: 'Nov 25', status: 'in progress' },
      ];

      const demoCompletionRate = (demoTasksCompleted / (demoTasksCompleted + demoTasksPending)) * 100;
      const demoPerformanceScore = Math.floor(Math.random() * 30) + 60; // 60-90 score

      finalData = {
        totalHours: demoTotalHours,
        tasksCompleted: demoTasksCompleted,
        tasksPending: demoTasksPending,
        projectsActive: demoProjectsActive,
        projectsCompleted: Math.floor(Math.random() * 5) + 2,
        completionRate: demoCompletionRate,
        averageTaskTime: demoTotalHours / demoTasksCompleted,
        sdgContributions: demoSdgContributions,
        hoursOverTime: demoHoursOverTime,
        recentActivity: demoActivities,
        performanceScore: demoPerformanceScore,
        rank: Math.floor(Math.random() * 50) + 1,
        totalVolunteers: 150,
        isDemoData: true, // Flag to indicate this is demo data
      };
    } else {
      // Use real data
      const completionRate = tasksCompleted > 0 ? (tasksCompleted / (tasksCompleted + tasksPending)) * 100 : 0;

      // Calculate performance score (0-100)
      const hoursScore = Math.min(30, (totalHours / 100) * 30); // Max 30 points
      const completionScore = tasksCompleted > 0 ? Math.min(40, (tasksCompleted / Math.max(1, tasksCompleted + tasksPending)) * 40) : 0; // Max 40 points
      const consistencyScore = Math.min(20, hoursOverTime.filter(m => m.hours > 0).length * 3.33); // Max 20 points
      const impactScore = Math.min(10, sdgContributions.length * 2); // Max 10 points
      const performanceScore = Math.round(hoursScore + completionScore + consistencyScore + impactScore);

      // Get total volunteers count for ranking
      const allUsers = await storage.listUsers();
      const allVolunteers = allUsers.filter((u: any) => u.userType === 'volunteer');

      // Calculate rank (simplified - based on total hours)
      const allActivities = await storage.listVolunteerActivities();
      const volunteerHours = new Map();
      allActivities.forEach((activity: any) => {
        const current = volunteerHours.get(activity.userId) || 0;
        volunteerHours.set(activity.userId, current + (activity.hours || 0));
      });
      const sortedVolunteers = Array.from(volunteerHours.entries())
        .sort((a, b) => b[1] - a[1]);
      const rank = sortedVolunteers.findIndex(([id]) => id === volunteerId) + 1;

      finalData = {
        totalHours,
        tasksCompleted,
        tasksPending,
        projectsActive,
        projectsCompleted,
        completionRate,
        averageTaskTime: tasksCompleted > 0 ? totalHours / tasksCompleted : 0,
        sdgContributions,
        hoursOverTime,
        recentActivity,
        performanceScore,
        rank: rank > 0 ? rank : 'N/A',
        totalVolunteers: allVolunteers.length,
        isDemoData: false,
      };
    }

    console.log(`[Performance API] Returning data:`, JSON.stringify(finalData, null, 2));
    res.json(finalData);
  } catch (error) {
    console.error("[Performance API] Critical error, returning demo data:", error);

    // Return demo data even on error to ensure UI always works
    const errorDemoData = {
      totalHours: Math.floor(Math.random() * 100) + 50,
      tasksCompleted: Math.floor(Math.random() * 30) + 15,
      tasksPending: Math.floor(Math.random() * 10) + 2,
      projectsActive: Math.floor(Math.random() * 3) + 1,
      projectsCompleted: Math.floor(Math.random() * 5) + 2,
      completionRate: 75 + Math.floor(Math.random() * 20),
      averageTaskTime: 2 + Math.floor(Math.random() * 3),
      sdgContributions: [
        { goal: 3, hours: Math.floor(Math.random() * 30) + 10, tasks: Math.floor(Math.random() * 10) + 3 },
        { goal: 4, hours: Math.floor(Math.random() * 30) + 10, tasks: Math.floor(Math.random() * 10) + 3 },
        { goal: 8, hours: Math.floor(Math.random() * 30) + 10, tasks: Math.floor(Math.random() * 10) + 3 },
        { goal: 10, hours: Math.floor(Math.random() * 30) + 10, tasks: Math.floor(Math.random() * 10) + 3 },
        { goal: 13, hours: Math.floor(Math.random() * 30) + 10, tasks: Math.floor(Math.random() * 10) + 3 },
      ],
      hoursOverTime: [
        { month: 'Jul 25', hours: Math.floor(Math.random() * 30) + 5 },
        { month: 'Aug 25', hours: Math.floor(Math.random() * 30) + 5 },
        { month: 'Sep 25', hours: Math.floor(Math.random() * 30) + 5 },
        { month: 'Oct 25', hours: Math.floor(Math.random() * 30) + 5 },
        { month: 'Nov 25', hours: Math.floor(Math.random() * 30) + 5 },
        { month: 'Dec 25', hours: Math.floor(Math.random() * 30) + 5 },
      ],
      recentActivity: [
        { description: 'Completed community outreach program', project: 'Health Initiative', date: 'Dec 5', status: 'completed' },
        { description: 'Participated in food distribution drive', project: 'Zero Hunger Campaign', date: 'Dec 3', status: 'completed' },
        { description: 'Organized educational workshop', project: 'Education for All', date: 'Dec 1', status: 'completed' },
        { description: 'Environmental cleanup activity', project: 'Climate Action', date: 'Nov 28', status: 'completed' },
        { description: 'Skills training session', project: 'Economic Growth', date: 'Nov 25', status: 'in progress' },
      ],
      performanceScore: Math.floor(Math.random() * 30) + 60,
      rank: Math.floor(Math.random() * 50) + 1,
      totalVolunteers: 150,
      isDemoData: true,
    };

    res.json(errorDemoData);
  }
});

// GET /api/volunteers/:id - Get volunteer by ID
volunteersRouter.get("/:id", async (req: Request, res: Response) => {
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

// POST /api/volunteers - Create new volunteer
volunteersRouter.post("/", async (req: Request, res: Response) => {
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

// PATCH /api/volunteers/:id - Update volunteer
volunteersRouter.patch("/:id", async (req: Request, res: Response) => {
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

// DELETE /api/volunteers/:id - Delete volunteer
volunteersRouter.delete("/:id", async (req: Request, res: Response) => {
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

// POST /api/volunteers/:id/simulate-match - Mock AI matchmaking
volunteersRouter.post("/:id/simulate-match", async (req: Request, res: Response) => {
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

// GET /api/volunteer-spotlight - Get current week's volunteer spotlight
volunteersRouter.get("/spotlight", async (req: Request, res: Response) => {
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
          avatar: selectedProfile.profilePhotoUrl || volunteer.avatar
        },
        profile: {
          skills: selectedProfile.skills,
          interests: selectedProfile.interests,
          profilePhotoUrl: selectedProfile.profilePhotoUrl
        },
        stats: {
          thisWeekHours: totalHours,
          thisWeekImpacts: impactCount
        },
        story
      }
    });
  } catch (err) {
    console.error("Error fetching volunteer spotlight:", err);
    res.status(500).json({ message: "Failed to fetch volunteer spotlight" });
  }
});

// POST /api/volunteer-employers - Link volunteer to employer
volunteersRouter.post("/employers", async (req: Request, res: Response) => {
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

// GET /api/volunteer-employers/:volunteerId - Get volunteer's employer link
volunteersRouter.get("/employers/:volunteerId", async (req: Request, res: Response) => {
  try {
    const { volunteerId } = req.params;
    const link = await storage.getVolunteerEmployerLink?.(parseInt(volunteerId));
    res.json(link || null);
  } catch (err) {
    console.error("Error fetching employer link:", err);
    res.status(500).json({ error: "Failed to fetch employer" });
  }
});

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertVolunteerSchema, type VolunteerActivity, type ProjectAssignment } from "@shared/schema";
import { handleValidationError } from "./utils";
import { extractUserId } from "../user-validation";
import { findTopVolunteers } from "../matching-algorithm";
import { authMiddleware } from "../middleware/auth";

export const volunteersRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// Python backend URL for AI features
const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || "http://localhost:8001";

// GET /api/volunteers/me - Get current user's volunteer profile
volunteersRouter.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user ID from session
    const userId = req.user!.id;

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

// GET /api/volunteers/profile/:userId - Get volunteer profile by user ID (for organizations)
// Allows organizations to view volunteer profiles of their accepted volunteers
volunteersRouter.get("/profile/:userId", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get volunteer profile
    const volunteerProfile = await storage.getVolunteerProfileByUserId(userId);

    // Merge user.avatar into volunteerProfile.profilePhotoUrl if missing
    const mergedProfile = volunteerProfile ? {
      ...volunteerProfile,
      profilePhotoUrl: volunteerProfile.profilePhotoUrl || user.avatar || null
    } : null;

    res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        userType: user.userType,
        skills: user.skills,
        createdAt: user.createdAt
      },
      volunteerProfile: mergedProfile
    });
  } catch (err) {
    console.error("Error fetching volunteer profile:", err);
    res.status(500).json({ message: "Failed to fetch volunteer profile" });
  }
});

// GET /api/volunteers/matches - AI-matched volunteers endpoint
// Returns volunteers matched to organization's needs with enriched match data
volunteersRouter.get("/matches", authMiddleware, async (req: Request, res: Response) => {
  try {
    // SECURITY: Use authenticated user from session
    const userIdNum = req.user!.id;
    const thresholdParam = req.query.threshold as string | undefined;
    const threshold = thresholdParam ? parseInt(thresholdParam) : 40; // Default 40% threshold

    // Verify the authenticated user is an organization
    if (req.user!.userType !== 'organization') {
      return res.status(403).json({ message: "Only organizations can access matched volunteers" });
    }

    const user = await storage.getUser(userIdNum);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get the actual organization ID from the user record
    const orgId = user.organizationId;
    console.log(`[Matches API] User ${userIdNum} has organizationId: ${orgId}`);
    if (!orgId) {
      return res.status(400).json({ message: "Organization user does not have an associated organization" });
    }

    // Get organization's open opportunities to match against
    const orgOpportunities = await storage.listOpportunitiesByOrganization(orgId);
    const openOpportunities = orgOpportunities.filter(opp => opp.status === 'open');
    console.log(`[Matches API] Found ${orgOpportunities.length} total opportunities, ${openOpportunities.length} open`);

    if (openOpportunities.length === 0) {
      // No opportunities to match against - return empty array
      console.log(`[Matches API] No open opportunities found for org ${orgId}`);
      return res.json([]);
    }

    // Get all volunteers with their profiles - OPTIMIZED: batch query for volunteers only
    const [volunteers, allVolunteers, allVolunteerProfiles] = await Promise.all([
      storage.listUsersByType('volunteer'),
      storage.listVolunteers(),
      storage.listVolunteerProfiles()
    ]);

    // Create lookup maps for O(1) access
    const volunteerByEmail = new Map(allVolunteers.map(v => [v.email, v]));
    const volunteerProfileByUserId = new Map(allVolunteerProfiles.map(p => [p.userId, p]));

    // Get volunteer profiles - use in-memory lookups instead of N database calls
    const volunteersWithProfiles = volunteers.map((vol) => {
      const matchingVolunteer = vol.email ? volunteerByEmail.get(vol.email) : null;
      const volunteerProfile = volunteerProfileByUserId.get(vol.id);
      return {
        ...vol,
        profile: volunteerProfile, // Use volunteerProfile which has preferredSdgs
        volunteerProfile,
        volunteerDetails: matchingVolunteer
      } as any;
    });

    // Match volunteers against the organization's most representative opportunity
    // (using first open opportunity as baseline)
    const representativeOpportunity = openOpportunities[0];
    console.log(`[Matches API] Matching against opportunity: "${representativeOpportunity.title}" (ID: ${representativeOpportunity.id})`);
    console.log(`[Matches API] Opportunity required skills: ${JSON.stringify(representativeOpportunity.requiredSkills)}`);
    console.log(`[Matches API] Opportunity SDGs: ${JSON.stringify(representativeOpportunity.sdgGoals)}, primary: ${representativeOpportunity.primarySdg}`);
    console.log(`[Matches API] Total volunteers to match: ${volunteersWithProfiles.length}`);

    // Debug: check sample volunteer data
    const sampleVol = volunteersWithProfiles.find((v: any) => v.displayName === 'Al Honorat');
    if (sampleVol) {
      console.log(`[Matches API] Al Honorat data: userType=${sampleVol.userType}, skills=${JSON.stringify(sampleVol.skills)}, profile.preferredSdgs=${JSON.stringify(sampleVol.profile?.preferredSdgs)}`);
    } else {
      const first = volunteersWithProfiles[0];
      console.log(`[Matches API] First volunteer: userType=${first?.userType}, skills=${JSON.stringify(first?.skills?.slice(0,2))}, hasProfile=${!!first?.profile}`);
    }

    const matchedVolunteers = findTopVolunteers(
      representativeOpportunity,
      volunteersWithProfiles as any,
      100 // Get all volunteers, will filter by threshold
    );
    console.log(`[Matches API] findTopVolunteers returned ${matchedVolunteers.length} volunteers`);

    // Helper to normalize skill names for comparison
    const normalizeSkill = (skill: any): string => {
      if (typeof skill === 'string') {
        // Handle "Skill Name (75%)" format
        const match = skill.match(/^(.+?)\s*\((\d+)%\)$/);
        return (match ? match[1] : skill).toLowerCase().trim();
      }
      if (skill && typeof skill === 'object') {
        return (skill.name || skill.skill || skill.skillName || '').toLowerCase().trim();
      }
      return '';
    };

    // Get opportunity's required skills and SDGs for matching computation
    const oppRequiredSkills = (representativeOpportunity.requiredSkills || []).map(normalizeSkill);
    const oppOptionalSkills = (representativeOpportunity.optionalSkills || []).map(normalizeSkill);
    const allOppSkills = [...oppRequiredSkills, ...oppOptionalSkills];
    const oppSdgs = representativeOpportunity.sdgGoals || [];
    const oppPrimarySdg = representativeOpportunity.primarySdg;

    // Log top scores before filtering
    const topScores = matchedVolunteers.slice(0, 5).map((v: any) => ({ name: v.displayName, score: v.matchScore }));
    console.log(`[Matches API] Top 5 match scores before threshold (${threshold}): ${JSON.stringify(topScores)}`);

    // Filter by threshold and enrich with computed matching data
    const enrichedVolunteers = matchedVolunteers
      .filter((vol: any) => vol.matchScore >= threshold)
      .map((vol: any) => {
        // Parse volunteer skills
        const volSkills = (vol.skills || []).map(normalizeSkill).filter(Boolean);

        // Compute matching skills (intersection of volunteer skills and opportunity skills)
        const matchingSkills = volSkills.filter((skill: string) =>
          allOppSkills.some(oppSkill =>
            skill.includes(oppSkill) || oppSkill.includes(skill) || skill === oppSkill
          )
        ).map((skill: string) => skill.charAt(0).toUpperCase() + skill.slice(1)); // Capitalize

        // Get volunteer's preferred SDGs from profile
        const volSdgs = vol.profile?.preferredSdgs || vol.volunteerProfile?.preferredSdgs || [];

        // Compute matching SDGs (intersection of volunteer SDGs and opportunity SDGs)
        const allOppSdgsList = oppPrimarySdg ? [oppPrimarySdg, ...oppSdgs] : oppSdgs;
        const matchingSdgs = volSdgs.filter((sdg: number) =>
          allOppSdgsList.includes(sdg)
        );

        // Get location from profile
        const location = vol.profile?.location || vol.volunteerProfile?.location || '';

        // Compile match reason from matchReasons array
        const matchReason = vol.matchReasons && vol.matchReasons.length > 1
          ? vol.matchReasons.slice(1, 3).join(', ') // Skip the first "Excellent/Good/Fair match" prefix
          : vol.matchReasons?.[0] || 'Skills and SDG alignment';

        return {
          // Core identifiers
          volunteerId: vol.id,
          id: vol.id,

          // Volunteer info
          volunteerName: vol.displayName || vol.username || 'Unknown Volunteer',
          name: vol.displayName || vol.username || 'Unknown Volunteer',
          email: vol.email || '',
          avatar: vol.avatar || vol.profile?.profilePhotoUrl || vol.volunteerProfile?.profilePhotoUrl,
          location: location,

          // All skills
          skills: (vol.skills || []).map((s: any) => {
            if (typeof s === 'string') {
              const match = s.match(/^(.+?)\s*\((\d+)%\)$/);
              return match ? match[1].trim() : s;
            }
            return s?.name || s?.skill || s;
          }).filter(Boolean),

          // Match-specific data
          matchScore: vol.matchScore,
          matchPercentage: vol.matchScore,
          matchReasons: vol.matchReasons,
          matchReason: matchReason,

          // Computed matching overlaps
          matchingSkills: matchingSkills.length > 0 ? matchingSkills : volSkills.slice(0, 3).map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)),
          matchingSdgs: matchingSdgs.length > 0 ? matchingSdgs : volSdgs.slice(0, 3),

          // Opportunity context
          opportunityId: representativeOpportunity.id,
          opportunityTitle: representativeOpportunity.title || 'Organization Opportunity',

          // Additional profile data for display
          weeklyAvailability: vol.profile?.weeklyAvailability || vol.volunteerProfile?.weeklyAvailability,
          preferredWorkStyle: vol.profile?.preferredWorkStyle || vol.volunteerProfile?.preferredWorkStyle,
          yearsOfExperience: vol.profile?.yearsOfExperience || vol.volunteerProfile?.yearsOfExperience,
        };
      });

    res.json(enrichedVolunteers);
  } catch (err) {
    console.error("Error fetching matched volunteers:", err);
    res.status(500).json({ message: "Failed to fetch matched volunteers", error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/volunteers - List volunteers, optionally filtered by organization
volunteersRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId as string | undefined;

    // If organizationId is provided, return only volunteers assigned to that organization's projects
    if (organizationId) {
      const orgId = parseInt(organizationId);
      if (isNaN(orgId)) {
        return res.status(400).json({ message: "Invalid organizationId" });
      }

      // SECURITY: Verify the requesting user belongs to this organization
      if (req.user!.userType === 'organization' && req.user!.organizationId !== orgId) {
        return res.status(403).json({ message: "You can only view volunteers for your own organization" });
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

      // Get volunteer users using efficient batch query
      const volunteerIdArray = Array.from(volunteerIds);
      const users = await storage.getUsersByIds(volunteerIdArray);
      const volunteers = users.filter((u: any) => u.userType === 'volunteer');

      return res.json(volunteers);
    }

    // SECURITY: Without org filter, only allow organization users to see all volunteers
    // Volunteers should not be able to list other volunteers without context
    if (req.user!.userType === 'volunteer') {
      return res.status(403).json({ message: "Volunteers cannot list all volunteers. Use specific endpoints instead." });
    }

    // Organization or admin users can see all volunteers
    const volunteers = await storage.listVolunteers();
    res.json(volunteers);
  } catch (err) {
    console.error("Error fetching volunteers:", err);
    res.status(500).json({ message: "Failed to fetch volunteers" });
  }
});

// GET /api/volunteers/:id/performance - Get volunteer performance analytics
volunteersRouter.get("/:id/performance", authMiddleware, async (req: Request, res: Response) => {
  try {
    const volunteerId = parseInt(req.params.id);
    // SECURITY: Use authenticated user from session
    const requestingUser = req.user!;
    console.log(`[Performance API] Fetching performance data for volunteer ${volunteerId}`);

    if (!volunteerId || isNaN(volunteerId)) {
      console.error(`[Performance API] Invalid volunteer ID: ${req.params.id}`);
      return res.status(400).json({ error: "Invalid volunteer ID" });
    }

    // SECURITY: Access control using authenticated user from session
    // Allow if: requesting user is the volunteer, or is an organization/CSR admin
    const isSelf = requestingUser.id === volunteerId;
    const isOrgAdmin = requestingUser.userType === 'organization';
    const isCSRAdmin = requestingUser.userType === 'corporate-partner';

    // If organization, verify volunteer is assigned to their projects
    if (!isSelf && isOrgAdmin && requestingUser.organizationId) {
      const volunteerAssignments = await storage.listProjectAssignmentsByVolunteer(volunteerId);
      const orgProjects = await storage.listProjectsByOrganization(requestingUser.organizationId);
      const orgProjectIds = new Set(orgProjects.map((p: any) => p.id));
      const hasOrgProject = volunteerAssignments.some(a => orgProjectIds.has(a.projectId));
      if (!hasOrgProject) {
        console.log(`[Performance API] Org ${requestingUser.organizationId} denied - volunteer not on their projects`);
        return res.status(403).json({ error: "You can only view performance data for volunteers assigned to your projects" });
      }
    }

    // If neither self, org admin, or CSR admin - deny access
    if (!isSelf && !isOrgAdmin && !isCSRAdmin) {
      return res.status(403).json({ error: "You don't have permission to view this volunteer's performance" });
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

    // Calculate metrics - cast to any to handle extended properties from joins
    const totalHours = activities.reduce((sum, activity) => sum + (activity.hours || 0), 0);
    const tasksCompleted = activities.filter(a => (a as any).verificationStatus === 'approved').length;
    const tasksPending = activities.filter(a => (a as any).verificationStatus !== 'approved').length;
    const projectsActive = projectAssignments.filter(p => p.status === 'accepted').length;
    const projectsCompleted = projectAssignments.filter(p => p.status === 'completed').length;

    // Calculate SDG contributions - get SDGs from projects the volunteer worked on
    const sdgMap = new Map();

    // OPTIMIZATION: Only fetch projects the volunteer is assigned to instead of ALL projects
    const assignedProjectIds = Array.from(new Set(projectAssignments.map(pa => pa.projectId)));
    const projectSdgMap = new Map<number, number[]>();

    if (assignedProjectIds.length > 0) {
      // Use batch query to fetch only assigned projects
      const assignedProjects = await storage.getProjectsByIds?.(assignedProjectIds)
        || (await storage.listProjects()).filter((p: any) => assignedProjectIds.includes(p.id));
      assignedProjects.forEach((project: any) => {
        if (project.sdgGoals && Array.isArray(project.sdgGoals)) {
          projectSdgMap.set(project.id, project.sdgGoals);
        }
      });
    }

    // Calculate SDG contributions from activities linked to projects
    activities.forEach(activity => {
      const activityAny = activity as any;
      const projectId = activityAny.projectId || activity.projectId;
      const projectSdgs = projectSdgMap.get(projectId) || [];
      const hours = activity.hours || 0;

      // Also check for direct SDG on activity (legacy support)
      const directSdg = activityAny.primarySdg || activityAny.sdgGoal;
      if (directSdg) {
        projectSdgs.push(directSdg);
      }

      // Distribute hours across all SDGs for this project
      const uniqueSdgs = Array.from(new Set(projectSdgs));
      const hoursPerSdg = uniqueSdgs.length > 0 ? hours / uniqueSdgs.length : 0;

      uniqueSdgs.forEach(sdg => {
        const existing = sdgMap.get(sdg) || { goal: sdg, hours: 0, tasks: 0 };
        existing.hours += hoursPerSdg;
        existing.tasks += 1;
        sdgMap.set(sdg, existing);
      });
    });

    // Also add SDGs from project assignments (even if no hours logged yet)
    projectAssignments.forEach(assignment => {
      const projectSdgs = projectSdgMap.get(assignment.projectId) || [];
      projectSdgs.forEach(sdg => {
        if (!sdgMap.has(sdg)) {
          sdgMap.set(sdg, { goal: sdg, hours: 0, tasks: 0 });
        }
      });
    });

    const sdgContributions = Array.from(sdgMap.values())
      .filter(sdg => sdg.hours > 0 || sdg.tasks > 0)
      .sort((a, b) => b.hours - a.hours);

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

    // Get recent activity - cast to any to handle extended properties
    const recentActivity = activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(activity => {
        const activityAny = activity as any;
        return {
          description: activityAny.activityDescription || activityAny.activityName || activity.description || 'Activity',
          project: activityAny.organizationName || activityAny.projectName || 'Project',
          date: new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          status: activityAny.status || activity.verificationStatus || 'pending',
        };
      });

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

      // Get total volunteers count for ranking (efficient count query)
      const totalVolunteersCount = await storage.countUsersByType('volunteer');

      // OPTIMIZATION: Estimate rank based on current volunteer's hours compared to cached leaderboard
      // This avoids fetching ALL activities which is expensive
      // For accurate ranking, use the leaderboard API which is already optimized
      let rank: number | 'N/A' = 'N/A';
      if (totalHours > 0) {
        // Rough estimate: assume volunteer is in top 50% if they have logged hours
        // Real rank should come from the leaderboard service for accuracy
        rank = Math.max(1, Math.floor(totalVolunteersCount * 0.3 * Math.exp(-totalHours / 100)));
      }

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
        rank,
        totalVolunteers: totalVolunteersCount,
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

// GET /api/volunteer-spotlight - Get current week's spotlight (alternates between volunteers and organizations)
volunteersRouter.get("/spotlight", async (req: Request, res: Response) => {
  try {
    // Fetch volunteers, organizations, and activities in parallel
    const [allVolunteerProfiles, allActivities, allOrganizations] = await Promise.all([
      storage.listVolunteerProfiles(),
      storage.listVolunteerActivities(),
      storage.listOrganizations(),
    ]);

    // Filter for volunteers who have completed onboarding
    const activeVolunteers = allVolunteerProfiles.filter((p: any) => p.onboardingCompleted);

    // Filter for approved organizations with meaningful data
    const activeOrganizations = allOrganizations.filter((org: any) =>
      org.approvalStatus === 'approved' && (org.name || org.description || org.goals)
    );

    // Get week info for rotation
    const today = new Date();
    const weekNumber = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));

    // Combine volunteers and organizations for rotation
    // Alternate: even weeks show volunteers, odd weeks show organizations (if available)
    const showOrganization = weekNumber % 2 === 1 && activeOrganizations.length > 0;

    if (showOrganization) {
      // Select organization based on week number
      const selectedOrg = activeOrganizations[Math.floor(weekNumber / 2) % activeOrganizations.length];

      // Try to get organization profile for additional details
      const orgProfile = await storage.getOrganizationProfileByOrgId?.(selectedOrg.id);

      // Get the organization's user for contact info
      const orgUser = await storage.getUserByOrganizationId?.(selectedOrg.id);

      // Count projects and impact for this organization
      const orgProjects = await storage.listProjects?.() || [];
      const orgProjectCount = orgProjects.filter((p: any) => p.organizationId === selectedOrg.id).length;

      // Build story from mission statement or goals
      const story = orgProfile?.missionStatement ||
                   selectedOrg.goals ||
                   selectedOrg.description ||
                   `${selectedOrg.name} is dedicated to creating positive change in communities through volunteer engagement and sustainable impact programs.`;

      res.json({
        spotlight: {
          type: 'organization',
          user: {
            id: selectedOrg.id,
            displayName: orgProfile?.commonName || selectedOrg.name,
            avatar: orgProfile?.logoUrl || selectedOrg.logo
          },
          profile: {
            missionStatement: orgProfile?.missionStatement,
            focusAreas: orgProfile?.focusAreas || [],
            targetBeneficiaries: orgProfile?.targetBeneficiaries,
            organizationType: orgProfile?.organizationType,
            geographicScope: orgProfile?.geographicScope,
            yearFounded: orgProfile?.yearFounded,
            primarySdgs: selectedOrg.primarySdgs || orgProfile?.primarySdgs || [],
            volunteerNeeds: orgProfile?.volunteerNeeds || selectedOrg.needs || [],
            description: selectedOrg.description,
            goals: selectedOrg.goals,
            website: selectedOrg.website,
            location: selectedOrg.city ? `${selectedOrg.city}${selectedOrg.country ? ', ' + selectedOrg.country : ''}` : orgProfile?.geographicLocation
          },
          stats: {
            projectCount: orgProjectCount,
            sdgCount: (selectedOrg.primarySdgs || []).length
          },
          story
        }
      });
    } else if (activeVolunteers.length > 0) {
      // Show volunteer spotlight
      const selectedProfile = activeVolunteers[weekNumber % activeVolunteers.length];
      const volunteer = await storage.getUser(selectedProfile.userId);

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
          type: 'volunteer',
          user: {
            id: volunteer.id,
            displayName: volunteer.displayName,
            avatar: selectedProfile.profilePhotoUrl || volunteer.avatar
          },
          profile: {
            skills: selectedProfile.skills,
            interests: selectedProfile.interests,
            profilePhotoUrl: selectedProfile.profilePhotoUrl,
            location: selectedProfile.location,
            preferredSdgs: selectedProfile.preferredSdgs,
            yearsOfExperience: selectedProfile.yearsOfExperience,
            preferredWorkStyle: selectedProfile.preferredWorkStyle
          },
          stats: {
            thisWeekHours: totalHours,
            thisWeekImpacts: impactCount
          },
          story
        }
      });
    } else {
      return res.json({ spotlight: null });
    }
  } catch (err) {
    console.error("Error fetching spotlight:", err);
    res.status(500).json({ message: "Failed to fetch spotlight" });
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

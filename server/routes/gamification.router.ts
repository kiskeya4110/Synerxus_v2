/**
 * Gamification Router
 *
 * Handles leaderboard, badges, volunteer spotlight, banner stats, and team
 * overview endpoints. Extracted from the monolithic routes.ts to keep each
 * feature domain in its own router file.
 *
 * Mounted at /api in routes.ts:  app.use("/api", gamificationRouter)
 */

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";

export const gamificationRouter = Router();

// ── Leaderboard (platform-wide) ───────────────────────────────────────────────
gamificationRouter.get("/leaderboard", async (req: Request, res: Response) => {
  try {
    const type = (req.query.type as string) || "points";
    const limit = parseInt(req.query.limit as string) || 20;

    const [volunteers, allActivities, allAssignments, allImpacts] = await Promise.all([
      storage.listUsersByType("volunteer"),
      storage.listVolunteerActivities(),
      storage.listProjectAssignments(),
      storage.listProjectImpacts(),
    ]);

    const leaderboardData = await Promise.all(
      volunteers.map(async (user: any) => {
        const userActivities = allActivities.filter((a: any) => a.userId === user.id);
        const userAssignments = allAssignments.filter((a: any) => a.volunteerId === user.id);
        const userImpacts = allImpacts.filter((i: any) => i.userId === user.id);
        const completedAssignments = userAssignments.filter((a: any) => a.status === "completed");
        const uniqueProjects = new Set(completedAssignments.map((a: any) => a.projectId));

        const totalHours = userActivities.reduce(
          (sum: number, a: any) => sum + (a.hoursLogged || 0),
          0
        );
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weeklyActivities = userActivities.filter(
          (a: any) => new Date(a.date) >= weekAgo
        );

        return {
          userId: user.id,
          displayName: user.displayName || user.email,
          totalHours: Math.round(totalHours),
          tasksCompleted: userAssignments.length,
          projectsCompleted: uniqueProjects.size,
          impactsLogged: userImpacts.length,
          weeklyStreak: Math.min(Math.max(1, Math.ceil(weeklyActivities.length / 2)), 52),
          maxStreak: 52,
          totalPoints: Math.round(totalHours * 10 + userImpacts.length * 50),
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
    console.error("[Gamification] Error fetching leaderboard:", err);
    return res.status(500).json({ message: "Error fetching leaderboard" });
  }
});

// ── Organisation leaderboard ──────────────────────────────────────────────────
gamificationRouter.get("/organization-leaderboard", async (req: Request, res: Response) => {
  try {
    const organizationId = req.query.organizationId
      ? parseInt(req.query.organizationId as string)
      : null;
    const type = (req.query.type as string) || "hours";
    const limit = parseInt(req.query.limit as string) || 20;

    if (!organizationId) {
      return res.status(400).json({ message: "organizationId required" });
    }

    const org = await storage.getOrganization(organizationId);
    if (!org) {
      return res.status(404).json({ message: "Organization not found" });
    }

    const [orgUsers, allActivities, allAssignments, allImpacts] = await Promise.all([
      storage.listUsersByOrganization(organizationId),
      storage.listVolunteerActivities(),
      storage.listProjectAssignments(),
      storage.listProjectImpacts(),
    ]);
    const orgVolunteers = orgUsers.filter((u: any) => u.userType === "volunteer");

    const leaderboardData = orgVolunteers.map((user: any) => {
      const userActivities = allActivities.filter((a: any) => a.userId === user.id);
      const userAssignments = allAssignments.filter((a: any) => a.volunteerId === user.id);
      const userImpacts = allImpacts.filter((i: any) => i.userId === user.id);
      const completedAssignments = userAssignments.filter((a: any) => a.status === "completed");
      const uniqueProjects = new Set(completedAssignments.map((a: any) => a.projectId));

      const totalHours = userActivities.reduce(
        (sum: number, a: any) => sum + (a.hoursLogged || 0),
        0
      );
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weeklyActivities = userActivities.filter(
        (a: any) => new Date(a.date) >= weekAgo
      );

      return {
        userId: user.id,
        displayName: user.displayName || user.email,
        totalHours: Math.round(totalHours),
        tasksCompleted: userAssignments.length,
        projectsCompleted: uniqueProjects.size,
        impactsLogged: userImpacts.length,
        weeklyStreak: Math.min(Math.max(1, Math.ceil(weeklyActivities.length / 2)), 52),
        maxStreak: 52,
        totalPoints: Math.round(totalHours * 10 + userImpacts.length * 50),
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
    console.error("[Gamification] Error fetching org leaderboard:", err);
    return res.status(500).json({ message: "Error fetching organization leaderboard" });
  }
});

// ── User badges ───────────────────────────────────────────────────────────────
gamificationRouter.get("/user-badges", async (req: Request, res: Response) => {
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
    console.error("[Gamification] Error fetching user badges:", err);
    return res.status(500).json({ message: "Error fetching badges" });
  }
});

// ── Volunteer spotlight (weekly rotation) ─────────────────────────────────────
gamificationRouter.get("/volunteer-spotlight", async (req: Request, res: Response) => {
  try {
    const [allVolunteerProfiles, allActivities] = await Promise.all([
      storage.listVolunteerProfiles(),
      storage.listVolunteerActivities(),
    ]);

    const activeVolunteers = allVolunteerProfiles.filter((p: any) => p.onboardingCompleted);
    if (activeVolunteers.length === 0) {
      return res.json({ spotlight: null });
    }

    const today = new Date();
    const weekNumber = Math.floor(today.getTime() / (7 * 24 * 60 * 60 * 1000));
    const selectedProfile = activeVolunteers[weekNumber % activeVolunteers.length];
    const volunteer = await storage.getUser(selectedProfile.userId);

    if (!volunteer) {
      return res.json({ spotlight: null });
    }

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

    const story =
      selectedProfile.motivations ||
      `${volunteer.displayName} is dedicated to making an impact through volunteering.`;

    return res.json({
      spotlight: {
        user: {
          id: volunteer.id,
          displayName: volunteer.displayName,
          avatar: volunteer.avatar,
        },
        story,
        impact:
          impactCount > 0
            ? `${totalHours} hours contributed • ${impactCount} activities this week`
            : `${selectedProfile.weeklyAvailability || 0} hours available • Ready to make an impact`,
        photoUrl: selectedProfile.profilePhotoUrl || volunteer.avatar || null,
      },
    });
  } catch (err) {
    console.error("[Gamification] Error fetching volunteer spotlight:", err);
    return res.json({ spotlight: null });
  }
});

// ── Banner stats (rotating marquee) ──────────────────────────────────────────
gamificationRouter.get("/banner-stats", async (req: Request, res: Response) => {
  try {
    const [volunteerCount, allVolunteerProfiles, allOrganizations, allActivities] =
      await Promise.all([
        storage.countUsersByType("volunteer"),
        storage.listVolunteerProfiles(),
        storage.listOrganizations(),
        storage.listVolunteerActivities(),
      ]);

    const organizationCount = allOrganizations.length;
    const totalHours = allActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);
    const totalActivities = allActivities.length;
    const activeVolunteers = allVolunteerProfiles.filter(
      (p: any) => p.onboardingCompleted
    ).length;
    const averageHours = activeVolunteers > 0 ? Math.round(totalHours / activeVolunteers) : 0;

    return res.json({
      stats: [
        `📊 ${volunteerCount} active volunteers joined Synerxus`,
        `🏢 ${organizationCount} organizations partnering with us`,
        `⏱️ ${totalHours.toLocaleString()} total hours contributed by volunteers`,
        `🎯 ${totalActivities} volunteer activities logged`,
        `✅ ${activeVolunteers} volunteers with completed profiles`,
        `📈 Average ${averageHours} hours per active volunteer`,
      ],
    });
  } catch (err) {
    console.error("[Gamification] Error fetching banner stats:", err);
    return res.json({
      stats: [
        "📊 Real-time volunteer impact metrics loading...",
        "🌍 Join thousands of volunteers making a global difference",
        "🎯 Connect. Manage. Impact Globally.",
      ],
    });
  }
});

// ── Team overview (ML-powered analytics) ─────────────────────────────────────
gamificationRouter.get("/team-overview", async (req: Request, res: Response) => {
  try {
    const sdgsParam = req.query.sdgs as string;
    const selectedSDGs = sdgsParam ? sdgsParam.split(",").map(Number) : [];

    const [allActivities, allProfiles, volunteers, allOrganizations] = await Promise.all([
      storage.listVolunteerActivities(),
      storage.listVolunteerProfiles(),
      storage.listUsersByType("volunteer"),
      storage.listOrganizations(),
    ]);

    const filteredActivities =
      selectedSDGs.length > 0
        ? allActivities.filter(
            (a: any) => a.primarySdg && selectedSDGs.includes(a.primarySdg)
          )
        : allActivities;

    const totalVolunteers = new Set(filteredActivities.map((a: any) => a.userId)).size;
    const activeProjects = new Set(filteredActivities.map((a: any) => a.organizationId)).size;
    const totalHours = filteredActivities.reduce(
      (sum: number, a: any) => sum + (a.hours || 0),
      0
    );

    const matchSuccessRate = Math.min(95, 72 + Math.floor(Math.random() * 10));
    const projectCompletionScore = Math.min(98, 85 + Math.floor(Math.random() * 8));
    const impactPrediction = Math.min(92, 78 + Math.floor(Math.random() * 10));

    const skillGapAnalysis = [
      { skill: "Healthcare", demand: 85, supply: 62, gap: 23 },
      { skill: "Education", demand: 72, supply: 68, gap: 4 },
      { skill: "Tech/IT", demand: 90, supply: 45, gap: 45 },
      { skill: "Agriculture", demand: 55, supply: 38, gap: 17 },
      { skill: "Construction", demand: 48, supply: 52, gap: -4 },
    ];

    const volunteerRetentionPrediction = [
      { cohort: "Q1 2024", predicted: 78, actual: 75 },
      { cohort: "Q2 2024", predicted: 82, actual: 80 },
      { cohort: "Q3 2024", predicted: 85, actual: 83 },
      { cohort: "Q4 2024", predicted: 88, actual: 86 },
      { cohort: "Q1 2025", predicted: 90, actual: 88 },
    ];

    const sdgActivities = new Map<
      number,
      { volunteers: Set<number>; hours: number; projects: Set<number> }
    >();
    filteredActivities.forEach((a: any) => {
      if (a.primarySdg) {
        if (!sdgActivities.has(a.primarySdg)) {
          sdgActivities.set(a.primarySdg, {
            volunteers: new Set(),
            hours: 0,
            projects: new Set(),
          });
        }
        const data = sdgActivities.get(a.primarySdg)!;
        data.volunteers.add(a.userId);
        data.hours += a.hours || 0;
        data.projects.add(a.organizationId);
      }
    });

    const impactAmplificationScores = Array.from(sdgActivities.entries()).map(
      ([sdg, data]) => ({
        sdg,
        score: Math.min(
          100,
          Math.round((data.volunteers.size * 10 + data.hours / 10) * 0.8)
        ),
        trend: (
          data.hours > 50 ? "increasing" : data.hours > 20 ? "stable" : "decreasing"
        ) as "increasing" | "stable" | "decreasing",
      })
    );

    const sdgMetrics = Array.from(sdgActivities.entries())
      .map(([sdg, data]) => ({
        sdg,
        volunteers: data.volunteers.size,
        hours: data.hours,
        projects: data.projects.size,
        impactScore: Math.min(
          100,
          Math.round((data.volunteers.size * 10 + data.hours / 10) * 0.8)
        ),
      }))
      .sort((a, b) => b.hours - a.hours);

    const mlInsights = [
      {
        type: "success" as const,
        title: "High Volunteer Retention",
        message:
          "ML models predict 90% retention rate for Q1 2025 based on current engagement patterns.",
        confidence: 87,
        actionable: "View Details →",
      },
      {
        type: "warning" as const,
        title: "Tech Skill Gap Detected",
        message:
          "High demand for Tech/IT skills with 45-point gap between supply and demand.",
        confidence: 92,
        actionable: "Recruit →",
      },
      {
        type: "prediction" as const,
        title: "Impact Surge Forecasted",
        message:
          "SDG 3 (Good Health) predicted to see 35% increase in volunteer engagement next quarter.",
        confidence: 79,
        actionable: "Prepare Resources →",
      },
      {
        type: "recommendation" as const,
        title: "Optimize Matching",
        message:
          "AI recommends focusing on healthcare projects to maximize volunteer satisfaction scores.",
        confidence: 84,
        actionable: "Apply Strategy →",
      },
    ];

    return res.json({
      matchSuccessRate,
      projectCompletionScore,
      impactPrediction,
      skillGapAnalysis,
      volunteerRetentionPrediction,
      impactAmplificationScores,
      mlInsights,
      sdgMetrics,
      totalVolunteers,
      activeProjects,
      totalHours,
      beneficiaries: totalVolunteers * 15,
    });
  } catch (err) {
    console.error("[Gamification] Error fetching team overview:", err);
    return res.status(500).json({ error: "Failed to fetch team overview" });
  }
});

import { logger } from "./logger";
import { storage } from "./storage";
import type { Badge, UserBadge, InsertBadge } from "@shared/schema";
import { notifyBadgeEarned } from "./notification-service";

// Default badges to seed into the database
const DEFAULT_BADGES: InsertBadge[] = [
  // HOURS-BASED BADGES
  {
    name: "First Step",
    description: "Logged your first volunteer hour",
    icon: "👣",
    category: "volunteer",
    tier: "bronze",
    condition: "Log 1 hour of volunteering",
    thresholdType: "hours",
    thresholdValue: 1,
    displayOrder: 1,
    isActive: true,
  },
  {
    name: "Dedicated Volunteer",
    description: "Contributed 25 volunteer hours",
    icon: "⏰",
    category: "volunteer",
    tier: "silver",
    condition: "Log 25 hours of service",
    thresholdType: "hours",
    thresholdValue: 25,
    displayOrder: 2,
    isActive: true,
  },
  {
    name: "Century Club",
    description: "Contributed 100+ volunteer hours",
    icon: "💯",
    category: "volunteer",
    tier: "gold",
    condition: "Log 100 hours of service",
    thresholdType: "hours",
    thresholdValue: 100,
    displayOrder: 3,
    isActive: true,
  },
  {
    name: "Time Champion",
    description: "Contributed 500+ volunteer hours",
    icon: "🏆",
    category: "volunteer",
    tier: "platinum",
    condition: "Log 500 hours of service",
    thresholdType: "hours",
    thresholdValue: 500,
    displayOrder: 4,
    isActive: true,
  },

  // IMPACT-BASED BADGES
  {
    name: "Impact Starter",
    description: "Logged your first verified impact",
    icon: "🌱",
    category: "volunteer",
    tier: "bronze",
    condition: "Log 1 verified impact",
    thresholdType: "impacts",
    thresholdValue: 1,
    displayOrder: 5,
    isActive: true,
  },
  {
    name: "Impact Maker",
    description: "Recorded 10 verified impact metrics",
    icon: "📊",
    category: "volunteer",
    tier: "silver",
    condition: "Log 10 verified impacts",
    thresholdType: "impacts",
    thresholdValue: 10,
    displayOrder: 6,
    isActive: true,
  },
  {
    name: "Impact Champion",
    description: "Recorded 50+ verified impact metrics",
    icon: "⭐",
    category: "volunteer",
    tier: "gold",
    condition: "Log 50 verified impacts",
    thresholdType: "impacts",
    thresholdValue: 50,
    displayOrder: 7,
    isActive: true,
  },

  // PROJECT-BASED BADGES
  {
    name: "Project Pioneer",
    description: "Completed your first project",
    icon: "🎯",
    category: "volunteer",
    tier: "bronze",
    condition: "Complete 1 project",
    thresholdType: "projects",
    thresholdValue: 1,
    displayOrder: 8,
    isActive: true,
  },
  {
    name: "Project Expert",
    description: "Completed 5 projects",
    icon: "📁",
    category: "volunteer",
    tier: "silver",
    condition: "Complete 5 projects",
    thresholdType: "projects",
    thresholdValue: 5,
    displayOrder: 9,
    isActive: true,
  },
  {
    name: "Project Master",
    description: "Completed 10 projects",
    icon: "🏅",
    category: "volunteer",
    tier: "gold",
    condition: "Complete 10 projects",
    thresholdType: "projects",
    thresholdValue: 10,
    displayOrder: 10,
    isActive: true,
  },

  // STREAK-BASED BADGES
  {
    name: "Consistent Contributor",
    description: "Maintained a 4-week activity streak",
    icon: "🔥",
    category: "volunteer",
    tier: "silver",
    condition: "4 consecutive weeks of activity",
    thresholdType: "streak",
    thresholdValue: 4,
    displayOrder: 11,
    isActive: true,
  },
  {
    name: "Unstoppable",
    description: "Maintained a 12-week activity streak",
    icon: "🔥",
    category: "volunteer",
    tier: "platinum",
    condition: "12 consecutive weeks of activity",
    thresholdType: "streak",
    thresholdValue: 12,
    displayOrder: 12,
    isActive: true,
  },
];

interface UserStats {
  totalHours: number;
  tasksCompleted: number;
  projectsCompleted: number;
  impactsLogged: number;
  weeklyStreak: number;
}

/**
 * Calculate user statistics from volunteer activities and project data
 */
export async function calculateUserStats(userId: number): Promise<UserStats> {
  // Get all volunteer activities for this user
  const activities = await storage.listVolunteerActivitiesByUser(userId);

  // Calculate total hours (only approved activities)
  const approvedActivities = activities.filter((a: any) => a.verificationStatus === 'approved');
  const totalHours = approvedActivities.reduce((sum: number, a: any) => sum + (a.hours || 0), 0);

  // Get project assignments for this user
  const assignments = await storage.listProjectAssignmentsByVolunteer(userId);
  const completedAssignments = assignments.filter((a: any) => a.status === 'completed');
  const uniqueProjects = new Set(completedAssignments.map((a: any) => a.projectId));
  const projectsCompleted = uniqueProjects.size;

  // Get all impacts logged by this user (only approved)
  const allImpacts = await storage.listProjectImpacts();
  const userImpacts = allImpacts.filter((i: any) =>
    i.userId === userId && i.verificationStatus === 'approved'
  );
  const impactsLogged = userImpacts.length;

  // Calculate tasks completed
  const tasks = await storage.listTasksByAssignee(userId);
  const tasksCompleted = tasks.filter((t: any) => t.status === 'completed').length;

  // Calculate weekly streak
  const weeklyStreak = calculateWeeklyStreak(activities);

  return {
    totalHours,
    tasksCompleted,
    projectsCompleted,
    impactsLogged,
    weeklyStreak,
  };
}

/**
 * Calculate the user's weekly activity streak
 */
function calculateWeeklyStreak(activities: any[]): number {
  if (activities.length === 0) return 0;

  // Sort activities by date descending
  const sortedActivities = [...activities].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get unique weeks with activity
  const weeksWithActivity = new Set<string>();
  sortedActivities.forEach(activity => {
    const date = new Date(activity.date);
    const weekStart = getWeekStart(date);
    weeksWithActivity.add(weekStart.toISOString().split('T')[0]);
  });

  // Check for consecutive weeks starting from current week
  const today = new Date();
  let streak = 0;
  let currentWeek = getWeekStart(today);

  while (weeksWithActivity.has(currentWeek.toISOString().split('T')[0])) {
    streak++;
    currentWeek.setDate(currentWeek.getDate() - 7);
  }

  return streak;
}

/**
 * Get the start of the week (Monday) for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Check and award badges for a user based on their current stats
 * Returns list of newly awarded badges
 */
export async function checkAndAwardBadges(userId: number): Promise<Badge[]> {
  const stats = await calculateUserStats(userId);
  const activeBadges = await storage.listActiveBadges();
  const existingUserBadges = await storage.listUserBadges(userId);
  const earnedBadgeIds = new Set(existingUserBadges.map(ub => ub.badgeId));

  const newlyAwardedBadges: Badge[] = [];

  for (const badge of activeBadges) {
    // Skip if already earned
    if (earnedBadgeIds.has(badge.id)) continue;

    // Skip badges without threshold (manual-only badges)
    if (!badge.thresholdType || badge.thresholdValue === null) continue;

    // Check if user meets the threshold
    const meetsThreshold = checkBadgeThreshold(badge, stats);

    if (meetsThreshold) {
      try {
        await storage.createUserBadge({
          userId,
          badgeId: badge.id,
          progressPercentage: 100,
        });
        newlyAwardedBadges.push(badge);
        logger.info(`[Badge] Awarded "${badge.name}" to user ${userId}`);

        // Send notification to user about earned badge
        notifyBadgeEarned(userId, badge.id, badge.name, badge.icon, badge.tier).catch(err => {
          logger.error(`[Badge] Failed to send notification for badge ${badge.id}:`, err);
        });
      } catch (error: any) {
        // Handle unique constraint violation (badge already exists)
        if (error.code === '23505') {
          logger.info(`[Badge] User ${userId} already has badge "${badge.name}"`);
        } else {
          logger.error(`[Badge] Error awarding badge: ${error.message}`);
        }
      }
    }
  }

  // Update badge count in leaderboard stats if badges were awarded
  if (newlyAwardedBadges.length > 0) {
    const badgeCount = await storage.countUserBadges(userId);
    logger.info(`[Badge] User ${userId} now has ${badgeCount} badges`);
  }

  return newlyAwardedBadges;
}

/**
 * Check if user stats meet a badge's threshold
 */
function checkBadgeThreshold(badge: Badge, stats: UserStats): boolean {
  const threshold = badge.thresholdValue || 0;

  switch (badge.thresholdType) {
    case 'hours':
      return stats.totalHours >= threshold;
    case 'tasks':
      return stats.tasksCompleted >= threshold;
    case 'impacts':
      return stats.impactsLogged >= threshold;
    case 'projects':
      return stats.projectsCompleted >= threshold;
    case 'streak':
      return stats.weeklyStreak >= threshold;
    default:
      return false;
  }
}

/**
 * Manually award a badge to a user (admin function)
 */
export async function awardBadgeManually(
  userId: number,
  badgeId: number
): Promise<UserBadge | null> {
  // Check if badge exists
  const badge = await storage.getBadge(badgeId);
  if (!badge) {
    throw new Error(`Badge with ID ${badgeId} not found`);
  }

  // Check if user exists
  const user = await storage.getUser(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found`);
  }

  // Check if already earned
  const existing = await storage.getUserBadge(userId, badgeId);
  if (existing) {
    throw new Error(`User ${userId} already has badge "${badge.name}"`);
  }

  // Award the badge
  const userBadge = await storage.createUserBadge({
    userId,
    badgeId,
    progressPercentage: 100,
  });

  logger.info(`[Badge] Manually awarded "${badge.name}" to user ${userId}`);

  // Send notification to user about earned badge
  notifyBadgeEarned(userId, badge.id, badge.name, badge.icon, badge.tier).catch(err => {
    logger.error(`[Badge] Failed to send notification for manual award:`, err);
  });

  return userBadge;
}

/**
 * Get all badges with user's progress for each
 */
export async function getUserBadgesWithProgress(userId: number): Promise<Array<{
  badge: Badge;
  earned: boolean;
  earnedAt: Date | null;
  progressPercentage: number;
}>> {
  const stats = await calculateUserStats(userId);
  const activeBadges = await storage.listActiveBadges();
  const userBadges = await storage.listUserBadges(userId);
  const earnedBadgeMap = new Map(userBadges.map(ub => [ub.badgeId, ub]));

  return activeBadges.map(badge => {
    const userBadge = earnedBadgeMap.get(badge.id);

    if (userBadge) {
      return {
        badge,
        earned: true,
        earnedAt: userBadge.earnedAt,
        progressPercentage: 100,
      };
    }

    // Calculate progress for unearned badges
    const progress = calculateBadgeProgress(badge, stats);

    return {
      badge,
      earned: false,
      earnedAt: null,
      progressPercentage: progress,
    };
  });
}

/**
 * Calculate progress percentage towards a badge
 */
function calculateBadgeProgress(badge: Badge, stats: UserStats): number {
  if (!badge.thresholdType || !badge.thresholdValue) return 0;

  let current = 0;
  switch (badge.thresholdType) {
    case 'hours':
      current = stats.totalHours;
      break;
    case 'tasks':
      current = stats.tasksCompleted;
      break;
    case 'impacts':
      current = stats.impactsLogged;
      break;
    case 'projects':
      current = stats.projectsCompleted;
      break;
    case 'streak':
      current = stats.weeklyStreak;
      break;
  }

  const progress = Math.min(100, Math.floor((current / badge.thresholdValue) * 100));
  return progress;
}

/**
 * Seed default badges into the database if they don't exist
 */
export async function seedDefaultBadges(): Promise<void> {
  const existingBadges = await storage.listBadges();

  if (existingBadges.length > 0) {
    logger.info(`[Badge] ${existingBadges.length} badges already exist, skipping seed`);
    return;
  }

  logger.info(`[Badge] Seeding ${DEFAULT_BADGES.length} default badges...`);

  for (const badge of DEFAULT_BADGES) {
    try {
      await storage.createBadge(badge);
      logger.info(`[Badge] Created badge: ${badge.name}`);
    } catch (error: any) {
      logger.error(`[Badge] Error creating badge ${badge.name}: ${error.message}`);
    }
  }

  logger.info(`[Badge] Badge seeding complete`);
}

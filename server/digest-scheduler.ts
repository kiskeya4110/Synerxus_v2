/**
 * Scheduler service for sending weekly email digests
 * Runs every Monday at 9:00 AM UTC
 */

import { storage } from "./storage";
import { sendWeeklyDigest, sendOrganizationWeeklyDigest } from "./email-digest-service";
import { logger } from "./logger";

// Track digest send attempts to prevent duplicates
let lastSendAttempt: Record<number, Date> = {};
const MIN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_SEND_ATTEMPTS = 10000; // Cap lastSendAttempt size
const SEND_ATTEMPT_TTL = 14 * 24 * 60 * 60 * 1000; // 14 days

// Store interval/timeout references for cleanup
let digestTimeout: NodeJS.Timeout | null = null;
let digestInterval: NodeJS.Timeout | null = null;

/**
 * Send weekly digests to all subscribed volunteers
 */
export async function sendWeeklyDigestsToVolunteers(): Promise<void> {
  try {
    logger.info("Starting weekly digest send to volunteers...");

    const users = await storage.listUsers();
    const volunteers = users.filter(u => u.userType === 'volunteer');

    let successCount = 0;
    let failCount = 0;

    for (const volunteer of volunteers) {
      try {
        const profile = await storage.getVolunteerProfile(volunteer.id);
        const lastAttempt = lastSendAttempt[volunteer.id];
        const now = new Date();

        if (profile?.emailDigestEnabled && (!lastAttempt || now.getTime() - lastAttempt.getTime() >= MIN_INTERVAL_MS)) {
          const sent = await sendWeeklyDigest(volunteer.id);
          if (sent) {
            successCount++;
            lastSendAttempt[volunteer.id] = now;
          } else {
            failCount++;
          }
        }
      } catch (err) {
        logger.error(`Failed to send digest to volunteer ${volunteer.id}`, err);
        failCount++;
      }
    }

    logger.info(`Volunteer digests: ${successCount} sent, ${failCount} failed`);
  } catch (err) {
    logger.error("Error sending volunteer digests", err);
  }
}

/**
 * Send weekly digests to all subscribed organizations
 */
export async function sendWeeklyDigestsToOrganizations(): Promise<void> {
  try {
    logger.info("Starting weekly digest send to organizations...");

    const organizations = await storage.listOrganizations();

    let successCount = 0;
    let failCount = 0;

    for (const org of organizations) {
      try {
        const profile = await storage.getOrganizationProfile(org.id);
        const lastAttempt = lastSendAttempt[org.id];
        const now = new Date();

        if (profile?.emailDigestEnabled && (!lastAttempt || now.getTime() - lastAttempt.getTime() >= MIN_INTERVAL_MS)) {
          const sent = await sendOrganizationWeeklyDigest(org.id);
          if (sent) {
            successCount++;
            lastSendAttempt[org.id] = now;
          } else {
            failCount++;
          }
        }
      } catch (err) {
        logger.error(`Failed to send digest to organization ${org.id}`, err);
        failCount++;
      }
    }

    logger.info(`Organization digests: ${successCount} sent, ${failCount} failed`);
  } catch (err) {
    logger.error("Error sending organization digests", err);
  }
}

/**
 * Main scheduler function - should be called once on app start
 * Sends digests every Monday at 9:00 AM UTC
 */
export function initializeDigestScheduler(): void {
  try {
    const now = new Date();
    const nextDigestDate = getNextMondayAt9AM();
    const timeUntilNextDigest = nextDigestDate.getTime() - now.getTime();

    logger.info(`Email digest scheduler initialized. Next digest: ${nextDigestDate.toISOString()}`);

    digestTimeout = setTimeout(() => {
      sendWeeklyDigestsToVolunteers();
      sendWeeklyDigestsToOrganizations();
      cleanupSendAttempts(); // Cleanup old entries

      digestInterval = setInterval(() => {
        sendWeeklyDigestsToVolunteers();
        sendWeeklyDigestsToOrganizations();
        cleanupSendAttempts(); // Cleanup old entries
      }, 7 * 24 * 60 * 60 * 1000);
    }, timeUntilNextDigest);
  } catch (err) {
    logger.error("Error initializing digest scheduler", err);
  }
}

/**
 * Stop the digest scheduler - for graceful shutdown
 */
export function stopDigestScheduler(): void {
  if (digestTimeout) {
    clearTimeout(digestTimeout);
    digestTimeout = null;
  }
  if (digestInterval) {
    clearInterval(digestInterval);
    digestInterval = null;
  }
  logger.info("Digest scheduler stopped");
}

/**
 * Cleanup old send attempt entries to prevent unbounded memory growth
 */
function cleanupSendAttempts(): void {
  const now = Date.now();
  const entries = Object.entries(lastSendAttempt);

  // Remove expired entries
  entries.forEach(([key, date]) => {
    if (now - date.getTime() > SEND_ATTEMPT_TTL) {
      delete lastSendAttempt[parseInt(key)];
    }
  });

  // If still too many, remove oldest
  const remainingEntries = Object.entries(lastSendAttempt);
  if (remainingEntries.length > MAX_SEND_ATTEMPTS) {
    remainingEntries
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .slice(0, remainingEntries.length - MAX_SEND_ATTEMPTS)
      .forEach(([key]) => delete lastSendAttempt[parseInt(key)]);
  }
}

/**
 * Helper: Calculate next Monday at 9:00 AM UTC
 */
function getNextMondayAt9AM(): Date {
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  const daysUntilMonday = dayOfWeek === 1 ? 0 : (1 - dayOfWeek + 7) % 7 || 7;
  
  const nextMonday = new Date(now);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + daysUntilMonday);
  nextMonday.setUTCHours(9, 0, 0, 0);
  
  // If we're already past 9 AM on Monday, schedule for next week
  if (daysUntilMonday === 0 && now.getUTCHours() >= 9) {
    nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  }
  
  return nextMonday;
}

export { getNextMondayAt9AM };

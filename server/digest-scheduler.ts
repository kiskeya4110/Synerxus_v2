/**
 * Scheduler service for sending weekly email digests
 * Runs every Monday at 9:00 AM UTC
 */

import { storage } from "./storage";
import { sendWeeklyDigest, sendOrganizationWeeklyDigest } from "./email-digest-service";

// Track digest send attempts to prevent duplicates
let lastSendAttempt: Record<number, Date> = {};
const MIN_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Send weekly digests to all subscribed volunteers
 */
export async function sendWeeklyDigestsToVolunteers(): Promise<void> {
  try {
    console.log("[Scheduler] Starting weekly digest send to volunteers...");
    
    const users = await storage.listUsers();
    const volunteers = users.filter(u => u.userType === 'volunteer');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const volunteer of volunteers) {
      try {
        // Check if volunteer has digest enabled and hasn't received one recently
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
        console.error(`[Scheduler] Failed to send digest to volunteer ${volunteer.id}:`, err);
        failCount++;
      }
    }
    
    console.log(`[Scheduler] Volunteer digests: ${successCount} sent, ${failCount} failed`);
  } catch (err) {
    console.error("[Scheduler] Error sending volunteer digests:", err);
  }
}

/**
 * Send weekly digests to all subscribed organizations
 */
export async function sendWeeklyDigestsToOrganizations(): Promise<void> {
  try {
    console.log("[Scheduler] Starting weekly digest send to organizations...");
    
    const organizations = await storage.listOrganizations();
    
    let successCount = 0;
    let failCount = 0;
    
    for (const org of organizations) {
      try {
        // Check if organization has digest enabled and hasn't received one recently
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
        console.error(`[Scheduler] Failed to send digest to organization ${org.id}:`, err);
        failCount++;
      }
    }
    
    console.log(`[Scheduler] Organization digests: ${successCount} sent, ${failCount} failed`);
  } catch (err) {
    console.error("[Scheduler] Error sending organization digests:", err);
  }
}

/**
 * Main scheduler function - should be called once on app start
 * Sends digests every Monday at 9:00 AM UTC
 */
export function initializeDigestScheduler(): void {
  try {
    // Calculate next Monday 9:00 AM UTC
    const now = new Date();
    const nextDigestDate = getNextMondayAt9AM();
    const timeUntilNextDigest = nextDigestDate.getTime() - now.getTime();
    
    console.log(`[Scheduler] Email digest scheduler initialized. Next digest: ${nextDigestDate.toISOString()}`);
    
    // Set up recurring weekly digest at Monday 9:00 AM UTC
    setTimeout(() => {
      // Send digests
      sendWeeklyDigestsToVolunteers();
      sendWeeklyDigestsToOrganizations();
      
      // Schedule next week
      setInterval(() => {
        sendWeeklyDigestsToVolunteers();
        sendWeeklyDigestsToOrganizations();
      }, 7 * 24 * 60 * 60 * 1000); // Every 7 days
    }, timeUntilNextDigest);
  } catch (err) {
    console.error("[Scheduler] Error initializing digest scheduler:", err);
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

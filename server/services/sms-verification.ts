import { logger } from "../logger";
/**
 * SMS Fallback Verification Service
 *
 * When an NGO doesn't respond to a push notification within 4 hours,
 * this service sends an SMS to the NGO contact: "Reply Y/N to verify [volunteer]'s outcome."
 *
 * Current state: Scaffolded for Twilio integration.
 * In production, configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.
 */

import { storage } from "../storage";
import crypto from "crypto";

interface SMSVerificationConfig {
  timeoutHours: number;
  maxRetries: number;
  retryIntervalHours: number;
}

const DEFAULT_CONFIG: SMSVerificationConfig = {
  timeoutHours: 4,
  maxRetries: 2,
  retryIntervalHours: 12,
};

interface PendingVerification {
  logId: number;
  volunteerId: number;
  volunteerName: string;
  projectName: string;
  outcomeText: string;
  ngoContactPhone: string;
  ngoName: string;
  createdAt: Date;
  smsSentAt?: Date;
  smsRetryCount: number;
  verificationPin: string;
}

interface NgoPhoneRateEntry {
  count: number;
  windowStart: number; // epoch ms
}

// Max SMS per NGO phone number per hour
const MAX_SMS_PER_NGO_PER_HOUR = 3;

export class SMSVerificationService {
  private config: SMSVerificationConfig;
  private pendingQueue: Map<number, PendingVerification> = new Map();
  private ngoRateMap: Map<string, NgoPhoneRateEntry> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SMSVerificationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start() {
    this.checkInterval = setInterval(() => {
      this.checkPendingVerifications();
    }, 60 * 60 * 1000);
    logger.info('[SMS Verification] Service started - checking every hour for unverified outcomes');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  addToQueue(verification: Omit<PendingVerification, 'smsRetryCount' | 'verificationPin'>) {
    const verificationPin = crypto.randomInt(100000, 999999).toString();
    this.pendingQueue.set(verification.logId, {
      ...verification,
      smsRetryCount: 0,
      verificationPin,
    });
  }

  /**
   * Check if a given NGO phone is within the rate limit (3 SMS/hour).
   * Returns true if sending is allowed, false if the limit is exceeded.
   */
  private checkNgoRateLimit(phone: string): boolean {
    const now = Date.now();
    const entry = this.ngoRateMap.get(phone);

    if (!entry || now - entry.windowStart >= 60 * 60 * 1000) {
      // Start a fresh 1-hour window
      this.ngoRateMap.set(phone, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= MAX_SMS_PER_NGO_PER_HOUR) {
      return false;
    }

    entry.count++;
    return true;
  }

  removeFromQueue(logId: number) {
    this.pendingQueue.delete(logId);
  }

  private async checkPendingVerifications() {
    const now = new Date();
    const timeoutMs = this.config.timeoutHours * 60 * 60 * 1000;

    const entries = Array.from(this.pendingQueue.entries());
    for (const [logId, verification] of entries) {
      const elapsed = now.getTime() - verification.createdAt.getTime();
      
      if (elapsed >= timeoutMs && !verification.smsSentAt) {
        await this.sendVerificationSMS(verification);
      }
    }
  }

  private async sendVerificationSMS(verification: PendingVerification): Promise<boolean> {
    if (!this.checkNgoRateLimit(verification.ngoContactPhone)) {
      logger.warn(`[SMS Verification] Rate limit exceeded for NGO phone ${verification.ngoContactPhone} — skipping SMS for log #${verification.logId}`);
      return false;
    }

    const pin = verification.verificationPin;
    const message = `[Synerxus] ${verification.volunteerName} logged: "${verification.outcomeText}" for ${verification.projectName}. Reply Y${pin} to confirm or N${pin} to reject. Reply STOP to opt out.`;

    try {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioSid || !twilioToken || !twilioPhone) {
        const phone = verification.ngoContactPhone || '';
        const redactedPhone = phone.length > 4 ? `***${phone.slice(-4)}` : '***';
        logger.info(`[SMS Verification] Would send SMS to ${redactedPhone} (${message.length} chars)`);
        logger.info('[SMS Verification] Twilio not configured - SMS not sent. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to enable.');
        verification.smsSentAt = new Date();
        return false;
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: verification.ngoContactPhone,
            From: twilioPhone,
            Body: message,
          }).toString(),
        }
      );

      if (response.ok) {
        logger.info(`[SMS Verification] SMS sent to ${verification.ngoName} for log #${verification.logId}`);
        verification.smsSentAt = new Date();
        verification.smsRetryCount++;
        return true;
      } else {
        const error = await response.text();
        logger.error(`[SMS Verification] Failed to send SMS: ${error}`);
        return false;
      }
    } catch (error) {
      logger.error('[SMS Verification] Error sending SMS:', error);
      return false;
    }
  }

  async processWebhookReply(from: string, body: string): Promise<{ success: boolean; action: 'approved' | 'rejected' | 'unknown'; logId: number | null }> {
    const trimmed = body.trim().toUpperCase();

    // Expected format: Y<PIN> or N<PIN> (e.g. "Y123456" or "N123456")
    const match = trimmed.match(/^([YN])(\d{6})$/);
    if (!match) {
      return { success: false, action: 'unknown', logId: null };
    }

    const [, directionChar, suppliedPin] = match;

    let matchedVerification: PendingVerification | null = null;
    const entries = Array.from(this.pendingQueue.entries());
    for (const [, verification] of entries) {
      if (verification.ngoContactPhone === from && verification.verificationPin === suppliedPin) {
        matchedVerification = verification;
        break;
      }
    }

    if (!matchedVerification) {
      return { success: false, action: 'unknown', logId: null };
    }

    const action = directionChar === 'Y' ? 'approved' : 'rejected';

    try {
      await storage.updateVolunteerActivity(matchedVerification.logId, {
        verificationStatus: action,
        verifiedAt: new Date(),
      } as any);

      this.removeFromQueue(matchedVerification.logId);

      logger.info(`[SMS Verification] Log #${matchedVerification.logId} ${action} via SMS from ${from}`);
      return { success: true, action, logId: matchedVerification.logId };
    } catch (err) {
      logger.error(`[SMS Verification] Failed to process webhook reply:`, err);
      return { success: false, action, logId: matchedVerification.logId };
    }
  }

  getQueueStatus() {
    return {
      pending: this.pendingQueue.size,
      items: Array.from(this.pendingQueue.values()).map(v => ({
        logId: v.logId,
        volunteerName: v.volunteerName,
        projectName: v.projectName,
        createdAt: v.createdAt,
        smsSentAt: v.smsSentAt,
        retryCount: v.smsRetryCount,
      })),
    };
  }
}

export const smsVerificationService = new SMSVerificationService();

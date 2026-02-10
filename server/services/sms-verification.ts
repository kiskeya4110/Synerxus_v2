/**
 * SMS Fallback Verification Service
 * 
 * When an NGO doesn't respond to a push notification within 4 hours,
 * this service sends an SMS to the NGO contact: "Reply Y/N to verify [volunteer]'s outcome."
 * 
 * Current state: Scaffolded for Twilio integration. 
 * In production, configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER.
 */

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
}

export class SMSVerificationService {
  private config: SMSVerificationConfig;
  private pendingQueue: Map<number, PendingVerification> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<SMSVerificationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start() {
    this.checkInterval = setInterval(() => {
      this.checkPendingVerifications();
    }, 60 * 60 * 1000);
    console.log('[SMS Verification] Service started - checking every hour for unverified outcomes');
  }

  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  addToQueue(verification: Omit<PendingVerification, 'smsRetryCount'>) {
    this.pendingQueue.set(verification.logId, {
      ...verification,
      smsRetryCount: 0,
    });
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
    const message = `[Synerxus] ${verification.volunteerName} logged: "${verification.outcomeText}" for ${verification.projectName}. Reply Y to confirm, N to reject.`;

    try {
      const twilioSid = process.env.TWILIO_ACCOUNT_SID;
      const twilioToken = process.env.TWILIO_AUTH_TOKEN;
      const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

      if (!twilioSid || !twilioToken || !twilioPhone) {
        console.log(`[SMS Verification] Would send SMS to ${verification.ngoContactPhone}: ${message}`);
        console.log('[SMS Verification] Twilio not configured - SMS not sent. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER to enable.');
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
        console.log(`[SMS Verification] SMS sent to ${verification.ngoName} for log #${verification.logId}`);
        verification.smsSentAt = new Date();
        verification.smsRetryCount++;
        return true;
      } else {
        const error = await response.text();
        console.error(`[SMS Verification] Failed to send SMS: ${error}`);
        return false;
      }
    } catch (error) {
      console.error('[SMS Verification] Error sending SMS:', error);
      return false;
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

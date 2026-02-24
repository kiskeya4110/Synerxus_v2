import { Router, type Request, type Response } from "express";
import { smsVerificationService } from "../services/sms-verification";
import { authMiddleware } from "../middleware/auth";
import crypto from "crypto";

export const smsRouter = Router();

function validateTwilioSignature(req: Request): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) return true;

  const signature = req.headers['x-twilio-signature'] as string;
  if (!signature) return false;

  const protocol = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['host'] || '';
  const url = `${protocol}://${host}${req.originalUrl}`;

  const params = Object.keys(req.body || {}).sort().reduce((acc: string, key: string) => {
    return acc + key + (req.body[key] || '');
  }, '');

  const data = url + params;
  const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');
  return signature === expected;
}

smsRouter.post("/sms/webhook", async (req: Request, res: Response) => {
  try {
    if (!validateTwilioSignature(req)) {
      console.warn('[SMS Webhook] Invalid Twilio signature - rejecting request');
      return res.status(403).send('<Response><Message>Unauthorized</Message></Response>');
    }

    const from = req.body.From || "";
    const body = req.body.Body || "";

    const result = await smsVerificationService.processWebhookReply(from, body);

    let message = "Thank you for your response.";
    if (result.action === "approved") {
      message = "Thank you! The impact log has been approved.";
    } else if (result.action === "rejected") {
      message = "Thank you! The impact log has been rejected.";
    } else {
      message = "Reply Y to approve or N to reject the impact log.";
    }

    res.set("Content-Type", "text/xml");
    res.send(`<Response><Message>${message}</Message></Response>`);
  } catch (err) {
    console.error("[SMS Webhook] Error processing webhook:", err);
    res.set("Content-Type", "text/xml");
    res.send(`<Response><Message>An error occurred. Please try again later.</Message></Response>`);
  }
});

smsRouter.get("/sms/status", authMiddleware, async (_req: Request, res: Response) => {
  try {
    const status = smsVerificationService.getQueueStatus();
    res.json(status);
  } catch (err) {
    console.error("[SMS Status] Error fetching status:", err);
    res.status(500).json({ message: "Failed to fetch SMS queue status" });
  }
});

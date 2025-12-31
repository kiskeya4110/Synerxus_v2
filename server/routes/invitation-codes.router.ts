import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { insertInvitationCodeSchema } from "@shared/schema";
import { randomBytes } from "crypto";

export const invitationCodesRouter = Router();

// Generate a random invitation code
function generateInviteCode(length: number = 8): string {
  return randomBytes(length).toString('hex').toUpperCase().slice(0, length);
}

// GET /api/invitation-codes - List all invitation codes (admin only)
invitationCodesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(parseInt(userId));
    if (!user || user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization admins can view invitation codes" });
    }

    const codes = await storage.listInvitationCodes(user.organizationId || undefined);
    res.json(codes);
  } catch (err) {
    console.error("Error fetching invitation codes:", err);
    res.status(500).json({ message: "Failed to fetch invitation codes" });
  }
});

// POST /api/invitation-codes - Create a new invitation code
invitationCodesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { userId, email, userType, maxUses, expiresAt, notes, customCode } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(parseInt(userId));
    if (!user || user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization admins can create invitation codes" });
    }

    // Generate or use custom code
    const code = customCode || generateInviteCode(8);

    // Check if code already exists
    const existingCode = await storage.getInvitationCodeByCode(code);
    if (existingCode) {
      return res.status(400).json({ message: "Invitation code already exists" });
    }

    const invitationCode = await storage.createInvitationCode({
      code,
      email: email || null,
      userType: userType || null,
      organizationId: user.organizationId || null,
      maxUses: maxUses || 1,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      isActive: true,
      createdBy: user.id,
      notes: notes || null,
    });

    res.status(201).json(invitationCode);
  } catch (err) {
    console.error("Error creating invitation code:", err);
    res.status(500).json({ message: "Failed to create invitation code" });
  }
});

// POST /api/invitation-codes/validate - Validate an invitation code (for registration)
invitationCodesRouter.post("/validate", async (req: Request, res: Response) => {
  try {
    const { code, email, userType } = req.body;

    if (!code) {
      return res.status(400).json({ valid: false, message: "Invitation code is required" });
    }

    const validation = await storage.validateInvitationCode(code, email, userType);

    if (!validation.valid) {
      return res.status(400).json(validation);
    }

    res.json(validation);
  } catch (err) {
    console.error("Error validating invitation code:", err);
    res.status(500).json({ valid: false, message: "Failed to validate invitation code" });
  }
});

// POST /api/invitation-codes/:code/use - Mark an invitation code as used
invitationCodesRouter.post("/:code/use", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const result = await storage.useInvitationCode(code, parseInt(userId));

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({ success: true, message: "Invitation code used successfully" });
  } catch (err) {
    console.error("Error using invitation code:", err);
    res.status(500).json({ message: "Failed to use invitation code" });
  }
});

// DELETE /api/invitation-codes/:id - Deactivate an invitation code
invitationCodesRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(parseInt(userId));
    if (!user || user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization admins can delete invitation codes" });
    }

    await storage.deactivateInvitationCode(parseInt(id));
    res.json({ success: true, message: "Invitation code deactivated" });
  } catch (err) {
    console.error("Error deactivating invitation code:", err);
    res.status(500).json({ message: "Failed to deactivate invitation code" });
  }
});

// GET /api/invitation-codes/settings - Get platform invite-only setting
invitationCodesRouter.get("/settings", async (req: Request, res: Response) => {
  try {
    const inviteOnly = await storage.getPlatformSetting("INVITE_ONLY_MODE");
    // Default to false (open access) for MVP-Type.1
    // Platform is open by default
    res.json({
      inviteOnlyMode: inviteOnly ? inviteOnly.value === "true" : false,
      updatedAt: inviteOnly?.updatedAt
    });
  } catch (err) {
    console.error("Error fetching platform settings:", err);
    res.status(500).json({ message: "Failed to fetch platform settings" });
  }
});

// PUT /api/invitation-codes/settings - Update platform invite-only setting
invitationCodesRouter.put("/settings", async (req: Request, res: Response) => {
  try {
    const { userId, inviteOnlyMode } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await storage.getUser(parseInt(userId));
    if (!user || user.userType !== 'organization') {
      return res.status(403).json({ message: "Only organization admins can change platform settings" });
    }

    await storage.setPlatformSetting(
      "INVITE_ONLY_MODE",
      inviteOnlyMode ? "true" : "false",
      "Controls whether new users require an invitation code to register",
      user.id
    );

    res.json({ success: true, inviteOnlyMode });
  } catch (err) {
    console.error("Error updating platform settings:", err);
    res.status(500).json({ message: "Failed to update platform settings" });
  }
});

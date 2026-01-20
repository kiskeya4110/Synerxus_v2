import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { handleValidationError, getAuthenticatedUser } from "./utils";
import { authRateLimiter } from "../middleware/security";
import { authMiddleware } from "../middleware/auth";

export const usersRouter = Router();

// Preapproved emails that don't require invitation codes
const PREAPPROVED_EMAILS = [
  // Organizations
  'idream@operationidream.org',
  'kmumba@operationidream.org',
  'asniabarazar07@gmail.com',
  'auldridgechibbwalu@yahoo.co.uk',
  'impactamexicoac@gmail.com',
  'info@impactamexico.org',
  'thinamaphosa@gmail.com',
  'brown.director@yestrust.org.zw',
  'susan.madodo@youngafrica.org',
  'josephine.millioni@youngafrica.org',
  'emezil97@gmail.com',
  'mabspro34@gmail.com',
  'mackenroodlacour@gmail.com',
  'limitlessfoundation633@gmail.com',
  // Pre-approved Volunteers
  'hpare79@gmail.com',
  'kamzizfr@gmail.com',
  'alraski@hotmail.com',
  'johnmarrely@gmail.com',
].map(email => email.toLowerCase());

function isPreapprovedEmail(email: string): boolean {
  return PREAPPROVED_EMAILS.includes(email.toLowerCase());
}

// Broadcast function type (will be injected)
type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/users - List users with access control
// Organizations can see users in their org, CSR partners can see their employees
usersRouter.get("/", authMiddleware, async (req: Request, res: Response) => {
  try {
    const requestingUser = getAuthenticatedUser(req, res);
    if (!requestingUser) return;

    const { userType } = req.query;

    // SECURITY: Use authenticated user from session
    const requestingUserId = requestingUser.id;

    let users = await storage.listUsers();

    // Filter based on requesting user's type and access rights
    if (requestingUser.userType === 'organization' && requestingUser.organizationId) {
      // Organizations can only see users in their organization
      users = users.filter((u: any) =>
        u.organizationId === requestingUser.organizationId ||
        u.id === requestingUserId
      );
    } else if (requestingUser.userType === 'corporate-partner') {
      // CSR partners can see their linked employees/volunteers
      // For now, they can only see themselves and their org members
      users = users.filter((u: any) =>
        u.organizationId === requestingUser.organizationId ||
        u.id === requestingUserId
      );
    } else if (requestingUser.userType === 'volunteer') {
      // Volunteers can only see their own profile
      users = users.filter((u: any) => u.id === requestingUserId);
    }

    // Additional filter by userType if provided
    if (userType) {
      users = users.filter((u: any) => u.userType === userType);
    }

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// GET /api/users/me - Get current user by userId query param
// Note: This uses userId from query param for backward compatibility with the client
usersRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;

    if (!userIdParam) {
      return res.status(400).json({ message: "userId query parameter is required" });
    }

    const userId = parseInt(userIdParam);

    if (isNaN(userId)) {
      return res.status(400).json({ message: "userId must be a valid number" });
    }

    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch current user" });
  }
});

// GET /api/users/:id - Get user by ID with authorization
usersRouter.get("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // SECURITY: Authorization check - users can view:
    // 1. Their own profile
    // 2. Users in their organization (if they're org users)
    // 3. Public volunteer profiles (limited fields only)
    const isOwnProfile = authUser.id === userId;
    const isSameOrganization = authUser.organizationId &&
      authUser.organizationId === user.organizationId;

    if (!isOwnProfile && !isSameOrganization) {
      // Return limited public fields for other users
      return res.json({
        id: user.id,
        displayName: user.displayName,
        avatar: user.avatar,
        userType: user.userType,
        // Don't expose email, firebaseUid, or other sensitive data
      });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch user" });
  }
});

// POST /api/users/firebase-sync - Sync Firebase user with database
// Apply strict rate limiting to prevent enumeration attacks
usersRouter.post("/firebase-sync", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { firebaseUid, email, displayName, userType, organizationName, invitationCode, dataConsent, dataConsentDate } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ message: "Missing required fields: firebaseUid, email" });
    }

    let user = await storage.getUserByFirebaseUid(firebaseUid);

    if (user) {
      // Existing user - return with isNewUser: false
      return res.json({ ...user, isNewUser: false });
    }

    user = await storage.getUserByEmail(email);

    if (user) {
      const updatedUser = await storage.updateUser(user.id, {
        firebaseUid,
        displayName: displayName || user.displayName
      });
      // Existing user (linking account) - return with isNewUser: false
      return res.json({ ...updatedUser, isNewUser: false });
    }

    // Check if platform is in invite-only mode for new user registration
    // Skip invitation code check for preapproved organization emails
    const isInviteOnly = await storage.isInviteOnlyMode();
    if (isInviteOnly && !isPreapprovedEmail(email)) {
      if (!invitationCode) {
        return res.status(403).json({
          message: "This platform requires an invitation code to register",
          requiresInvitation: true
        });
      }

      // Validate the invitation code
      const validation = await storage.validateInvitationCode(invitationCode, email, userType);
      if (!validation.valid) {
        return res.status(403).json({
          message: validation.message || "Invalid invitation code",
          requiresInvitation: true
        });
      }
    }

    if (!userType) {
      return res.status(400).json({ message: "userType is required for new user registration" });
    }

    const username = email.split('@')[0] + '_' + Date.now();

    // Create organization if organization name is provided for org/corporate users
    let organizationId: number | undefined;
    if ((userType === 'organization' || userType === 'corporate-partner') && organizationName) {
      // Auto-approve if email is in preapproved list
      const isPreapproved = isPreapprovedEmail(email);
      const organization = await storage.createOrganization({
        name: organizationName,
        contactEmail: email,
        description: '',
        address: '',
        approvalStatus: isPreapproved ? 'approved' : 'pending'
      });
      organizationId = organization.id;
    }

    // For organization users, prefer organizationName over email prefix for displayName
    const effectiveDisplayName = displayName ||
      ((userType === 'organization' || userType === 'corporate-partner') && organizationName ? organizationName : email.split('@')[0]);

    const userData: any = {
      firebaseUid,
      username,
      email,
      displayName: effectiveDisplayName,
      userType,
      organizationId,
    };

    // Add privacy consent if provided (required for new registrations)
    if (dataConsent !== undefined) {
      userData.dataConsent = dataConsent === true;
      userData.dataConsentDate = dataConsent === true ? (dataConsentDate ? new Date(dataConsentDate) : new Date()) : null;
    }

    user = await storage.createUser(userData);

    // Mark invitation code as used if one was provided
    if (invitationCode && user) {
      await storage.useInvitationCode(invitationCode, user.id);
    }

    broadcastUpdate("user_created", user);
    // New user - return with isNewUser: true
    res.status(201).json({ ...user, isNewUser: true });
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/users - Create new user
usersRouter.post("/", async (req: Request, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(userData);

    broadcastUpdate("user_created", user);
    res.status(201).json(user);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// PATCH /api/users/:id - Update user with authorization
usersRouter.patch("/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const userId = parseInt(req.params.id);

    // SECURITY: Users can only update their own profile
    if (authUser.id !== userId) {
      return res.status(403).json({ message: "You can only update your own profile" });
    }

    const userData = insertUserSchema.partial().parse(req.body);

    // SECURITY: Prevent privilege escalation - users cannot change these fields
    const { userType, isAdmin, organizationId, firebaseUid, ...safeData } = userData as any;

    const updatedUser = await storage.updateUser(userId, safeData);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    broadcastUpdate("user_updated", updatedUser);
    res.json(updatedUser);
  } catch (err) {
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { authRateLimiter } from "../middleware/security";

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
usersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { userType, userId } = req.query;

    // Require authentication - get requesting user
    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const requestingUserId = parseInt(userId as string);
    if (isNaN(requestingUserId)) {
      return res.status(400).json({ message: "Invalid userId" });
    }

    const requestingUser = await storage.getUser(requestingUserId);
    if (!requestingUser) {
      return res.status(401).json({ message: "User not found" });
    }

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

// GET /api/users/me - Get current user
usersRouter.get("/me", async (req: Request, res: Response) => {
  try {
    const userIdParam = req.query.userId as string;
    const userId = userIdParam ? parseInt(userIdParam) : 1;

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

// GET /api/users/:id - Get user by ID
usersRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await storage.getUser(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
    const { firebaseUid, email, displayName, userType, organizationName, invitationCode } = req.body;

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

    const userData = {
      firebaseUid,
      username,
      email,
      displayName: displayName || email.split('@')[0],
      userType,
      organizationId,
    };

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

// PATCH /api/users/:id - Update user
usersRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const userData = insertUserSchema.partial().parse(req.body);

    const updatedUser = await storage.updateUser(userId, userData);
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

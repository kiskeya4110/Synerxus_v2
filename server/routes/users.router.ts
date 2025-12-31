import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import { authRateLimiter } from "../middleware/security";

export const usersRouter = Router();

// Broadcast function type (will be injected)
type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/users - List all users with optional filtering
usersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { userType } = req.query;
    const users = await storage.listUsers();

    if (userType) {
      const filtered = users.filter((u: any) => u.userType === userType);
      return res.json(filtered);
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
    const { firebaseUid, email, displayName, userType, organizationName } = req.body;

    if (!firebaseUid || !email) {
      return res.status(400).json({ message: "Missing required fields: firebaseUid, email" });
    }

    let user = await storage.getUserByFirebaseUid(firebaseUid);

    if (user) {
      return res.json(user);
    }

    user = await storage.getUserByEmail(email);

    if (user) {
      const updatedUser = await storage.updateUser(user.id, {
        firebaseUid,
        displayName: displayName || user.displayName
      });
      return res.json(updatedUser);
    }

    if (!userType) {
      return res.status(400).json({ message: "userType is required for new user registration" });
    }

    const username = email.split('@')[0] + '_' + Date.now();

    // Create organization if organization name is provided for org/corporate users
    let organizationId: number | undefined;
    if ((userType === 'organization' || userType === 'corporate-partner') && organizationName) {
      const organization = await storage.createOrganization({
        name: organizationName,
        contactEmail: email,
        description: '',
        address: ''
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
    broadcastUpdate("user_created", user);
    res.status(201).json(user);
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

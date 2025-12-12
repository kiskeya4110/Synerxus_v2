import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { handleValidationError } from "./utils";

export const usersRouter = Router();

// Broadcast function type (will be injected)
type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// GET /api/users - List all users with optional filtering and pagination
usersRouter.get("/", async (req: Request, res: Response) => {
  try {
    const { userType, page, limit } = req.query;

    // If pagination params are provided, use paginated query
    if (page || limit) {
      const paginationParams = {
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined
      };

      const result = await storage.listUsersPaginated(paginationParams);

      // Apply userType filter if provided (in-memory for paginated results)
      if (userType) {
        result.data = result.data.filter((u: any) => u.userType === userType);
      }

      return res.json(result);
    }

    // Non-paginated (legacy behavior)
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
usersRouter.post("/firebase-sync", async (req: Request, res: Response) => {
  try {
    const { firebaseUid, email, displayName, userType } = req.body;

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
    const userData = {
      firebaseUid,
      username,
      email,
      displayName: displayName || email.split('@')[0],
      userType,
    };

    user = await storage.createUser(userData);
    broadcastUpdate("user_created", user);
    res.status(201).json(user);
  } catch (err: any) {
    // Check for database connectivity issues
    const errorMessage = err?.message || '';
    const errorCode = err?.code || '';

    const isDatabaseUnavailable =
      errorMessage.includes('endpoint has been disabled') ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('connection terminated') ||
      errorMessage.includes('timeout') ||
      errorCode === 'XX000' ||
      errorCode === 'ECONNRESET' ||
      errorCode === '57P01'; // admin_shutdown

    if (isDatabaseUnavailable) {
      console.error('[firebase-sync] Database unavailable:', errorMessage);
      return res.status(503).json({
        message: "Service temporarily unavailable. The database is currently offline. Please try again in a few moments.",
        code: "DATABASE_UNAVAILABLE",
        retryAfter: 30
      });
    }

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

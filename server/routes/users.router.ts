import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertUserSchema } from "@shared/schema";
import { handleValidationError, getAuthenticatedUser } from "./utils";
import { authRateLimiter, secureCookieOptions } from "../middleware/security";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth";
import { generateTokenPair, blacklistToken, verifyRefreshToken } from "../middleware/security";
import { logger } from "../logger";

/** Cookie options for the auth JWT — 15 min lifetime matches access token expiry */
const AUTH_COOKIE_OPTIONS = {
  ...secureCookieOptions,
  maxAge: 15 * 60 * 1000, // 15 minutes
} as const;
import { isPreapprovedEmail } from "../config/preapproved-emails";
import { getPaginationParams, paginateArray } from "../pagination";

export const usersRouter = Router();

/**
 * Return only the user fields the client needs.
 * Explicitly allowlisting prevents future DB columns from leaking automatically.
 */
function safeUserFields(user: Record<string, any>) {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    username: user.username,
    userType: user.userType,
    organizationId: user.organizationId ?? null,
    isAdmin: user.isAdmin ?? false,
    profileImageUrl: user.profileImageUrl ?? null,
    avatar: user.avatar ?? null,
    createdAt: user.createdAt,
    firebaseUid: user.firebaseUid,  // frontend session comparison
    skills: user.skills ?? null,
  };
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

    const pagination = getPaginationParams(req);
    res.json(paginateArray(users, pagination));
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// GET /api/users/me - Get current authenticated user
usersRouter.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authUser = getAuthenticatedUser(req, res);
    if (!authUser) return;

    const user = await storage.getUser(authUser.id);

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
    const { firebaseUid, email, displayName, userType, organizationName, invitationCode, dataConsent, dataConsentDate, isLoginAttempt } = req.body;

    if (!firebaseUid || !email) {
      console.log(`[firebase-sync] Missing fields - firebaseUid: ${!!firebaseUid}, email: ${!!email}`);
      return res.status(400).json({ message: "Missing required fields: firebaseUid, email" });
    }

    console.log(`[firebase-sync] Attempting sync for email: ${email}, firebaseUid: ${firebaseUid?.substring(0, 8)}..., isLoginAttempt: ${isLoginAttempt}`);

    let user = await storage.getUserByFirebaseUid(firebaseUid);

    if (user) {
      // Existing user - return with isNewUser: false
      console.log(`[firebase-sync] Found user by firebaseUid: ${user.id} (${user.email})`);
      const tokens = generateTokenPair({ ...user, userType: user.userType || "volunteer" });
      res.cookie("authToken", tokens.accessToken, AUTH_COOKIE_OPTIONS);
      return res.json({ user: safeUserFields(user), isNewUser: false, jwtToken: tokens.accessToken, ...tokens });
    }

    user = await storage.getUserByEmail(email);

    if (user) {
      console.log(`[firebase-sync] Found user by email, linking firebaseUid: ${user.id} (${user.email})`);
      const updatedUser = await storage.updateUser(user.id, {
        firebaseUid,
        displayName: displayName || user.displayName
      });
      // Existing user (linking account) - return with isNewUser: false
      const tokenUser = updatedUser || user;
      const tokens = generateTokenPair({ ...tokenUser, userType: tokenUser.userType || "volunteer" });
      res.cookie("authToken", tokens.accessToken, AUTH_COOKIE_OPTIONS);
      return res.json({ user: safeUserFields(tokenUser), isNewUser: false, jwtToken: tokens.accessToken, ...tokens });
    }

    console.log(`[firebase-sync] No existing user found for email: ${email}, userType: ${userType || 'not provided'}`);

    // Check if platform is in invite-only mode for new user registration
    // Skip invitation code check for:
    // 1. Preapproved organization emails
    // 2. Login attempts (user already authenticated via Firebase, just missing DB record)
    const isInviteOnly = await storage.isInviteOnlyMode();
    if (isInviteOnly && !isPreapprovedEmail(email) && !isLoginAttempt) {
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

    // Log when creating a new user from login attempt (data recovery scenario)
    if (isLoginAttempt) {
      console.log(`[firebase-sync] Creating database record for existing Firebase user (login recovery): ${email}`);
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
    const tokens = generateTokenPair({ ...user, userType: user.userType || "volunteer" });
    res.cookie("authToken", tokens.accessToken, AUTH_COOKIE_OPTIONS);
    res.status(201).json({ user: safeUserFields(user), isNewUser: true, jwtToken: tokens.accessToken, ...tokens });
  } catch (err) {
    console.error("[firebase-sync] Error creating user:", err);
    const error = handleValidationError(err);
    res.status(error.status).json({ message: error.message });
  }
});

// POST /api/users/logout - Revoke access + refresh tokens
usersRouter.post("/logout", authMiddleware, async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      await blacklistToken(authHeader.slice(7));
    }
    const { refreshToken } = req.body;
    if (refreshToken && typeof refreshToken === "string") {
      await blacklistToken(refreshToken);
    }
    // Clear the httpOnly auth cookie
    res.clearCookie("authToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ message: "Logout failed" });
  }
});

// POST /api/users/token/refresh - Exchange a valid refresh token for a new access token
usersRouter.post("/token/refresh", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken || typeof refreshToken !== "string") {
      return res.status(400).json({ error: "MISSING_REFRESH_TOKEN", message: "refreshToken is required" });
    }

    const payload = await verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(401).json({ error: "INVALID_REFRESH_TOKEN", message: "Refresh token is invalid or expired" });
    }

    const user = await storage.getUser(payload.userId);
    if (!user) {
      return res.status(401).json({ error: "USER_NOT_FOUND", message: "User no longer exists" });
    }

    // Rotate: blacklist old refresh token, issue new pair
    await blacklistToken(refreshToken);
    const tokens = generateTokenPair({ ...user, userType: user.userType || "volunteer" });
    // Refresh the httpOnly cookie alongside the response body
    res.cookie("authToken", tokens.accessToken, AUTH_COOKIE_OPTIONS);
    res.json({ jwtToken: tokens.accessToken, ...tokens });
  } catch (err) {
    res.status(500).json({ message: "Token refresh failed" });
  }
});

// POST /api/users - Create new user (rate limited; use /firebase-sync for registration)
usersRouter.post("/", authRateLimiter, async (req: Request, res: Response) => {
  try {
    const userData = insertUserSchema.parse(req.body);
    // SECURITY: Prevent setting admin privileges via this endpoint
    const { isAdmin, ...safeData } = userData as any;
    const user = await storage.createUser(safeData);

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

// DELETE /api/users/me — GDPR Article 17 right to erasure
usersRouter.delete("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await storage.deleteUserAndData(userId);
    res.clearCookie("authToken");
    res.json({ message: "Account and associated data deleted", deletedTables: result.deletedTables });
  } catch (err) {
    logger.error("[GDPR] Account deletion failed for userId:", req.user?.id);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

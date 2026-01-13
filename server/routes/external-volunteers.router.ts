import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertExternalVolunteerSchema, type ExternalVolunteer } from "@shared/schema";
import { authMiddleware } from "../middleware/auth";
import { z } from "zod";

export const externalVolunteersRouter = Router();

/**
 * GET /external-volunteers - List external volunteers for an organization
 * Query params:
 *   - organizationId: Required - Filter by organization ID
 *   - search: Optional - Search by name or email
 *
 * Authorization: Must be organization user with access to the organization
 */
externalVolunteersRouter.get("/external-volunteers", authMiddleware, async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.query.organizationId as string);
    const search = req.query.search as string | undefined;

    if (!organizationId || isNaN(organizationId)) {
      return res.status(400).json({ message: "organizationId is required" });
    }

    // Verify user has access to this organization
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if user belongs to this organization
    if (user.userType === 'organization') {
      const userOrg = await storage.getOrganizationByUserId(user.id);
      if (!userOrg || userOrg.id !== organizationId) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
    } else {
      return res.status(403).json({ message: "Only organization users can access external volunteers" });
    }

    let volunteers: ExternalVolunteer[];
    if (search && search.trim()) {
      volunteers = await storage.searchExternalVolunteers(organizationId, search.trim());
    } else {
      volunteers = await storage.listExternalVolunteersByOrganization(organizationId);
    }

    res.json(volunteers);
  } catch (err: any) {
    console.error("Error listing external volunteers:", err);
    res.status(500).json({ message: "Failed to list external volunteers" });
  }
});

/**
 * GET /external-volunteers/:id - Get a single external volunteer
 */
externalVolunteersRouter.get("/external-volunteers/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid external volunteer ID" });
    }

    const volunteer = await storage.getExternalVolunteer(id);
    if (!volunteer) {
      return res.status(404).json({ message: "External volunteer not found" });
    }

    // Verify user has access to this organization
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (user.userType === 'organization') {
      const userOrg = await storage.getOrganizationByUserId(user.id);
      if (!userOrg || userOrg.id !== volunteer.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else {
      return res.status(403).json({ message: "Only organization users can access external volunteers" });
    }

    res.json(volunteer);
  } catch (err: any) {
    console.error("Error getting external volunteer:", err);
    res.status(500).json({ message: "Failed to get external volunteer" });
  }
});

/**
 * POST /external-volunteers - Create a new external volunteer
 * Body: { organizationId, fullName, email?, phone?, notes?, source? }
 */
externalVolunteersRouter.post("/external-volunteers", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Parse and validate request body
    const parsed = insertExternalVolunteerSchema.safeParse({
      ...req.body,
      createdBy: user.id
    });

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation error",
        errors: parsed.error.errors
      });
    }

    const { organizationId } = parsed.data;

    // Verify user belongs to this organization
    if (user.userType === 'organization') {
      const userOrg = await storage.getOrganizationByUserId(user.id);
      if (!userOrg || userOrg.id !== organizationId) {
        return res.status(403).json({ message: "Access denied to this organization" });
      }
    } else {
      return res.status(403).json({ message: "Only organization users can create external volunteers" });
    }

    const volunteer = await storage.createExternalVolunteer(parsed.data);
    res.status(201).json(volunteer);
  } catch (err: any) {
    console.error("Error creating external volunteer:", err);
    res.status(500).json({ message: "Failed to create external volunteer" });
  }
});

/**
 * PATCH /external-volunteers/:id - Update an external volunteer
 * Body: { fullName?, email?, phone?, notes?, source?, isActive? }
 */
externalVolunteersRouter.patch("/external-volunteers/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid external volunteer ID" });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get existing volunteer to verify organization access
    const existing = await storage.getExternalVolunteer(id);
    if (!existing) {
      return res.status(404).json({ message: "External volunteer not found" });
    }

    // Verify user belongs to this organization
    if (user.userType === 'organization') {
      const userOrg = await storage.getOrganizationByUserId(user.id);
      if (!userOrg || userOrg.id !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else {
      return res.status(403).json({ message: "Only organization users can update external volunteers" });
    }

    // Only allow updating certain fields
    const allowedFields = ['fullName', 'email', 'phone', 'notes', 'source', 'isActive'];
    const updateData: Record<string, any> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const updated = await storage.updateExternalVolunteer(id, updateData);
    res.json(updated);
  } catch (err: any) {
    console.error("Error updating external volunteer:", err);
    res.status(500).json({ message: "Failed to update external volunteer" });
  }
});

/**
 * DELETE /external-volunteers/:id - Soft delete an external volunteer (set isActive=false)
 */
externalVolunteersRouter.delete("/external-volunteers/:id", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid external volunteer ID" });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get existing volunteer to verify organization access
    const existing = await storage.getExternalVolunteer(id);
    if (!existing) {
      return res.status(404).json({ message: "External volunteer not found" });
    }

    // Verify user belongs to this organization
    if (user.userType === 'organization') {
      const userOrg = await storage.getOrganizationByUserId(user.id);
      if (!userOrg || userOrg.id !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else {
      return res.status(403).json({ message: "Only organization users can delete external volunteers" });
    }

    // Soft delete by setting isActive to false
    await storage.updateExternalVolunteer(id, { isActive: false });
    res.json({ message: "External volunteer deactivated successfully" });
  } catch (err: any) {
    console.error("Error deleting external volunteer:", err);
    res.status(500).json({ message: "Failed to delete external volunteer" });
  }
});

/**
 * GET /external-volunteers/:id/activities - Get activities for an external volunteer
 */
externalVolunteersRouter.get("/external-volunteers/:id/activities", authMiddleware, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid external volunteer ID" });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Get existing volunteer to verify organization access
    const existing = await storage.getExternalVolunteer(id);
    if (!existing) {
      return res.status(404).json({ message: "External volunteer not found" });
    }

    // Verify user belongs to this organization
    if (user.userType === 'organization') {
      const userOrg = await storage.getOrganizationByUserId(user.id);
      if (!userOrg || userOrg.id !== existing.organizationId) {
        return res.status(403).json({ message: "Access denied" });
      }
    } else {
      return res.status(403).json({ message: "Only organization users can view external volunteer activities" });
    }

    const activities = await storage.listVolunteerActivitiesByExternalVolunteer(id);
    res.json(activities);
  } catch (err: any) {
    console.error("Error getting external volunteer activities:", err);
    res.status(500).json({ message: "Failed to get activities" });
  }
});

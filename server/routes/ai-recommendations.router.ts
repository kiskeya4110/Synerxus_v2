import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertAIRecommendationSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";

export const aiRecommendationsRouter = Router();

/**
 * GET /ai-recommendations/:organizationId
 *
 * Get all AI recommendations for an organization
 */
aiRecommendationsRouter.get("/ai-recommendations/:organizationId", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const recommendations = await storage.listAIRecommendations(organizationId);
    res.json(recommendations);
  } catch (err) {
    console.error("Error fetching AI recommendations:", err);
    res.status(500).json({ message: "Error fetching AI recommendations" });
  }
});

/**
 * GET /ai-recommendations/:organizationId/:recommendationId
 *
 * Get a specific AI recommendation by its generated ID (e.g., 'rec1', 'ch1')
 */
aiRecommendationsRouter.get("/ai-recommendations/:organizationId/:recommendationId", async (req: Request, res: Response) => {
  try {
    const organizationId = parseInt(req.params.organizationId);
    const recommendationId = req.params.recommendationId;

    if (isNaN(organizationId)) {
      return res.status(400).json({ message: "Invalid organization ID" });
    }

    const recommendation = await storage.getAIRecommendationByRecId(organizationId, recommendationId);
    if (!recommendation) {
      return res.status(404).json({ message: "Recommendation not found" });
    }

    res.json(recommendation);
  } catch (err) {
    console.error("Error fetching AI recommendation:", err);
    res.status(500).json({ message: "Error fetching AI recommendation" });
  }
});

/**
 * POST /ai-recommendations
 *
 * Create a new AI recommendation record (when user accepts/dismisses)
 */
aiRecommendationsRouter.post("/ai-recommendations", async (req: Request, res: Response) => {
  try {
    const data = insertAIRecommendationSchema.parse(req.body);
    const recommendation = await storage.createAIRecommendation(data);
    res.status(201).json(recommendation);
  } catch (err) {
    if (err instanceof ZodError) {
      const validationError = fromZodError(err);
      return res.status(400).json({ message: validationError.message });
    }
    console.error("Error creating AI recommendation:", err);
    res.status(500).json({ message: "Error creating AI recommendation" });
  }
});

/**
 * POST /ai-recommendations/bulk-apply
 *
 * Apply all recommendations (mark them as accepted)
 */
aiRecommendationsRouter.post("/ai-recommendations/bulk-apply", async (req: Request, res: Response) => {
  try {
    const { organizationId, userId, recommendations, metrics } = req.body;

    if (!organizationId || !userId || !Array.isArray(recommendations)) {
      return res.status(400).json({ message: "Missing required fields: organizationId, userId, recommendations" });
    }

    const results = [];
    const now = new Date();

    for (const rec of recommendations) {
      // Check if recommendation already exists
      const existing = await storage.getAIRecommendationByRecId(organizationId, rec.id);

      if (existing) {
        // Update existing recommendation to accepted
        const updated = await storage.updateAIRecommendation(existing.id, {
          status: 'accepted',
          acceptedAt: now,
        });
        results.push(updated);
      } else {
        // Create new recommendation record
        const newRec = await storage.createAIRecommendation({
          organizationId,
          userId,
          recommendationId: rec.id,
          recommendationType: rec.category,
          title: rec.title,
          description: rec.description,
          relatedSDGs: rec.relatedSDGs || [],
          priority: rec.priority,
          projectedImpact: rec.projectedImpact,
          actionLabel: rec.actionLabel,
          status: 'accepted',
          acceptedAt: now,
          metrics: metrics || null,
        });
        results.push(newRec);
      }
    }

    res.status(200).json({
      message: "Recommendations applied successfully",
      count: results.length,
      recommendations: results
    });
  } catch (err) {
    console.error("Error applying AI recommendations:", err);
    res.status(500).json({ message: "Error applying AI recommendations" });
  }
});

/**
 * POST /ai-recommendations/dismiss
 *
 * Dismiss a recommendation
 */
aiRecommendationsRouter.post("/ai-recommendations/dismiss", async (req: Request, res: Response) => {
  try {
    const { organizationId, userId, recommendationId, category, title, description } = req.body;

    if (!organizationId || !userId || !recommendationId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const now = new Date();

    // Check if recommendation already exists
    const existing = await storage.getAIRecommendationByRecId(organizationId, recommendationId);

    if (existing) {
      // Update existing recommendation to dismissed
      const updated = await storage.updateAIRecommendation(existing.id, {
        status: 'dismissed',
        dismissedAt: now,
      });
      res.json(updated);
    } else {
      // Create new recommendation record as dismissed
      const newRec = await storage.createAIRecommendation({
        organizationId,
        userId,
        recommendationId,
        recommendationType: category || 'insight',
        title: title || 'Dismissed insight',
        description: description || '',
        status: 'dismissed',
        dismissedAt: now,
      });
      res.status(201).json(newRec);
    }
  } catch (err) {
    console.error("Error dismissing AI recommendation:", err);
    res.status(500).json({ message: "Error dismissing AI recommendation" });
  }
});

/**
 * PATCH /ai-recommendations/:id
 *
 * Update a recommendation (e.g., mark as implemented)
 */
aiRecommendationsRouter.patch("/ai-recommendations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recommendation ID" });
    }

    const existing = await storage.getAIRecommendation(id);
    if (!existing) {
      return res.status(404).json({ message: "Recommendation not found" });
    }

    const updateData: any = { ...req.body };

    // Set timestamps based on status changes
    if (updateData.status === 'accepted' && !existing.acceptedAt) {
      updateData.acceptedAt = new Date();
    }
    if (updateData.status === 'dismissed' && !existing.dismissedAt) {
      updateData.dismissedAt = new Date();
    }
    if (updateData.status === 'implemented' && !existing.implementedAt) {
      updateData.implementedAt = new Date();
    }

    const updated = await storage.updateAIRecommendation(id, updateData);
    res.json(updated);
  } catch (err) {
    console.error("Error updating AI recommendation:", err);
    res.status(500).json({ message: "Error updating AI recommendation" });
  }
});

/**
 * DELETE /ai-recommendations/:id
 *
 * Delete a recommendation record
 */
aiRecommendationsRouter.delete("/ai-recommendations/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid recommendation ID" });
    }

    await storage.deleteAIRecommendation(id);
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting AI recommendation:", err);
    res.status(500).json({ message: "Error deleting AI recommendation" });
  }
});

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";
import { insertVolunteerStorySchema, insertStoryLikeSchema } from "@shared/schema";
import { handleValidationError } from "./utils";
import multer from "multer";

export const storiesRouter = Router();

type BroadcastFn = (type: string, data: any) => void;
let broadcastUpdate: BroadcastFn = () => {};

export function setBroadcastFn(fn: BroadcastFn) {
  broadcastUpdate = fn;
}

// Lazy-load object storage client
let objectStorageClient: any = null;
async function getObjectStorage() {
  if (!objectStorageClient) {
    const { Client } = await import("@replit/object-storage");
    objectStorageClient = new Client();
  }
  return objectStorageClient;
}

// Configure multer for memory storage (we'll upload to object storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ==================== Volunteer Stories Routes ====================

/**
 * GET /stories - List all published stories
 * Query params:
 *   - volunteerId: Filter by volunteer
 *   - projectId: Filter by project
 *   - featured: Filter featured stories only
 *   - limit: Limit number of results
 */
storiesRouter.get("/stories", async (req: Request, res: Response) => {
  try {
    const { volunteerId, projectId, featured, limit } = req.query;
    
    let stories = await storage.listVolunteerStories();
    
    // Filter by volunteer
    if (volunteerId) {
      stories = stories.filter((s: any) => s.volunteerId === parseInt(volunteerId as string));
    }
    
    // Filter by project
    if (projectId) {
      stories = stories.filter((s: any) => s.projectId === parseInt(projectId as string));
    }
    
    // Filter featured only
    if (featured === "true") {
      stories = stories.filter((s: any) => s.isFeatured);
    }
    
    // Only return published stories for public view (unless querying own stories)
    if (!volunteerId) {
      stories = stories.filter((s: any) => s.isPublished);
    }
    
    // Sort by newest first
    stories.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Limit results
    if (limit) {
      stories = stories.slice(0, parseInt(limit as string));
    }
    
    // Enrich with volunteer info
    const enrichedStories = await Promise.all(
      stories.map(async (story: any) => {
        const volunteer = await storage.getUser(story.volunteerId);
        const project = story.projectId ? await storage.getProject(story.projectId) : null;
        return {
          ...story,
          volunteerName: volunteer?.displayName || volunteer?.username || "Anonymous",
          volunteerAvatar: volunteer?.avatar,
          projectName: project?.name,
        };
      })
    );
    
    res.json(enrichedStories);
  } catch (err) {
    console.error("Error fetching stories:", err);
    res.status(500).json({ message: "Failed to fetch stories" });
  }
});

/**
 * GET /stories/:id - Get a single story by ID
 */
storiesRouter.get("/stories/:id", async (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.id);
    const story = await storage.getVolunteerStory(storyId);
    
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }
    
    // Increment view count
    await storage.updateVolunteerStory(storyId, {
      viewsCount: (story.viewsCount || 0) + 1,
    });
    
    // Enrich with volunteer and project info
    const volunteer = await storage.getUser(story.volunteerId);
    const project = story.projectId ? await storage.getProject(story.projectId) : null;
    const organization = story.organizationId ? await storage.getOrganization(story.organizationId) : null;
    
    res.json({
      ...story,
      viewsCount: (story.viewsCount || 0) + 1,
      volunteerName: volunteer?.displayName || volunteer?.username || "Anonymous",
      volunteerAvatar: volunteer?.avatar,
      projectName: project?.name,
      organizationName: organization?.name,
    });
  } catch (err) {
    console.error("Error fetching story:", err);
    res.status(500).json({ message: "Failed to fetch story" });
  }
});

/**
 * POST /stories - Create a new story
 */
storiesRouter.post("/stories", async (req: Request, res: Response) => {
  try {
    const storyData = insertVolunteerStorySchema.parse(req.body);
    const story = await storage.createVolunteerStory(storyData);
    
    broadcastUpdate("story_created", story);
    res.status(201).json(story);
  } catch (err) {
    const validationResult = handleValidationError(err);
    res.status(validationResult.status).json({ message: validationResult.message });
  }
});

/**
 * PUT /stories/:id - Update a story
 */
storiesRouter.put("/stories/:id", async (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.id);
    const existingStory = await storage.getVolunteerStory(storyId);
    
    if (!existingStory) {
      return res.status(404).json({ message: "Story not found" });
    }
    
    const updatedStory = await storage.updateVolunteerStory(storyId, req.body);
    
    broadcastUpdate("story_updated", updatedStory);
    res.json(updatedStory);
  } catch (err) {
    const validationResult = handleValidationError(err);
    res.status(validationResult.status).json({ message: validationResult.message });
  }
});

/**
 * DELETE /stories/:id - Delete a story
 */
storiesRouter.delete("/stories/:id", async (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.id);
    const existingStory = await storage.getVolunteerStory(storyId);
    
    if (!existingStory) {
      return res.status(404).json({ message: "Story not found" });
    }
    
    await storage.deleteVolunteerStory(storyId);
    
    broadcastUpdate("story_deleted", { id: storyId });
    res.status(204).send();
  } catch (err) {
    console.error("Error deleting story:", err);
    res.status(500).json({ message: "Failed to delete story" });
  }
});

/**
 * POST /stories/:id/photos - Upload photos for a story
 */
storiesRouter.post("/stories/:id/photos", upload.array("photos", 5), async (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.id);
    const story = await storage.getVolunteerStory(storyId);
    
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }
    
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ message: "No photos provided" });
    }
    
    const uploadedUrls: string[] = [];
    
    for (const file of files) {
      const fileName = `public/stories/${storyId}/${Date.now()}-${file.originalname}`;
      
      try {
        const objectStorage = await getObjectStorage();
        await objectStorage.uploadFromBytes(fileName, file.buffer);
        const publicUrl = `/api/storage/${encodeURIComponent(fileName)}`;
        uploadedUrls.push(publicUrl);
      } catch (uploadErr) {
        console.error("Error uploading to object storage:", uploadErr);
      }
    }
    
    // Update story with new photos
    const existingPhotos = story.photos || [];
    const updatedStory = await storage.updateVolunteerStory(storyId, {
      photos: [...existingPhotos, ...uploadedUrls],
    });
    
    res.json({ photos: uploadedUrls, story: updatedStory });
  } catch (err) {
    console.error("Error uploading photos:", err);
    res.status(500).json({ message: "Failed to upload photos" });
  }
});

/**
 * POST /stories/:id/like - Like a story
 */
storiesRouter.post("/stories/:id/like", async (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.id);
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    
    const story = await storage.getVolunteerStory(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }
    
    // Check if already liked
    const existingLike = await storage.getStoryLike(storyId, userId);
    if (existingLike) {
      return res.status(400).json({ message: "Already liked this story" });
    }
    
    // Create like
    await storage.createStoryLike({ storyId, userId });
    
    // Update story likes count
    const updatedStory = await storage.updateVolunteerStory(storyId, {
      likesCount: (story.likesCount || 0) + 1,
    });

    const newLikesCount = updatedStory?.likesCount ?? (story.likesCount || 0) + 1;
    broadcastUpdate("story_liked", { storyId, userId, likesCount: newLikesCount });
    res.json({ likesCount: newLikesCount });
  } catch (err) {
    console.error("Error liking story:", err);
    res.status(500).json({ message: "Failed to like story" });
  }
});

/**
 * DELETE /stories/:id/like - Unlike a story
 */
storiesRouter.delete("/stories/:id/like", async (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.id);
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }
    
    const story = await storage.getVolunteerStory(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }
    
    // Check if liked
    const existingLike = await storage.getStoryLike(storyId, userId);
    if (!existingLike) {
      return res.status(400).json({ message: "Not liked this story" });
    }
    
    // Remove like
    await storage.deleteStoryLike(storyId, userId);
    
    // Update story likes count
    const updatedStory = await storage.updateVolunteerStory(storyId, {
      likesCount: Math.max((story.likesCount || 0) - 1, 0),
    });

    const newLikesCount = updatedStory?.likesCount ?? Math.max((story.likesCount || 0) - 1, 0);
    broadcastUpdate("story_unliked", { storyId, userId, likesCount: newLikesCount });
    res.json({ likesCount: newLikesCount });
  } catch (err) {
    console.error("Error unliking story:", err);
    res.status(500).json({ message: "Failed to unlike story" });
  }
});

/**
 * GET /stories/:id/liked - Check if user liked a story
 */
storiesRouter.get("/stories/:id/liked", async (req: Request, res: Response) => {
  try {
    const storyId = parseInt(req.params.id);
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: "userId query param is required" });
    }
    
    const existingLike = await storage.getStoryLike(storyId, parseInt(userId as string));
    res.json({ liked: !!existingLike });
  } catch (err) {
    console.error("Error checking like status:", err);
    res.status(500).json({ message: "Failed to check like status" });
  }
});

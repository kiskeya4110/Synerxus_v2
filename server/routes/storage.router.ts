import { Router, type Request, type Response } from "express";
import multer from "multer";
import * as path from "path";
import * as fs from "fs";
import {
  validateImage,
  processImage,
  deleteImage,
  getImageBuffer,
  getMimeType,
  type ImageUploadOptions,
} from "../services/image-service";
import { IMAGE_CONFIG, type ImageType } from "../../shared/constants";
import { optionalAuthMiddleware } from "../middleware/auth";
import { logger } from "../logger";

export const storageRouter = Router();

// Apply optional auth to all storage routes - extracts user if token present
storageRouter.use(optionalAuthMiddleware);

// Configure multer for memory storage (process in memory before saving)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMAGE_CONFIG.MAX_FILE_SIZE,
  },
  fileFilter: (req, file, cb) => {
    const validation = validateImage(file);
    if (validation.valid) {
      cb(null, true);
    } else {
      cb(new Error(validation.error || "Invalid file"));
    }
  },
});

// Multer error handling middleware
function handleMulterError(err: any, req: Request, res: Response, next: Function) {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `File too large. Maximum size is ${IMAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    // Other errors (including file validation errors)
    logger.error("[Storage] Upload error:", err);
    return res.status(400).json({ message: err.message || "File upload failed" });
  }
  next();
}

/**
 * POST /upload - File upload endpoint with image processing
 *
 * Accepts multipart form data with a file and metadata.
 * Validates, processes, and stores the image.
 *
 * Form Data:
 *   - file: The image file to upload
 *
 * Query Parameters:
 *   - path: string (required) - The storage path for the file
 *   - imageType: string - Type of image (profile, logo, project_cover, spotlight, evidence)
 *   - userId: number - User ID for organization
 *   - organizationId: number - Organization ID
 *   - generateThumbnail: boolean - Whether to generate thumbnail (default: true)
 *
 * Response:
 *   - url: string - The URL to access the stored file
 *   - thumbnailUrl: string - URL for thumbnail (if generated)
 *   - path: string - The storage path of the file
 *   - width: number - Image width
 *   - height: number - Image height
 *   - fileSize: number - File size in bytes
 *   - isOptimized: boolean - Whether image was optimized
 *   - message: string - Success message
 */
storageRouter.post("/upload", upload.single("file"), handleMulterError, async (req: Request, res: Response) => {
  try {
    const pathParam = req.query.path as string;
    const authHeader = req.headers.authorization;

    logger.info(`[Storage] Upload attempt - path: ${pathParam}, hasAuth: ${!!authHeader}, hasFile: ${!!req.file}`);

    if (!pathParam) {
      logger.warn(`[Storage] Upload rejected: missing path parameter`);
      return res.status(400).json({ message: "path is required" });
    }

    // Security: Require authentication for uploads
    if (!req.user) {
      logger.warn(`[Storage] Unauthenticated upload attempt for path: ${pathParam}, authHeader: ${authHeader ? 'present' : 'missing'}`);
      return res.status(401).json({
        message: "Authentication required for file uploads. Please sign in again.",
        code: "AUTH_REQUIRED"
      });
    }

    logger.info(`[Storage] Upload request from user ${req.user.id} (${req.user.email}) for path: ${pathParam}, fileSize: ${req.file?.size || 0}`);

    // Parse options from query
    const imageType = (req.query.imageType as ImageType) || "profile";
    // Use authenticated user's ID by default for proper file ownership tracking
    const userId = req.query.userId ? parseInt(req.query.userId as string) : req.user.id;
    const organizationId = req.query.organizationId
      ? parseInt(req.query.organizationId as string)
      : req.user.organizationId || undefined;
    const generateThumbnail = req.query.generateThumbnail !== "false";

    // Security: Validate user ownership - users can only upload for themselves
    if (userId && userId !== req.user.id) {
      logger.warn(`[Storage] User ${req.user.id} attempted upload for different user ${userId}`);
      return res.status(403).json({ message: "Cannot upload files for other users" });
    }

    // Security: Validate organization ownership - users can only upload for their own organization
    if (organizationId && req.user.organizationId && req.user.organizationId !== organizationId) {
      logger.warn(`[Storage] User ${req.user.id} (org: ${req.user.organizationId}) attempted upload for org ${organizationId}`);
      return res.status(403).json({ message: "Cannot upload files for other organizations" });
    }

    // If file was uploaded via multer
    if (req.file) {
      const validation = validateImage(req.file);
      if (!validation.valid) {
        return res.status(400).json({ message: validation.error });
      }

      const options: ImageUploadOptions = {
        imageType,
        userId,
        organizationId,
        generateThumbnail,
      };

      logger.info(`[Storage] Processing ${imageType} image for user ${userId}`);

      const processed = await processImage(req.file.buffer, options);

      // Extract actual storage path from URL for deletion support
      // URL format: /api/storage/profiles/profile-123-abc.jpg → profiles/profile-123-abc.jpg
      const actualStoragePath = processed.url.replace('/api/storage/', '');

      return res.json({
        url: processed.url,
        thumbnailUrl: processed.thumbnailUrl,
        path: actualStoragePath,
        width: processed.width,
        height: processed.height,
        fileSize: processed.fileSize,
        mimeType: processed.mimeType,
        isOptimized: processed.isOptimized,
        message: "File uploaded successfully",
      });
    }

    // Fallback for non-multipart requests (legacy support)
    const fileUrl = `/api/storage/${encodeURIComponent(pathParam)}`;

    res.json({
      url: fileUrl,
      path: pathParam,
      message: "File upload request received (no file data)",
    });
  } catch (err: any) {
    console.error("Error uploading file:", err);
    res.status(500).json({
      message: err.message || "Failed to upload file",
    });
  }
});

/**
 * DELETE /upload - File deletion endpoint
 *
 * Deletes a file from storage based on the provided path.
 *
 * Request Body:
 *   - path: string (required) - The storage path or URL of the file to delete
 *
 * Response:
 *   - message: string - Success message
 *   - deleted: boolean - Whether file was deleted
 */
storageRouter.delete("/upload", async (req: Request, res: Response) => {
  try {
    const { path: filePath } = req.body;

    if (!filePath) {
      return res.status(400).json({ message: "path is required" });
    }

    // Security: Require authentication for file deletion
    if (!req.user) {
      logger.warn(`[Storage] Unauthenticated delete attempt for path: ${filePath}`);
      return res.status(401).json({ message: "Authentication required for file deletion" });
    }

    // Security: Validate the file belongs to the user/org
    // Files are stored with user/org identifiers in path
    // Format: profiles/profile-u{userId}-{timestamp}-{random}.jpg or profile-o{orgId}-{timestamp}-{random}.jpg
    const pathLower = filePath.toLowerCase();
    const isOwnFile =
      pathLower.includes(`-u${req.user.id}-`) ||  // User ID format: -u123-
      pathLower.includes(`-${req.user.id}-`) ||   // Legacy format: -123-
      pathLower.includes(`/${req.user.id}-`) ||   // Path-based format: /123-
      (req.user.organizationId && (
        pathLower.includes(`-o${req.user.organizationId}-`) ||  // Org ID format: -o456-
        pathLower.includes(`org-${req.user.organizationId}`)     // Legacy org format
      ));

    if (!isOwnFile) {
      logger.warn(`[Storage] User ${req.user.id} attempted to delete file they don't own: ${filePath}`);
      return res.status(403).json({ message: "Cannot delete files belonging to other users" });
    }

    logger.info(`[Storage] User ${req.user.id} deleting file: ${filePath}`);

    const deleted = await deleteImage(filePath);

    res.json({
      message: deleted ? "File deleted successfully" : "File not found or already deleted",
      deleted,
    });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ message: "Failed to delete file" });
  }
});

/**
 * GET /storage/:filePath(*) - File retrieval endpoint
 *
 * Retrieves and serves a stored file.
 * Supports wildcard path matching to handle nested directories.
 * Sets appropriate cache headers for performance.
 *
 * URL Parameters:
 *   - filePath: string - The path to the file in storage (supports nested paths)
 *
 * Response:
 *   - On success: File content with appropriate content-type and cache headers
 *   - On error: JSON error message
 */
storageRouter.get("/storage/:filePath(*)", async (req: Request, res: Response) => {
  try {
    const filePath = req.params.filePath;

    if (!filePath) {
      return res.status(400).json({ message: "File path is required" });
    }

    // Security: Prevent path traversal attacks
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
    if (normalizedPath !== filePath || filePath.includes("..")) {
      return res.status(403).json({ message: "Invalid file path" });
    }

    const imageUrl = `/api/storage/${filePath}`;
    const buffer = getImageBuffer(imageUrl);

    if (!buffer) {
      return res.status(404).json({ message: "File not found" });
    }

    // Get MIME type from file extension
    const mimeType = getMimeType(filePath);

    // Set cache headers for performance
    res.set({
      "Content-Type": mimeType,
      "Content-Length": buffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable", // 1 year cache
      ETag: `"${Buffer.from(filePath).toString("base64")}"`,
    });

    res.send(buffer);
  } catch (err) {
    console.error("Error retrieving file:", err);
    res.status(500).json({ message: "Failed to retrieve file" });
  }
});

/**
 * GET /storage/info/:filePath(*) - File metadata endpoint
 *
 * Returns metadata about a stored file without serving the content.
 *
 * URL Parameters:
 *   - filePath: string - The path to the file in storage
 *
 * Response:
 *   - exists: boolean - Whether the file exists
 *   - size: number - File size in bytes
 *   - mimeType: string - MIME type of the file
 */
storageRouter.get("/storage/info/:filePath(*)", async (req: Request, res: Response) => {
  try {
    const filePath = req.params.filePath;

    if (!filePath) {
      return res.status(400).json({ message: "File path is required" });
    }

    const imageUrl = `/api/storage/${filePath}`;
    const buffer = getImageBuffer(imageUrl);

    if (!buffer) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      size: buffer.length,
      mimeType: getMimeType(filePath),
    });
  } catch (err) {
    console.error("Error getting file info:", err);
    res.status(500).json({ message: "Failed to get file info" });
  }
});

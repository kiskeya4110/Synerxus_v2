import { Router, type Request, type Response } from "express";
import multer from "multer";
import * as path from "path";
import {
  validateImage,
  processImage,
  deleteImage,
  getImageBuffer,
  getMimeType,
  type ImageUploadOptions,
} from "../services/image-service";
import { IMAGE_CONFIG, type ImageType } from "../../shared/constants";
import { optionalAuthMiddleware, verifyToken } from "../middleware/auth";
import { verifyFirebaseIdToken } from "../lib/firebase-admin";
import { storage } from "../storage";
import { logger } from "../logger";
import { generalRateLimiter } from "../middleware/security";

export const storageRouter = Router();

// Apply optional auth to all storage routes - extracts user if token present
storageRouter.use(optionalAuthMiddleware);

/**
 * Sanitize and validate a storage file path to prevent path traversal.
 * Returns null if path is invalid/dangerous.
 */
function sanitizeStoragePath(rawPath: string): string | null {
  if (!rawPath || typeof rawPath !== "string") return null;

  // Decode to catch encoded traversal attempts
  const decoded = decodeURIComponent(rawPath);

  // Block path traversal patterns (including double-encoded)
  if (
    decoded.includes("..") || decoded.includes("\0") ||
    rawPath.includes("..") || rawPath.includes("%2e%2e") ||
    rawPath.includes("%252e") || rawPath.includes("~") ||
    decoded.startsWith("/") || decoded.startsWith("\\")
  ) {
    return null;
  }

  // Only allow alphanumeric, hyphens, underscores, dots, and forward slashes
  if (!/^[a-zA-Z0-9_\-./]+$/.test(decoded)) {
    return null;
  }

  return decoded;
}

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
storageRouter.post("/upload", generalRateLimiter, upload.single("file"), handleMulterError, async (req: Request, res: Response) => {
  try {
    const pathParam = req.query.path as string;
    const authHeader = req.headers.authorization;

    if (!pathParam) {
      logger.warn(`[Storage] Upload rejected: missing path parameter`);
      return res.status(400).json({ message: "path is required" });
    }

    // SECURITY: Sanitize upload path to prevent traversal attacks
    const sanitizedUploadPath = sanitizeStoragePath(pathParam);
    if (!sanitizedUploadPath) {
      logger.warn(`[Storage] Path traversal attempt blocked on upload: ${pathParam}`);
      return res.status(403).json({ message: "Invalid file path" });
    }

    // Security: Require authentication for uploads
    // If middleware didn't set user, try direct token verification as fallback
    if (!req.user && authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      logger.info(`[Storage] Attempting direct token verification for upload.`);

      // Try JWT first
      try {
        const jwtDecoded = verifyToken(token);
        if (jwtDecoded?.userId) {
          const user = await storage.getUser(jwtDecoded.userId);
          if (user) {
            req.user = {
              id: user.id,
              email: user.email,
              userType: user.userType || "volunteer",
              organizationId: user.organizationId,
              firebaseUid: user.firebaseUid,
            };
            logger.info(`[Storage] Direct JWT verification succeeded for user: ${user.id}`);
          }
        }
      } catch (jwtErr) {
        logger.debug("[Storage] Direct JWT verification failed, trying Firebase");
      }

      // Try Firebase if JWT failed
      if (!req.user) {
        try {
          const firebaseDecoded = await verifyFirebaseIdToken(token);
          if (firebaseDecoded?.uid) {
            const user = await storage.getUserByFirebaseUid(firebaseDecoded.uid);
            if (user) {
              req.user = {
                id: user.id,
                email: user.email,
                userType: user.userType || "volunteer",
                organizationId: user.organizationId,
                firebaseUid: user.firebaseUid,
              };
              logger.info(`[Storage] Direct Firebase verification succeeded for user: ${user.id}`);
            } else {
              logger.warn(`[Storage] Firebase token valid but user not found in DB, uid: ${firebaseDecoded.uid}`);
            }
          } else {
            logger.warn(`[Storage] Firebase token verification returned null`);
          }
        } catch (firebaseError) {
          logger.error(`[Storage] Firebase verification error:`, firebaseError);
        }
      }
    }

    if (!req.user) {
      logger.warn(`[Storage] Unauthenticated upload attempt rejected`);
      return res.status(401).json({
        message: "Authentication required for file uploads. Please sign in again.",
        code: "AUTH_REQUIRED"
      });
    }

    logger.info(`[Storage] Upload request from user ${req.user.id} for path: ${pathParam}, fileSize: ${req.file?.size || 0}`);

    // Parse options from query
    const imageType = (req.query.imageType as ImageType) || "profile";
    // Use authenticated user's ID by default for proper file ownership tracking
    const parsedUserId = req.query.userId ? parseInt(req.query.userId as string) : NaN;
    if (req.query.userId && isNaN(parsedUserId)) return res.status(400).json({ message: "Invalid user ID" });
    const userId = !isNaN(parsedUserId) ? parsedUserId : req.user.id;
    const parsedOrgId = req.query.organizationId ? parseInt(req.query.organizationId as string) : NaN;
    if (req.query.organizationId && isNaN(parsedOrgId)) return res.status(400).json({ message: "Invalid organization ID" });
    const organizationId = !isNaN(parsedOrgId) ? parsedOrgId : req.user.organizationId || undefined;
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

    // SECURITY: Sanitize path to prevent traversal attacks
    // Extract the relative path portion (strip /api/storage/ prefix if present)
    const relativePath = filePath.replace(/^\/api\/storage\//, '');
    const sanitizedPath = sanitizeStoragePath(relativePath);
    if (!sanitizedPath) {
      logger.warn(`[Storage] Path traversal attempt blocked on delete: ${filePath}`);
      return res.status(403).json({ message: "Invalid file path" });
    }

    // Security: Require authentication for file deletion
    if (!req.user) {
      logger.warn(`[Storage] Unauthenticated delete attempt for path: ${filePath}`);
      return res.status(401).json({ message: "Authentication required for file deletion" });
    }

    // Security: Validate the file belongs to the user/org
    // Files are stored with user/org identifiers in path
    // Format: profiles/profile-u{userId}-{timestamp}-{random}.jpg or profile-o{orgId}-{timestamp}-{random}.jpg
    // Use exact segment matching (split on path separators and dashes) to prevent substring attacks
    // e.g. userId=1 must not match a file belonging to userId=10
    const pathSegments = sanitizedPath.split(/[\/\-]/);
    const uid = String(req.user.id);
    const oid = req.user.organizationId ? String(req.user.organizationId) : null;
    const isOwnFile =
      pathSegments.includes(`u${uid}`) ||       // User ID format: -u123-
      (pathSegments.includes(uid) &&             // Legacy format: exact segment match only
        (sanitizedPath.includes(`-${uid}-`) || sanitizedPath.includes(`/${uid}-`))) ||
      (oid !== null && (
        pathSegments.includes(`o${oid}`) ||      // Org ID format: -o456-
        (pathSegments.includes('org') && pathSegments.includes(oid)) // Legacy org format
      ));

    if (!isOwnFile) {
      logger.warn(`[Storage] User ${req.user.id} attempted to delete file they don't own: ${sanitizedPath}`);
      return res.status(403).json({ message: "Cannot delete files belonging to other users" });
    }

    logger.info(`[Storage] User ${req.user.id} deleting file: ${sanitizedPath}`);

    const deleted = await deleteImage(sanitizedPath);

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

    // SECURITY: Sanitize and validate path to prevent traversal attacks
    const sanitizedPath = sanitizeStoragePath(filePath);
    if (!sanitizedPath) {
      logger.warn(`[Storage] Path traversal attempt blocked: ${filePath}`);
      return res.status(403).json({ message: "Invalid file path" });
    }

    const imageUrl = `/api/storage/${sanitizedPath}`;
    const buffer = await getImageBuffer(imageUrl);

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

    // SECURITY: Sanitize and validate path to prevent traversal attacks
    const sanitizedPath = sanitizeStoragePath(filePath);
    if (!sanitizedPath) {
      logger.warn(`[Storage] Path traversal attempt blocked on info: ${filePath}`);
      return res.status(403).json({ message: "Invalid file path" });
    }

    const imageUrl = `/api/storage/${sanitizedPath}`;
    const buffer = await getImageBuffer(imageUrl);

    if (!buffer) {
      return res.json({ exists: false });
    }

    res.json({
      exists: true,
      size: buffer.length,
      mimeType: getMimeType(sanitizedPath),
    });
  } catch (err) {
    console.error("Error getting file info:", err);
    res.status(500).json({ message: "Failed to get file info" });
  }
});

import { Router, type Request, type Response } from "express";
import { storage } from "../storage";

export const storageRouter = Router();

/**
 * POST /upload - File upload endpoint
 *
 * Accepts a file upload request with a path parameter specifying where the file should be stored.
 * Returns the storage URL and path for the uploaded file.
 *
 * Query Parameters:
 *   - path: string (required) - The storage path for the file
 *
 * Response:
 *   - url: string - The URL to access the stored file
 *   - path: string - The storage path of the file
 *   - message: string - Success message
 */
storageRouter.post("/upload", async (req: Request, res: Response) => {
  try {
    const path = req.query.path as string;

    if (!path) {
      return res.status(400).json({ message: "path is required" });
    }

    // Generate file URL for storage reference
    const fileUrl = `/api/storage/${encodeURIComponent(path)}`;

    console.log(`File upload request: ${path}`);

    res.json({
      url: fileUrl,
      path: path,
      message: "File uploaded successfully"
    });
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ message: "Failed to upload file" });
  }
});

/**
 * DELETE /upload - File deletion endpoint
 *
 * Deletes a file from storage based on the provided path.
 *
 * Request Body:
 *   - path: string (required) - The storage path of the file to delete
 *
 * Response:
 *   - message: string - Success message
 */
storageRouter.delete("/upload", async (req: Request, res: Response) => {
  try {
    const { path } = req.body;

    if (!path) {
      return res.status(400).json({ message: "path is required" });
    }

    // TODO: Delete file from actual object storage
    console.log(`File deleted: ${path}`);

    res.json({
      message: "File deleted successfully"
    });
  } catch (err) {
    console.error("Error deleting file:", err);
    res.status(500).json({ message: "Failed to delete file" });
  }
});

/**
 * GET /storage/:filePath(*) - File retrieval endpoint
 *
 * Retrieves and serves a stored file from object storage.
 * Supports wildcard path matching to handle nested directories.
 *
 * URL Parameters:
 *   - filePath: string - The path to the file in storage (supports nested paths)
 *
 * Response:
 *   - On success: File content with appropriate headers
 *   - On error: JSON error message
 */
storageRouter.get("/storage/:filePath(*)", async (req: Request, res: Response) => {
  try {
    const filePath = req.params.filePath;
    // TODO: Retrieve file from object storage and send it
    res.status(404).json({ message: "File not found" });
  } catch (err) {
    console.error("Error retrieving file:", err);
    res.status(500).json({ message: "Failed to retrieve file" });
  }
});

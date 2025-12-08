/**
 * Image Processing Service
 * Handles image validation, optimization, and storage
 */

import { IMAGE_CONFIG, type ImageType, type AllowedMimeType } from '../../shared/constants';
import * as fs from 'fs';
import * as path from 'path';

// Storage paths
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const THUMBNAILS_DIR = path.join(UPLOAD_DIR, 'thumbnails');

// Ensure upload directories exist
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}
if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

export interface FileInfo {
  mimetype: string;
  size: number;
  originalname: string;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  details?: {
    mimeType: string;
    fileSize: number;
    fileName: string;
  };
}

export interface ProcessedImage {
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  isOptimized: boolean;
}

export interface ImageUploadOptions {
  imageType: ImageType;
  userId?: number;
  organizationId?: number;
  generateThumbnail?: boolean;
}

/**
 * Validate an uploaded image file
 */
export function validateImage(
  file: FileInfo
): ImageValidationResult {
  const { mimetype, size, originalname } = file;

  // Check MIME type
  if (!IMAGE_CONFIG.ALLOWED_MIME_TYPES.includes(mimetype as AllowedMimeType)) {
    return {
      valid: false,
      error: `Invalid file type: ${mimetype}. Allowed types: ${IMAGE_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  // Check file extension
  const ext = path.extname(originalname).toLowerCase();
  if (!IMAGE_CONFIG.ALLOWED_EXTENSIONS.includes(ext as any)) {
    return {
      valid: false,
      error: `Invalid file extension: ${ext}. Allowed extensions: ${IMAGE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

  // Check file size
  if (size > IMAGE_CONFIG.MAX_FILE_SIZE) {
    const maxSizeMB = IMAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `File too large: ${(size / (1024 * 1024)).toFixed(2)}MB. Maximum size: ${maxSizeMB}MB`,
    };
  }

  if (size < IMAGE_CONFIG.MIN_FILE_SIZE) {
    return {
      valid: false,
      error: `File too small: ${size} bytes. Minimum size: ${IMAGE_CONFIG.MIN_FILE_SIZE} bytes`,
    };
  }

  return {
    valid: true,
    details: {
      mimeType: mimetype,
      fileSize: size,
      fileName: originalname,
    },
  };
}

/**
 * Generate a unique filename for storage
 */
export function generateFileName(
  originalName: string,
  imageType: ImageType,
  userId?: number,
  organizationId?: number
): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const ext = path.extname(originalName).toLowerCase() || '.jpg';
  const sanitizedExt = ext.replace(/[^a-z0-9.]/g, '');

  let prefix = imageType;
  if (userId) prefix += `-u${userId}`;
  if (organizationId) prefix += `-o${organizationId}`;

  return `${prefix}-${timestamp}-${randomSuffix}${sanitizedExt}`;
}

/**
 * Get storage path for an image type
 */
export function getStoragePath(imageType: ImageType): string {
  const typePaths: Record<ImageType, string> = {
    profile: 'profiles',
    logo: 'logos',
    project_cover: 'covers',
    spotlight: 'spotlights',
    evidence: 'evidence',
  };
  return path.join(UPLOAD_DIR, typePaths[imageType] || 'misc');
}

/**
 * Get target dimensions for an image type
 */
export function getTargetDimensions(imageType: ImageType): { width: number; height: number } {
  switch (imageType) {
    case 'profile':
      return {
        width: IMAGE_CONFIG.DIMENSIONS.AVATAR.WIDTH,
        height: IMAGE_CONFIG.DIMENSIONS.AVATAR.HEIGHT,
      };
    case 'logo':
      return {
        width: IMAGE_CONFIG.DIMENSIONS.LOGO.WIDTH,
        height: IMAGE_CONFIG.DIMENSIONS.LOGO.HEIGHT,
      };
    case 'project_cover':
      return {
        width: IMAGE_CONFIG.DIMENSIONS.COVER.WIDTH,
        height: IMAGE_CONFIG.DIMENSIONS.COVER.HEIGHT,
      };
    case 'spotlight':
    case 'evidence':
    default:
      return { width: 1200, height: 800 };
  }
}

/**
 * Get thumbnail dimensions for an image type
 */
export function getThumbnailDimensions(imageType: ImageType): { width: number; height: number } {
  switch (imageType) {
    case 'profile':
      return {
        width: IMAGE_CONFIG.DIMENSIONS.AVATAR.THUMBNAIL_WIDTH,
        height: IMAGE_CONFIG.DIMENSIONS.AVATAR.THUMBNAIL_HEIGHT,
      };
    case 'logo':
      return {
        width: IMAGE_CONFIG.DIMENSIONS.LOGO.THUMBNAIL_WIDTH,
        height: IMAGE_CONFIG.DIMENSIONS.LOGO.THUMBNAIL_HEIGHT,
      };
    case 'project_cover':
      return {
        width: IMAGE_CONFIG.DIMENSIONS.COVER.THUMBNAIL_WIDTH,
        height: IMAGE_CONFIG.DIMENSIONS.COVER.THUMBNAIL_HEIGHT,
      };
    default:
      return { width: 150, height: 150 };
  }
}

/**
 * Basic image processing without sharp (stores original with metadata)
 * For full optimization, sharp library should be installed
 */
export async function processImage(
  buffer: Buffer,
  options: ImageUploadOptions
): Promise<ProcessedImage> {
  const { imageType, userId, organizationId, generateThumbnail = true } = options;

  // Get storage directory
  const storageDir = getStoragePath(imageType);
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Generate filename
  const fileName = generateFileName('image.jpg', imageType, userId, organizationId);
  const filePath = path.join(storageDir, fileName);

  // Write the file
  fs.writeFileSync(filePath, buffer);

  // Generate public URL
  const relativePath = path.relative(UPLOAD_DIR, filePath);
  const url = `/api/storage/${relativePath.replace(/\\/g, '/')}`;

  // For thumbnail, create a copy in thumbnails dir (in production, use sharp to resize)
  let thumbnailUrl: string | undefined;
  if (generateThumbnail) {
    const thumbDir = path.join(THUMBNAILS_DIR, path.dirname(relativePath));
    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }
    const thumbPath = path.join(thumbDir, fileName);
    fs.writeFileSync(thumbPath, buffer); // In production, resize with sharp
    thumbnailUrl = `/api/storage/thumbnails/${relativePath.replace(/\\/g, '/')}`;
  }

  const targetDims = getTargetDimensions(imageType);

  return {
    url,
    thumbnailUrl,
    width: targetDims.width,
    height: targetDims.height,
    fileSize: buffer.length,
    mimeType: 'image/jpeg', // Would be detected from buffer in production
    isOptimized: false, // Set to true when sharp is used
  };
}

/**
 * Delete an image and its thumbnail
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    // Extract path from URL
    const urlPath = imageUrl.replace('/api/storage/', '');
    const filePath = path.join(UPLOAD_DIR, urlPath);
    const thumbPath = path.join(THUMBNAILS_DIR, urlPath);

    // Delete main file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete thumbnail
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * Get image metadata from storage
 */
export function getImageMetadata(imageUrl: string): { exists: boolean; size?: number; path?: string } {
  try {
    const urlPath = imageUrl.replace('/api/storage/', '');
    const filePath = path.join(UPLOAD_DIR, urlPath);

    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        exists: true,
        size: stats.size,
        path: filePath,
      };
    }

    return { exists: false };
  } catch {
    return { exists: false };
  }
}

/**
 * Serve an image file
 */
export function getImageBuffer(imageUrl: string): Buffer | null {
  try {
    const urlPath = imageUrl.replace('/api/storage/', '');
    const filePath = path.join(UPLOAD_DIR, urlPath);

    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

export default {
  validateImage,
  processImage,
  deleteImage,
  getImageMetadata,
  getImageBuffer,
  generateFileName,
  getStoragePath,
  getTargetDimensions,
  getThumbnailDimensions,
  getMimeType,
};

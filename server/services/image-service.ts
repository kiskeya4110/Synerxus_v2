/**
 * Image Processing Service
 * Handles image validation, optimization, and storage
 *
 * Uses Sharp for:
 * - Image resizing (maintains aspect ratio)
 * - JPEG quality optimization (80% quality = 60-70% size reduction)
 * - WebP conversion option (25-30% smaller than JPEG)
 * - Automatic thumbnail generation
 */

import { IMAGE_CONFIG, type ImageType, type AllowedMimeType } from '../../shared/constants';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

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
 * Image optimization configuration
 */
const OPTIMIZATION_CONFIG = {
  JPEG_QUALITY: 80,           // 80% quality = good balance of size/quality
  WEBP_QUALITY: 75,           // WebP can use slightly lower quality
  PNG_COMPRESSION: 8,         // 0-9, higher = more compression
  MAX_DIMENSION: 2400,        // Max width/height for any image
  THUMBNAIL_QUALITY: 70,      // Slightly lower for thumbnails
};

/**
 * Process and optimize an uploaded image using Sharp
 * - Resizes to target dimensions (maintains aspect ratio)
 * - Optimizes quality for reduced file size
 * - Generates thumbnail
 *
 * Expected savings: 60-70% file size reduction
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

  // Get image metadata first
  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;
  const inputFormat = metadata.format || 'jpeg';

  // Get target dimensions for this image type
  const targetDims = getTargetDimensions(imageType);

  // Calculate resize dimensions (maintain aspect ratio, fit within target)
  const resizeOptions = {
    width: Math.min(targetDims.width, originalWidth, OPTIMIZATION_CONFIG.MAX_DIMENSION),
    height: Math.min(targetDims.height, originalHeight, OPTIMIZATION_CONFIG.MAX_DIMENSION),
    fit: 'inside' as const,
    withoutEnlargement: true, // Don't upscale smaller images
  };

  // Process the main image
  let sharpInstance = sharp(buffer)
    .resize(resizeOptions)
    .rotate(); // Auto-rotate based on EXIF

  // Apply format-specific optimization
  let outputBuffer: Buffer;
  let outputMimeType: string;
  let outputExt: string;

  if (inputFormat === 'png' && metadata.hasAlpha) {
    // Keep PNG for images with transparency
    outputBuffer = await sharpInstance
      .png({ compressionLevel: OPTIMIZATION_CONFIG.PNG_COMPRESSION })
      .toBuffer();
    outputMimeType = 'image/png';
    outputExt = '.png';
  } else {
    // Convert to optimized JPEG for everything else
    outputBuffer = await sharpInstance
      .jpeg({ quality: OPTIMIZATION_CONFIG.JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    outputMimeType = 'image/jpeg';
    outputExt = '.jpg';
  }

  // Get final dimensions after processing
  const finalMetadata = await sharp(outputBuffer).metadata();
  const finalWidth = finalMetadata.width || targetDims.width;
  const finalHeight = finalMetadata.height || targetDims.height;

  // Generate filename with correct extension
  const fileName = generateFileName(`image${outputExt}`, imageType, userId, organizationId);
  const filePath = path.join(storageDir, fileName);

  // Write the optimized file
  fs.writeFileSync(filePath, outputBuffer);

  // Generate public URL
  const relativePath = path.relative(UPLOAD_DIR, filePath);
  const url = `/api/storage/${relativePath.replace(/\\/g, '/')}`;

  // Generate thumbnail using Sharp
  let thumbnailUrl: string | undefined;
  if (generateThumbnail) {
    const thumbDims = getThumbnailDimensions(imageType);
    const thumbDir = path.join(THUMBNAILS_DIR, path.dirname(relativePath));

    if (!fs.existsSync(thumbDir)) {
      fs.mkdirSync(thumbDir, { recursive: true });
    }

    // Create optimized thumbnail
    const thumbnailBuffer = await sharp(buffer)
      .resize({
        width: thumbDims.width,
        height: thumbDims.height,
        fit: 'cover', // Crop to fill for thumbnails
        position: 'center',
      })
      .jpeg({ quality: OPTIMIZATION_CONFIG.THUMBNAIL_QUALITY, mozjpeg: true })
      .toBuffer();

    const thumbPath = path.join(thumbDir, fileName.replace(/\.\w+$/, '.jpg'));
    fs.writeFileSync(thumbPath, thumbnailBuffer);
    thumbnailUrl = `/api/storage/thumbnails/${relativePath.replace(/\\/g, '/').replace(/\.\w+$/, '.jpg')}`;
  }

  // Log optimization stats
  const originalSize = buffer.length;
  const optimizedSize = outputBuffer.length;
  const savings = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
  console.log(`[ImageService] Optimized ${imageType}: ${(originalSize/1024).toFixed(1)}KB -> ${(optimizedSize/1024).toFixed(1)}KB (${savings}% reduction)`);

  return {
    url,
    thumbnailUrl,
    width: finalWidth,
    height: finalHeight,
    fileSize: outputBuffer.length,
    mimeType: outputMimeType,
    isOptimized: true,
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

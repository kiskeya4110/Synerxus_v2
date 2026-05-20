import { IMAGE_CONFIG, type ImageType, type AllowedMimeType } from '../../shared/constants';
import * as path from 'path';
import sharp from 'sharp';
import { Client } from '@replit/object-storage';

const storageClient = new Client();

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

  if (!IMAGE_CONFIG.ALLOWED_MIME_TYPES.includes(mimetype as AllowedMimeType)) {
    return {
      valid: false,
      error: `Invalid file type: ${mimetype}. Allowed types: ${IMAGE_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  const ext = path.extname(originalname).toLowerCase();
  if (!IMAGE_CONFIG.ALLOWED_EXTENSIONS.includes(ext as any)) {
    return {
      valid: false,
      error: `Invalid file extension: ${ext}. Allowed extensions: ${IMAGE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }

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
 * Get object storage key prefix for an image type
 */
export function getStoragePath(imageType: ImageType): string {
  const typePaths: Record<ImageType, string> = {
    profile: 'profiles',
    logo: 'logos',
    project_cover: 'covers',
    spotlight: 'spotlights',
    evidence: 'evidence',
  };
  return typePaths[imageType] || 'misc';
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

const OPTIMIZATION_CONFIG = {
  JPEG_QUALITY: 80,
  WEBP_QUALITY: 75,
  PNG_COMPRESSION: 8,
  MAX_DIMENSION: 2400,
  THUMBNAIL_QUALITY: 70,
};

/**
 * Process and optimize an uploaded image, then store in object storage.
 */
export async function processImage(
  buffer: Buffer,
  options: ImageUploadOptions
): Promise<ProcessedImage> {
  const { imageType, userId, organizationId, generateThumbnail = true } = options;

  const metadata = await sharp(buffer).metadata();
  const originalWidth = metadata.width || 800;
  const originalHeight = metadata.height || 600;
  const inputFormat = metadata.format || 'jpeg';

  const targetDims = getTargetDimensions(imageType);

  const resizeOptions = {
    width: Math.min(targetDims.width, originalWidth, OPTIMIZATION_CONFIG.MAX_DIMENSION),
    height: Math.min(targetDims.height, originalHeight, OPTIMIZATION_CONFIG.MAX_DIMENSION),
    fit: 'inside' as const,
    withoutEnlargement: true,
  };

  let sharpInstance = sharp(buffer)
    .resize(resizeOptions)
    .rotate();

  let outputBuffer: Buffer;
  let outputMimeType: string;
  let outputExt: string;

  if (inputFormat === 'png' && metadata.hasAlpha) {
    outputBuffer = await sharpInstance
      .png({ compressionLevel: OPTIMIZATION_CONFIG.PNG_COMPRESSION })
      .toBuffer();
    outputMimeType = 'image/png';
    outputExt = '.png';
  } else {
    outputBuffer = await sharpInstance
      .jpeg({ quality: OPTIMIZATION_CONFIG.JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    outputMimeType = 'image/jpeg';
    outputExt = '.jpg';
  }

  const finalMetadata = await sharp(outputBuffer).metadata();
  const finalWidth = finalMetadata.width || targetDims.width;
  const finalHeight = finalMetadata.height || targetDims.height;

  const fileName = generateFileName(`image${outputExt}`, imageType, userId, organizationId);
  const keyPrefix = getStoragePath(imageType);
  const storageKey = `${keyPrefix}/${fileName}`;

  await storageClient.uploadFromBytes(storageKey, outputBuffer);

  const url = `/api/storage/${storageKey}`;

  let thumbnailUrl: string | undefined;
  if (generateThumbnail) {
    const thumbDims = getThumbnailDimensions(imageType);

    const thumbnailBuffer = await sharp(buffer)
      .resize({
        width: thumbDims.width,
        height: thumbDims.height,
        fit: 'cover',
        position: 'center',
      })
      .jpeg({ quality: OPTIMIZATION_CONFIG.THUMBNAIL_QUALITY, mozjpeg: true })
      .toBuffer();

    const thumbKey = `thumbnails/${keyPrefix}/${fileName.replace(/\.\w+$/, '.jpg')}`;
    await storageClient.uploadFromBytes(thumbKey, thumbnailBuffer);
    thumbnailUrl = `/api/storage/${thumbKey}`;
  }

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
 * Delete an image and its thumbnail from object storage
 */
export async function deleteImage(imageUrl: string): Promise<boolean> {
  try {
    const storageKey = imageUrl.replace('/api/storage/', '');
    const thumbKey = `thumbnails/${storageKey}`;

    await storageClient.delete(storageKey, { ignoreNotFound: true });
    await storageClient.delete(thumbKey, { ignoreNotFound: true });

    return true;
  } catch (error) {
    console.error('Error deleting image:', error);
    return false;
  }
}

/**
 * Get image metadata from object storage
 */
export async function getImageMetadata(imageUrl: string): Promise<{ exists: boolean; size?: number; path?: string }> {
  try {
    const storageKey = imageUrl.replace('/api/storage/', '');
    const result = await storageClient.exists(storageKey);
    return { exists: result.ok && result.value === true };
  } catch {
    return { exists: false };
  }
}

/**
 * Download an image buffer from object storage
 */
export async function getImageBuffer(imageUrl: string): Promise<Buffer | null> {
  try {
    const storageKey = imageUrl.replace('/api/storage/', '');
    const result = await storageClient.downloadAsBytes(storageKey);
    if (result.ok && result.value) {
      return result.value[0];
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

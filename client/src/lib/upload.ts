import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file to Firebase Storage
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'profile-photos/user-123.jpg')
 * @returns Promise with the download URL and storage path
 */
export async function uploadFile(file: File, path: string): Promise<UploadResult> {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    
    return {
      url,
      path: snapshot.ref.fullPath,
    };
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file. Please try again.");
  }
}

/**
 * Upload a profile photo for a user
 * @param file - The image file to upload
 * @param userId - The user's ID or email
 * @param userType - Type of user ('volunteer' or 'organization')
 * @returns Promise with the download URL and storage path
 */
export async function uploadProfilePhoto(
  file: File,
  userId: string,
  userType: 'volunteer' | 'organization'
): Promise<UploadResult> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB');
  }

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop();
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${sanitizedUserId}-${timestamp}.${fileExtension}`;
  const path = `profile-photos/${userType}/${filename}`;

  return uploadFile(file, path);
}

/**
 * Delete a file from Firebase Storage
 * @param path - The storage path of the file to delete
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting file:", error);
    // Don't throw error if file doesn't exist
    if ((error as any).code !== 'storage/object-not-found') {
      throw new Error("Failed to delete file");
    }
  }
}

/**
 * Extract storage path from a Firebase Storage URL
 * @param url - The Firebase Storage download URL
 * @returns The storage path or null if not a valid Firebase Storage URL
 */
export function extractStoragePath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('firebasestorage.googleapis.com')) {
      const pathMatch = urlObj.pathname.match(/\/o\/(.+?)(\?|$)/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1]);
      }
    }
    return null;
  } catch {
    return null;
  }
}

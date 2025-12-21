export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a file using FormData
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'profile-photos/user-123.jpg')
 * @param imageType - Optional image type for proper storage categorization
 * @returns Promise with the download URL and storage path
 */
export async function uploadFile(file: File, path: string, imageType?: string): Promise<UploadResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    let url = `/api/upload?path=${encodeURIComponent(path)}`;
    if (imageType) {
      url += `&imageType=${encodeURIComponent(imageType)}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      url: result.url,
      path: result.path,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload file. Please try again.');
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
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const sanitizedUserId = userId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${sanitizedUserId}-${timestamp}.${fileExtension}`;
  const path = `profile-photos/${userType}/${filename}`;

  return uploadFile(file, path, 'profile');
}

/**
 * Delete a file from Object Storage
 * @param path - The storage path of the file to delete
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Delete failed: ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to delete file');
  }
}

/**
 * Upload a cover image for a project
 * @param file - The image file to upload
 * @param projectId - The project's ID
 * @returns Promise with the download URL and storage path
 */
export async function uploadProjectCover(
  file: File,
  projectId: string
): Promise<UploadResult> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }

  // Validate file size (max 10MB for cover images)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 10MB');
  }

  // Generate unique filename with timestamp
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const sanitizedProjectId = projectId.replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `${sanitizedProjectId}-${timestamp}.${fileExtension}`;
  const path = `project-covers/${filename}`;

  return uploadFile(file, path, 'project_cover');
}

/**
 * Extract storage path from a storage URL
 * @param url - The storage download URL
 * @returns The storage path or null if not a valid storage URL
 */
export function extractStoragePath(url: string): string | null {
  try {
    // For Replit object storage URLs
    if (url.includes('/api/storage/')) {
      const pathMatch = url.match(/\/api\/storage\/(.+)$/);
      if (pathMatch) {
        return decodeURIComponent(pathMatch[1]);
      }
    }
    return null;
  } catch {
    return null;
  }
}

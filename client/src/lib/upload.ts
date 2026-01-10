import { auth } from './firebase';

export interface UploadResult {
  url: string;
  path: string;
}

/**
 * Get current Firebase user's ID token for API authentication
 * Returns null if user is not authenticated
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;
    if (user) {
      // Get fresh ID token (Firebase automatically refreshes expired tokens)
      // Force refresh to ensure token is not expired
      const token = await user.getIdToken(true);
      console.log('[Upload] Got Firebase auth token for user:', user.email);
      return token;
    } else {
      console.log('[Upload] No current user, waiting for auth state...');
      // If no current user, wait briefly for auth state to initialize
      // This handles race conditions where upload is triggered before auth state is ready
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged((authUser) => {
          unsubscribe();
          if (authUser) {
            console.log('[Upload] Auth state resolved, getting token for:', authUser.email);
            authUser.getIdToken(true).then(resolve).catch((err) => {
              console.error('[Upload] Failed to get token after auth state change:', err);
              resolve(null);
            });
          } else {
            console.log('[Upload] No user after auth state change');
            resolve(null);
          }
        });
        // Timeout after 3 seconds (increased from 2)
        setTimeout(() => {
          console.log('[Upload] Auth token timeout - no user authenticated');
          resolve(null);
        }, 3000);
      });
    }
  } catch (error) {
    console.error("[Upload] Error getting auth token:", error);
  }
  return null;
}

/**
 * Upload a file using FormData
 * @param file - The file to upload
 * @param path - The storage path (e.g., 'profile-photos/user-123.jpg')
 * @param imageType - Optional image type for proper storage categorization
 * @returns Promise with the download URL and storage path
 */
export async function uploadFile(file: File, path: string, imageType?: string): Promise<UploadResult> {
  // Helper function to perform the upload with a given token
  async function performUpload(token: string): Promise<Response> {
    const formData = new FormData();
    formData.append('file', file);

    let url = `/api/upload?path=${encodeURIComponent(path)}`;
    if (imageType) {
      url += `&imageType=${encodeURIComponent(imageType)}`;
    }

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  try {
    console.log('[Upload] Starting upload for file:', file.name, 'size:', file.size, 'type:', file.type);

    // Get Firebase ID token for secure authentication
    console.log('[Upload] Getting auth token...');
    let token = await getAuthToken();
    if (!token) {
      console.error('[Upload] No auth token available');
      throw new Error('Authentication required. Please sign in again and try uploading.');
    }
    console.log('[Upload] Auth token obtained, proceeding with upload...');

    let response: Response;
    try {
      response = await performUpload(token);
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        throw new Error('Upload timed out. Please check your connection and try again.');
      }
      throw new Error('Network error. Please check your connection and try again.');
    }

    // If we get a 401, try once more with a fresh token
    if (response.status === 401) {
      console.log('[Upload] Got 401, trying to refresh token and retry...');

      // Force a fresh token by signing out and back in, or just get a fresh one
      const user = auth.currentUser;
      if (user) {
        try {
          // Force token refresh
          token = await user.getIdToken(true);
          console.log('[Upload] Got fresh token, retrying upload...');

          response = await performUpload(token);
          console.log('[Upload] Retry response status:', response.status);
        } catch (refreshError) {
          console.error('[Upload] Failed to refresh token:', refreshError);
        }
      }
    }

    console.log('[Upload] Response status:', response.status);

    if (!response.ok) {
      let errorMessage = `Upload failed: ${response.statusText}`;
      let serverError: any = null;
      try {
        serverError = await response.json();
        errorMessage = serverError.message || errorMessage;
        console.error('[Upload] Server error:', serverError);
      } catch (e) {
        console.error('[Upload] Could not parse error response');
      }

      // For 401 errors, show the actual server message which is more helpful
      if (response.status === 401) {
        // Log additional debug info
        console.error('[Upload] Auth failed - token was present but rejected');
        console.error('[Upload] Server response:', serverError);
        throw new Error(errorMessage || 'Authentication failed. Please sign out and sign back in.');
      } else if (response.status === 403) {
        throw new Error('You do not have permission to upload this file.');
      } else if (response.status === 400) {
        throw new Error(errorMessage);
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log('[Upload] Upload successful:', result.url);

    return {
      url: result.url,
      path: result.path,
    };
  } catch (error) {
    console.error('[Upload] Error uploading file:', error);
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
  userType: 'volunteer' | 'organization' | 'corporate-partner'
): Promise<UploadResult> {
  console.log('[uploadProfilePhoto] Called with userId:', userId, 'userType:', userType);
  console.log('[uploadProfilePhoto] File:', file.name, file.type, file.size);

  // Validate userId
  if (!userId || userId === '') {
    throw new Error('User ID is required for upload');
  }

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

  console.log('[uploadProfilePhoto] Generated path:', path);

  const result = await uploadFile(file, path, 'profile');
  console.log('[uploadProfilePhoto] Upload result:', result);

  return result;
}

/**
 * Delete a file from Object Storage
 * @param path - The storage path of the file to delete
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    // Get Firebase ID token for secure authentication
    const token = await getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch('/api/upload', {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ path }),
      credentials: 'include',
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

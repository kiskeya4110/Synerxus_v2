import { useState, useRef, useEffect } from "react";
import { Upload, User, X, Crop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageCropper } from "@/components/ui/image-cropper";
import { uploadProfilePhoto, deleteFile, extractStoragePath } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

interface ProfilePictureUploadProps {
  currentPhotoUrl?: string;
  onPhotoChange: (url: string) => void;
  userId: string;
  userType: 'volunteer' | 'organization' | 'corporate-partner';
  type?: 'avatar' | 'logo';
  label?: string;
  enableCrop?: boolean;
}

export function ProfilePictureUpload({
  currentPhotoUrl,
  onPhotoChange,
  userId,
  userType,
  type = 'avatar',
  label,
  enableCrop = true
}: ProfilePictureUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string>(currentPhotoUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [storagePath, setStoragePath] = useState<string>("");
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImage, setPendingImage] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [renderKey, setRenderKey] = useState(0); // Force re-render
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Log component mount and props
  useEffect(() => {
    console.log("[ProfilePictureUpload] Component mounted/updated - userId:", userId, "type:", type, "currentPhotoUrl:", currentPhotoUrl);
  }, [userId, type, currentPhotoUrl]);

  // Update internal state when prop changes (for loading existing photos)
  useEffect(() => {
    console.log("[ProfilePictureUpload] Props changed - currentPhotoUrl:", currentPhotoUrl, "photoUrl state:", photoUrl);
    if (currentPhotoUrl && currentPhotoUrl !== photoUrl) {
      console.log("[ProfilePictureUpload] Setting photoUrl from props:", currentPhotoUrl);
      setPhotoUrl(currentPhotoUrl);
      const path = extractStoragePath(currentPhotoUrl);
      if (path) {
        setStoragePath(path);
      }
    }
  }, [currentPhotoUrl, photoUrl]);

  // Debug log when photoUrl changes
  useEffect(() => {
    console.log("[ProfilePictureUpload] photoUrl state updated:", photoUrl);
  }, [photoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    console.log("[ProfilePictureUpload] handleFileSelect called, file:", file?.name);

    if (!file) {
      console.log("[ProfilePictureUpload] No file selected");
      return;
    }

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate userId early
    if (!userId) {
      console.error("[ProfilePictureUpload] No userId");
      toast({
        title: "Upload failed",
        description: "User ID is required. Please ensure you're logged in.",
        variant: "destructive"
      });
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      console.error("[ProfilePictureUpload] Invalid file type:", file.type);
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG, PNG, WebP, or GIF image.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      console.error("[ProfilePictureUpload] File too large:", file.size);
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    console.log("[ProfilePictureUpload] File validated, enableCrop:", enableCrop);

    // Show cropper for profile photos
    if (enableCrop) {
      console.log("[ProfilePictureUpload] Reading file for cropper...");

      // Use FileReader to create a data URL (more reliable than blob URL)
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        console.log("[ProfilePictureUpload] FileReader success, dataUrl length:", dataUrl?.length);
        if (dataUrl) {
          console.log("[ProfilePictureUpload] Setting showCropper=true");
          setPendingImage(dataUrl);
          setPendingFile(file);
          setShowCropper(true);
        } else {
          console.error("[ProfilePictureUpload] No dataUrl returned");
          toast({
            title: "Error loading image",
            description: "Failed to read the image file. Please try again.",
            variant: "destructive"
          });
        }
      };
      reader.onerror = (err) => {
        console.error("[ProfilePictureUpload] FileReader error:", err);
        toast({
          title: "Error loading image",
          description: "Failed to read the image file. Please try again.",
          variant: "destructive"
        });
      };
      reader.readAsDataURL(file);
    } else {
      // Upload directly without cropping
      console.log("[ProfilePictureUpload] Uploading directly (no crop)");
      await uploadImage(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    console.log("[ProfilePictureUpload] handleCropComplete called, blob size:", croppedBlob.size, "type:", croppedBlob.type);

    // Determine file extension based on blob type
    const isPng = croppedBlob.type === 'image/png';
    const extension = isPng ? 'png' : 'jpg';
    const mimeType = isPng ? 'image/png' : 'image/jpeg';

    // Convert blob to file with correct type
    const croppedFile = new File(
      [croppedBlob],
      pendingFile?.name?.replace(/\.\w+$/, `.${extension}`) || `cropped-image.${extension}`,
      { type: mimeType }
    );

    console.log("[ProfilePictureUpload] Created file:", croppedFile.name, croppedFile.size, "bytes");

    // Clean up pending state (data URLs don't need revoking)
    setPendingImage("");
    setPendingFile(null);
    setShowCropper(false);

    // Upload the cropped image
    await uploadImage(croppedFile);
  };

  const handleCropCancel = () => {
    // Data URLs don't need to be revoked (unlike blob URLs)
    setPendingImage("");
    setPendingFile(null);
    setShowCropper(false);
  };

  const uploadImage = async (file: File) => {
    console.log("[ProfilePictureUpload] Starting upload for user:", userId, "userType:", userType);
    console.log("[ProfilePictureUpload] File:", file.name, file.type, file.size, "bytes");

    // Validate userId before upload
    if (!userId || userId === "") {
      console.error("[ProfilePictureUpload] No userId provided");
      toast({
        title: "Upload failed",
        description: "User ID is required. Please refresh the page and try again.",
        variant: "destructive"
      });
      return;
    }

    // Store old path to delete AFTER successful upload (prevents data loss on upload failure)
    const oldStoragePath = storagePath;

    try {
      setIsUploading(true);

      // Upload new photo first (before deleting old one)
      console.log("[ProfilePictureUpload] Uploading new photo...");
      const uploadPromise = uploadProfilePhoto(file, userId, userType);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Upload timeout. Please try again.")), 30000)
      );

      const result = await Promise.race([uploadPromise, timeoutPromise]) as any;
      console.log("[ProfilePictureUpload] Upload result:", result);

      if (!result || !result.url) {
        throw new Error("Upload failed - no URL returned");
      }

      // Upload succeeded - now safe to delete old photo
      if (oldStoragePath) {
        try {
          console.log("[ProfilePictureUpload] Deleting old photo:", oldStoragePath);
          await deleteFile(oldStoragePath);
        } catch (delErr) {
          // Non-critical: old file cleanup failed, but new upload succeeded
          console.warn("[ProfilePictureUpload] Could not delete old photo:", delErr);
        }
      }

      const newUrl = result.url;
      console.log("[ProfilePictureUpload] Upload SUCCESS! URL:", newUrl);

      // Update all state and force re-render
      setPhotoUrl(newUrl);
      setStoragePath(result.path || '');
      setRenderKey(prev => prev + 1); // Force component to re-render

      // Notify parent component
      onPhotoChange(newUrl);

      toast({
        title: "Photo uploaded",
        description: "Your profile picture has been updated."
      });

      // Log final state
      setTimeout(() => {
        console.log("[ProfilePictureUpload] After state update, checking photoUrl...");
      }, 100);
    } catch (error: any) {
      console.error("[ProfilePictureUpload] Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      if (storagePath) {
        await deleteFile(storagePath);
      }
      setPhotoUrl("");
      setStoragePath("");
      onPhotoChange("");

      toast({
        title: "Photo removed",
        description: "Your profile picture has been removed."
      });
    } catch (error: any) {
      console.error("Remove photo error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove photo.",
        variant: "destructive"
      });
    }
  };

  // Ensure URL is properly formatted - add cache buster for fresh images
  const displayUrl = photoUrl || '';
  const imgSrc = displayUrl ? `${displayUrl}${displayUrl.includes('?') ? '&' : '?'}v=${renderKey}` : '';

  console.log("[ProfilePictureUpload] Rendering preview - displayUrl:", displayUrl, "imgSrc:", imgSrc);

  return (
    <div className="flex flex-col items-center space-y-4" key={`upload-${renderKey}`}>
      {type === 'avatar' ? (
        <Avatar className="h-32 w-32">
          {imgSrc ? (
            <AvatarImage src={imgSrc} alt={label || "Profile picture"} key={imgSrc} />
          ) : null}
          <AvatarFallback className="text-2xl">
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <div
          className="relative overflow-hidden rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800"
          style={{ width: 128, height: 128 }}
        >
          {imgSrc ? (
            <img
              key={imgSrc}
              src={imgSrc}
              alt={label || "Logo"}
              style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
              onLoad={() => console.log("[ProfilePictureUpload] Image loaded!")}
              onError={(e) => {
                console.error("[ProfilePictureUpload] Image failed to load:", imgSrc);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <span className="text-xs">No Logo</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-profile-picture"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          data-testid="button-upload-photo"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Uploading...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {photoUrl ? "Change Photo" : "Upload Photo"}
            </span>
          )}
        </Button>

        {photoUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemovePhoto}
            data-testid="button-remove-photo"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Recommended: Square image, max 5MB
      </p>

      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={showCropper}
        onClose={handleCropCancel}
        imageSrc={pendingImage}
        aspectRatio={type === 'avatar' ? 1 : 1} // Square for both avatar and logo
        cropShape={type === 'avatar' ? 'round' : 'rect'}
        onCropComplete={handleCropComplete}
        title={type === 'avatar' ? 'Crop Profile Picture' : 'Crop Logo'}
      />
    </div>
  );
}

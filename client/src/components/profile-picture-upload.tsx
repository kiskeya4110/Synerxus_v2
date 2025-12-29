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
  userType: 'volunteer' | 'organization';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update internal state when prop changes (for loading existing photos)
  useEffect(() => {
    if (currentPhotoUrl && currentPhotoUrl !== photoUrl) {
      setPhotoUrl(currentPhotoUrl);
      const path = extractStoragePath(currentPhotoUrl);
      if (path) {
        setStoragePath(path);
      }
    }
  }, [currentPhotoUrl, photoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate userId early
    if (!userId) {
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
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    // Show cropper for profile photos
    if (enableCrop) {
      console.log("[ProfilePictureUpload] File details:", file.name, file.type, file.size);

      // Use FileReader to create a data URL (more reliable than blob URL)
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        console.log("[ProfilePictureUpload] Created data URL for cropper, length:", dataUrl?.length);
        if (dataUrl) {
          setPendingImage(dataUrl);
          setPendingFile(file);
          setShowCropper(true);
        } else {
          toast({
            title: "Error loading image",
            description: "Failed to read the image file. Please try again.",
            variant: "destructive"
          });
        }
      };
      reader.onerror = () => {
        console.error("[ProfilePictureUpload] FileReader error");
        toast({
          title: "Error loading image",
          description: "Failed to read the image file. Please try again.",
          variant: "destructive"
        });
      };
      reader.readAsDataURL(file);
    } else {
      // Upload directly without cropping
      await uploadImage(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
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

    try {
      setIsUploading(true);

      // Delete old photo if exists
      if (storagePath) {
        try {
          console.log("[ProfilePictureUpload] Deleting old photo:", storagePath);
          await deleteFile(storagePath);
        } catch (delErr) {
          console.warn("[ProfilePictureUpload] Could not delete old photo:", delErr);
        }
      }

      // Upload new photo with timeout
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

      setPhotoUrl(result.url);
      setStoragePath(result.path);
      onPhotoChange(result.url);

      toast({
        title: "Photo uploaded",
        description: "Your profile picture has been updated."
      });
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

  return (
    <div className="flex flex-col items-center space-y-4">
      {type === 'avatar' ? (
        <Avatar className="h-32 w-32">
          <AvatarImage src={photoUrl} alt={label || "Profile picture"} />
          <AvatarFallback className="text-2xl">
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex items-center justify-center h-32 w-32 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900">
          {photoUrl ? (
            <img src={photoUrl} alt={label || "Logo"} className="h-32 w-32 object-contain p-2" />
          ) : (
            <div className="text-center text-gray-400 dark:text-gray-500">
              <p className="text-xs font-medium">Logo Preview</p>
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

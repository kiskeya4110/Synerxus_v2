import { useState, useRef, useEffect } from "react";
import { Upload, User, X } from "lucide-react";
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
  const [imageVersion, setImageVersion] = useState(0); // Cache busting for browser
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update internal state when prop changes
  useEffect(() => {
    if (currentPhotoUrl && currentPhotoUrl !== photoUrl) {
      setPhotoUrl(currentPhotoUrl);
      const path = extractStoragePath(currentPhotoUrl);
      if (path) {
        setStoragePath(path);
      }
    }
  }, [currentPhotoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Validate
    if (!userId) {
      toast({ title: "Upload failed", description: "User ID is required.", variant: "destructive" });
      return;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, WebP, or GIF image.", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 5MB.", variant: "destructive" });
      return;
    }

    if (enableCrop) {
      // Read file and show cropper
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setPendingImage(dataUrl);
          setPendingFile(file);
          setShowCropper(true);
        }
      };
      reader.readAsDataURL(file);
    } else {
      await uploadImage(file);
    }
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    console.log('[ProfilePictureUpload] handleCropComplete called');
    console.log('[ProfilePictureUpload] Cropped blob:', croppedBlob.type, croppedBlob.size, 'bytes');

    const isPng = croppedBlob.type === 'image/png';
    const extension = isPng ? 'png' : 'jpg';

    const croppedFile = new File(
      [croppedBlob],
      `cropped-image.${extension}`,
      { type: isPng ? 'image/png' : 'image/jpeg' }
    );

    console.log('[ProfilePictureUpload] Created file:', croppedFile.name, croppedFile.type, croppedFile.size, 'bytes');

    setPendingImage("");
    setPendingFile(null);
    setShowCropper(false);

    await uploadImage(croppedFile);
  };

  const handleCropCancel = () => {
    setPendingImage("");
    setPendingFile(null);
    setShowCropper(false);
  };

  const uploadImage = async (file: File) => {
    console.log('[ProfilePictureUpload] uploadImage called, file:', file.name, file.size, file.type);
    if (!userId) {
      console.error('[ProfilePictureUpload] No userId provided');
      return;
    }

    const oldPath = storagePath;

    try {
      setIsUploading(true);
      console.log('[ProfilePictureUpload] Starting upload for userId:', userId, 'userType:', userType);

      const result = await uploadProfilePhoto(file, userId, userType);
      console.log('[ProfilePictureUpload] Upload result:', result);

      if (result?.url) {
        console.log('[ProfilePictureUpload] Setting photoUrl to:', result.url);

        // Delete old photo after successful upload
        if (oldPath) {
          try { await deleteFile(oldPath); } catch (e) { /* ignore */ }
        }

        // Update state with new URL and increment version for cache busting
        setPhotoUrl(result.url);
        setStoragePath(result.path || '');
        setImageVersion(v => v + 1); // Force browser to fetch fresh image
        onPhotoChange(result.url);

        console.log('[ProfilePictureUpload] State updated, photoUrl should now be:', result.url);
        toast({ title: "Photo uploaded", description: "Your photo has been updated." });
      } else {
        console.error('[ProfilePictureUpload] No URL in result:', result);
        throw new Error("No URL returned");
      }
    } catch (error: any) {
      console.error('[ProfilePictureUpload] Upload error:', error);
      toast({ title: "Upload failed", description: error.message || "Failed to upload photo.", variant: "destructive" });
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
      toast({ title: "Photo removed", description: "Your photo has been removed." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to remove photo.", variant: "destructive" });
    }
  };

  // Generate cache-busted image URL to ensure browser fetches fresh image
  const imgSrc = photoUrl ? `${photoUrl}${photoUrl.includes('?') ? '&' : '?'}v=${imageVersion}` : '';

  // Debug log on every render
  console.log('[ProfilePictureUpload] Rendering with photoUrl:', photoUrl, 'imgSrc:', imgSrc, 'version:', imageVersion, 'type:', type);

  return (
    <div className="flex flex-col items-center space-y-4">
      {type === 'avatar' ? (
        <Avatar className="h-32 w-32">
          {imgSrc && <AvatarImage src={imgSrc} alt={label || "Profile picture"} key={imgSrc} />}
          <AvatarFallback className="text-2xl">
            <User className="h-12 w-12" />
          </AvatarFallback>
        </Avatar>
      ) : (
        <div className="flex items-center justify-center h-32 w-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 overflow-hidden">
          {imgSrc ? (
            <img
              key={imgSrc}
              src={imgSrc}
              alt={label || "Logo"}
              className="max-h-full max-w-full object-contain"
              onLoad={() => console.log('[ProfilePictureUpload] Image loaded successfully:', imgSrc)}
              onError={(e) => console.error('[ProfilePictureUpload] Image failed to load:', imgSrc, e)}
            />
          ) : (
            <div className="text-center text-gray-400">
              <p className="text-xs">No Logo</p>
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
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
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
          <Button type="button" variant="outline" size="sm" onClick={handleRemovePhoto}>
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Recommended: Square image, max 5MB
      </p>

      <ImageCropper
        isOpen={showCropper}
        onClose={handleCropCancel}
        imageSrc={pendingImage}
        aspectRatio={1}
        cropShape={type === 'avatar' ? 'round' : 'rect'}
        onCropComplete={handleCropComplete}
        title={type === 'avatar' ? 'Crop Profile Picture' : 'Crop Logo'}
      />
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { Upload, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadProfilePhoto, deleteFile, extractStoragePath } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

interface ProfilePictureUploadProps {
  currentPhotoUrl?: string;
  onPhotoChange: (url: string) => void;
  userId: string;
  userType: 'volunteer' | 'organization';
}

export function ProfilePictureUpload({
  currentPhotoUrl,
  onPhotoChange,
  userId,
  userType
}: ProfilePictureUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string>(currentPhotoUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [storagePath, setStoragePath] = useState<string>("");
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

    try {
      setIsUploading(true);

      // Validate userId
      if (!userId) {
        throw new Error("User ID is required. Please ensure you're logged in.");
      }

      // Delete old photo if exists
      if (storagePath) {
        try {
          await deleteFile(storagePath);
        } catch (delErr) {
          console.warn("Could not delete old photo:", delErr);
        }
      }

      // Upload new photo with timeout
      const uploadPromise = uploadProfilePhoto(file, userId, userType);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Upload timeout. Please try again.")), 30000)
      );
      
      const result = await Promise.race([uploadPromise, timeoutPromise]) as any;
      
      setPhotoUrl(result.url);
      setStoragePath(result.path);
      onPhotoChange(result.url);

      toast({
        title: "Photo uploaded",
        description: "Your profile picture has been updated."
      });
    } catch (error: any) {
      console.error("Upload error:", error);
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
      <Avatar className="h-32 w-32">
        <AvatarImage src={photoUrl} alt="Profile picture" />
        <AvatarFallback className="text-2xl">
          <User className="h-12 w-12" />
        </AvatarFallback>
      </Avatar>

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
    </div>
  );
}

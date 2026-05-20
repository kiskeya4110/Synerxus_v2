import { useState, useRef, useEffect } from "react";
import { Upload, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImageCropper } from "@/components/ui/image-cropper";
import { uploadProjectCover, deleteFile, extractStoragePath } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";

interface ProjectCoverUploadProps {
  currentCoverUrl?: string;
  onCoverChange: (url: string) => void;
  projectId: string;
  enableCrop?: boolean;
}

export function ProjectCoverUpload({
  currentCoverUrl,
  onCoverChange,
  projectId,
  enableCrop = true
}: ProjectCoverUploadProps) {
  const [coverUrl, setCoverUrl] = useState<string>(currentCoverUrl || "");
  const [isUploading, setIsUploading] = useState(false);
  const [storagePath, setStoragePath] = useState<string>("");
  const [showCropper, setShowCropper] = useState(false);
  const [pendingImage, setPendingImage] = useState<string>("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update internal state when prop changes (for loading existing covers)
  useEffect(() => {
    if (currentCoverUrl && currentCoverUrl !== coverUrl) {
      setCoverUrl(currentCoverUrl);
      const path = extractStoragePath(currentCoverUrl);
      if (path) {
        setStoragePath(path);
      }
    }
  }, [currentCoverUrl, coverUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate projectId early
    if (!projectId) {
      toast({
        title: "Upload failed",
        description: "Project ID is required. Please save the project first.",
        variant: "destructive"
      });
      return;
    }

    // If crop is enabled, show cropper first
    if (enableCrop) {
      const imageUrl = URL.createObjectURL(file);
      setPendingImage(imageUrl);
      setPendingFile(file);
      setShowCropper(true);
      return;
    }

    // Otherwise upload directly
    await uploadImage(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Convert blob to file
    const croppedFile = new File(
      [croppedBlob],
      pendingFile?.name || 'cropped-cover.jpg',
      { type: 'image/jpeg' }
    );

    // Clean up pending state
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage);
    }
    setPendingImage("");
    setPendingFile(null);
    setShowCropper(false);

    // Upload the cropped image
    await uploadImage(croppedFile);
  };

  const handleCropCancel = () => {
    if (pendingImage) {
      URL.revokeObjectURL(pendingImage);
    }
    setPendingImage("");
    setPendingFile(null);
    setShowCropper(false);
  };

  const uploadImage = async (file: File) => {
    // Store old path to delete AFTER successful upload (prevents data loss on upload failure)
    const oldStoragePath = storagePath;

    try {
      setIsUploading(true);

      // Upload new cover first (before deleting old one)
      const uploadPromise = uploadProjectCover(file, projectId);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Upload timeout. Please try again.")), 30000)
      );

      const result = await Promise.race([uploadPromise, timeoutPromise]) as any;

      if (!result || !result.url) {
        throw new Error("Upload failed - no URL returned");
      }

      // Upload succeeded - now safe to delete old cover
      if (oldStoragePath) {
        try {
          await deleteFile(oldStoragePath);
        } catch (delErr) {
          // Non-critical: old file cleanup failed, but new upload succeeded
        }
      }

      setCoverUrl(result.url);
      setStoragePath(result.path);
      onCoverChange(result.url);

      toast({
        title: "Cover uploaded",
        description: "Project cover image has been updated."
      });
    } catch (error: any) {
      console.error("[ProjectCoverUpload] Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload cover. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveCover = async () => {
    try {
      if (storagePath) {
        await deleteFile(storagePath);
      }
      setCoverUrl("");
      setStoragePath("");
      onCoverChange("");

      toast({
        title: "Cover removed",
        description: "Project cover image has been removed."
      });
    } catch (error: any) {
      console.error("Remove cover error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove cover.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Cover Preview */}
      <div className="relative w-full aspect-[16/9] rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {coverUrl ? (
          <>
            <img
              src={coverUrl}
              alt="Project cover"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-sm font-medium">Click buttons below to change</p>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
            <Image className="h-12 w-12 mb-2" />
            <p className="text-sm font-medium">Project Cover Image</p>
            <p className="text-xs mt-1">Recommended: 16:9 ratio, max 10MB</p>
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex gap-2 justify-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          data-testid="input-project-cover"
        />

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          data-testid="button-upload-cover"
        >
          {isUploading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              Uploading...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              {coverUrl ? "Change Cover" : "Upload Cover"}
            </span>
          )}
        </Button>

        {coverUrl && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveCover}
            data-testid="button-remove-cover"
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* Image Cropper Modal */}
      <ImageCropper
        isOpen={showCropper}
        onClose={handleCropCancel}
        imageSrc={pendingImage}
        aspectRatio={16 / 9}
        cropShape="rect"
        onCropComplete={handleCropComplete}
        title="Crop Cover Image"
      />
    </div>
  );
}

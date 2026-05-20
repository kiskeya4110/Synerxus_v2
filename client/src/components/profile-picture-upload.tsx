import { useState, useRef, useCallback } from "react";
import { Upload, User, X, Check, AlertCircle, Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { uploadProfilePhoto, deleteFile, extractStoragePath } from "@/lib/upload";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ProfilePictureUploadProps {
  currentPhotoUrl?: string;
  onPhotoChange: (url: string) => void;
  userId: string;
  userType: 'volunteer' | 'organization' | 'corporate-partner';
  type?: 'avatar' | 'logo';
  label?: string;
  enableCrop?: boolean; // Kept for API compatibility but not used in simplified version
}

type UploadStatus = 'idle' | 'selecting' | 'uploading' | 'success' | 'error';

export function ProfilePictureUpload({
  currentPhotoUrl,
  onPhotoChange,
  userId,
  userType,
  type = 'avatar',
  label,
}: ProfilePictureUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>(currentPhotoUrl || '');
  const [imageKey, setImageKey] = useState(Date.now()); // For cache busting
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Update preview when prop changes
  const displayUrl = previewUrl || currentPhotoUrl || '';

  const handleButtonClick = useCallback(() => {
    if (!userId) {
      setErrorMessage('Please wait for the page to load completely.');
      setStatus('error');
      toast({
        title: "Not ready",
        description: "Please wait for the page to load, then try again.",
        variant: "destructive"
      });
      return;
    }
    setStatus('selecting');
    setErrorMessage('');
    fileInputRef.current?.click();
  }, [userId, toast]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    // Reset input for re-selection
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    if (!file) {
      setStatus('idle');
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Please select a JPG, PNG, WebP, or GIF image.');
      setStatus('error');
      toast({
        title: "Invalid file type",
        description: "Please select a JPG, PNG, WebP, or GIF image.",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('Image must be smaller than 5MB.');
      setStatus('error');
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive"
      });
      return;
    }

    // Validate userId again
    if (!userId) {
      setErrorMessage('User not identified. Please refresh the page.');
      setStatus('error');
      toast({
        title: "Error",
        description: "User not identified. Please refresh the page.",
        variant: "destructive"
      });
      return;
    }

    // Create local preview immediately
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setStatus('uploading');
    setErrorMessage('');

    try {
      const result = await uploadProfilePhoto(file, userId, userType);

      if (result?.url) {
        // Clean up old preview
        URL.revokeObjectURL(localPreview);

        // Update with server URL
        setPreviewUrl(result.url);
        setImageKey(Date.now()); // Force image refresh
        setStatus('success');

        // Notify parent component
        onPhotoChange(result.url);

        toast({
          title: "Photo uploaded!",
          description: "Your photo has been saved successfully.",
        });

        // Reset to idle after showing success
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        throw new Error('Upload completed but no URL was returned');
      }
    } catch (error: any) {
      console.error('[Upload] Error:', error);

      // Revert to original photo on error
      URL.revokeObjectURL(localPreview);
      setPreviewUrl(currentPhotoUrl || '');

      const message = error.message || 'Failed to upload. Please try again.';
      setErrorMessage(message);
      setStatus('error');

      toast({
        title: "Upload failed",
        description: message,
        variant: "destructive"
      });
    }
  }, [userId, userType, currentPhotoUrl, onPhotoChange, toast]);

  const handleRemovePhoto = useCallback(async () => {
    if (!displayUrl) return;

    const path = extractStoragePath(displayUrl);

    try {
      if (path) {
        await deleteFile(path);
      }
      setPreviewUrl('');
      onPhotoChange('');
      toast({
        title: "Photo removed",
        description: "Your photo has been removed.",
      });
    } catch (error: any) {
      console.error('[Upload] Remove error:', error);
      toast({
        title: "Error",
        description: "Failed to remove photo. Please try again.",
        variant: "destructive"
      });
    }
  }, [displayUrl, onPhotoChange, toast]);

  // Generate display URL with cache busting
  const imgSrc = displayUrl ? `${displayUrl}${displayUrl.includes('?') ? '&' : '?'}t=${imageKey}` : '';

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select photo"
      />

      {/* Photo display area */}
      <div className="relative group">
        {type === 'avatar' ? (
          <Avatar className={cn(
            "h-32 w-32 transition-all",
            status === 'uploading' && "opacity-50",
            status === 'error' && "ring-2 ring-red-500"
          )}>
            {imgSrc && <AvatarImage src={imgSrc} alt={label || "Profile picture"} key={imgSrc} />}
            <AvatarFallback className="text-2xl bg-slate-100">
              <User className="h-12 w-12 text-slate-400" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className={cn(
            "flex items-center justify-center h-32 w-32 rounded-lg border-2 border-dashed bg-gray-50 dark:bg-gray-900 overflow-hidden transition-all",
            status === 'idle' && "border-gray-300 dark:border-gray-600",
            status === 'uploading' && "border-blue-400 opacity-50",
            status === 'success' && "border-green-400",
            status === 'error' && "border-red-400"
          )}>
            {imgSrc ? (
              <img
                key={imgSrc}
                src={imgSrc}
                alt={label || "Logo"}
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="text-center text-gray-400 p-2">
                <Camera className="h-8 w-8 mx-auto mb-1" />
                <p className="text-xs">No {type === 'logo' ? 'Logo' : 'Photo'}</p>
              </div>
            )}
          </div>
        )}

        {/* Upload overlay on hover */}
        {status === 'idle' && (
          <div
            onClick={handleButtonClick}
            className={cn(
              "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer",
              type === 'avatar' ? "rounded-full" : "rounded-lg"
            )}
          >
            <Camera className="h-8 w-8 text-white" />
          </div>
        )}

        {/* Status overlay */}
        {status === 'uploading' && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/30",
            type === 'avatar' ? "rounded-full" : "rounded-lg"
          )}>
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </div>
        )}

        {status === 'success' && (
          <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-green-500/30",
            type === 'avatar' ? "rounded-full" : "rounded-lg"
          )}>
            <Check className="h-8 w-8 text-green-600" />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={status === 'error' ? 'destructive' : 'outline'}
          size="sm"
          onClick={handleButtonClick}
          disabled={status === 'uploading'}
        >
          {status === 'uploading' ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : status === 'error' ? (
            <>
              <AlertCircle className="h-4 w-4 mr-2" />
              Try Again
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              {displayUrl ? 'Change' : 'Upload'} {type === 'logo' ? 'Logo' : 'Photo'}
            </>
          )}
        </Button>

        {displayUrl && status !== 'uploading' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemovePhoto}
          >
            <X className="h-4 w-4 mr-2" />
            Remove
          </Button>
        )}
      </div>

      {/* Error message */}
      {status === 'error' && errorMessage && (
        <p className="text-sm text-red-500 text-center max-w-xs">
          {errorMessage}
        </p>
      )}

      {/* Help text */}
      <p className="text-xs text-muted-foreground text-center">
        JPG, PNG, WebP or GIF • Max 5MB
      </p>
    </div>
  );
}

export default ProfilePictureUpload;

/**
 * UI Components Index
 *
 * Central export point for commonly used UI components.
 * Import from "@/components/ui" instead of individual files.
 */

// Dialog utilities
export {
  useDialog,
  useDialogManager,
  ConfirmDialog,
  DeleteConfirmDialog,
  FormDialog,
  InfoDialog,
  LoadingDialog,
  createConfirmAction,
  type DialogState,
  type UseDialogReturn,
  type ConfirmDialogOptions,
  type FormDialogProps,
} from "./dialog-factory";

// Optimized image components
export {
  OptimizedImage,
  OptimizedAvatar,
  OptimizedBackground,
} from "./optimized-image";

// Image cropping
export { ImageCropper } from "./image-cropper";

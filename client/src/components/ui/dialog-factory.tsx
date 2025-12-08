import { useState, useCallback, ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface DialogState<T = unknown> {
  isOpen: boolean;
  data?: T;
}

export interface UseDialogReturn<T = unknown> {
  state: DialogState<T>;
  open: (data?: T) => void;
  close: () => void;
  toggle: () => void;
}

export interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

export interface FormDialogProps<T> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  initialData?: T;
  onSubmit: (data: T) => void | Promise<void>;
  isLoading?: boolean;
  submitText?: string;
  cancelText?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook for managing dialog state
 */
export function useDialog<T = unknown>(initialState?: DialogState<T>): UseDialogReturn<T> {
  const [state, setState] = useState<DialogState<T>>(
    initialState || { isOpen: false }
  );

  const open = useCallback((data?: T) => {
    setState({ isOpen: true, data });
  }, []);

  const close = useCallback(() => {
    setState({ isOpen: false, data: undefined });
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
  }, []);

  return { state, open, close, toggle };
}

/**
 * Hook for managing multiple dialogs
 */
export function useDialogManager<TKeys extends string>() {
  const [dialogs, setDialogs] = useState<Record<TKeys, DialogState>>({} as Record<TKeys, DialogState>);

  const open = useCallback((key: TKeys, data?: unknown) => {
    setDialogs((prev) => ({
      ...prev,
      [key]: { isOpen: true, data },
    }));
  }, []);

  const close = useCallback((key: TKeys) => {
    setDialogs((prev) => ({
      ...prev,
      [key]: { isOpen: false, data: undefined },
    }));
  }, []);

  const closeAll = useCallback(() => {
    setDialogs((prev) => {
      const newState = { ...prev };
      Object.keys(newState).forEach((key) => {
        newState[key as TKeys] = { isOpen: false, data: undefined };
      });
      return newState;
    });
  }, []);

  const isOpen = useCallback(
    (key: TKeys) => dialogs[key]?.isOpen || false,
    [dialogs]
  );

  const getData = useCallback(
    <T,>(key: TKeys) => dialogs[key]?.data as T | undefined,
    [dialogs]
  );

  return { dialogs, open, close, closeAll, isOpen, getData };
}

// ============================================
// COMPONENTS
// ============================================

/**
 * Confirmation Dialog Component
 * Replaces window.confirm() with a proper dialog
 */
export function ConfirmDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "default",
  onConfirm,
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const isProcessing = loading || isLoading;

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isProcessing}
            className={variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Delete Confirmation Dialog
 * Pre-configured for delete operations
 */
export function DeleteConfirmDialog({
  isOpen,
  onClose,
  itemName,
  itemType = "item",
  onConfirm,
  isLoading = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  itemName?: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete ${itemType}?`}
      description={
        itemName
          ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
          : `Are you sure you want to delete this ${itemType}? This action cannot be undone.`
      }
      confirmText="Delete"
      variant="destructive"
      onConfirm={onConfirm}
      isLoading={isLoading}
    />
  );
}

/**
 * Form Dialog Component
 * Wrapper for dialogs containing forms
 */
export function FormDialog<T>({
  isOpen,
  onClose,
  title,
  description,
  onSubmit,
  isLoading = false,
  submitText = "Save",
  cancelText = "Cancel",
  children,
  size = "md",
}: FormDialogProps<T>) {
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = Object.fromEntries(formData.entries()) as unknown as T;
      await onSubmit(data);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    full: "sm:max-w-[90vw]",
  };

  const isProcessing = submitting || isLoading;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={sizeClasses[size]}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="py-4">{children}</div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              {cancelText}
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitText}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Info Dialog Component
 * For displaying information without actions
 */
export function InfoDialog({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    full: "sm:max-w-[90vw]",
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={sizeClasses[size]}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">{children}</div>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Loading Dialog Component
 * Shows a loading state
 */
export function LoadingDialog({
  isOpen,
  message = "Loading...",
}: {
  isOpen: boolean;
  message?: string;
}) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{message}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Higher-order function to create a confirm action
 * Replaces window.confirm() usage
 */
export function createConfirmAction(
  dialogManager: ReturnType<typeof useDialogManager>,
  dialogKey: string
) {
  return (options: ConfirmDialogOptions) => {
    dialogManager.open(dialogKey as never, options);
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  useDialog,
  useDialogManager,
  ConfirmDialog,
  DeleteConfirmDialog,
  FormDialog,
  InfoDialog,
  LoadingDialog,
  createConfirmAction,
};

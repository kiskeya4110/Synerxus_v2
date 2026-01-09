import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, RotateCw, Move, Check, X } from "lucide-react";

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio?: number; // width/height ratio (e.g., 1 for square, 16/9 for widescreen)
  onCropComplete: (croppedImageBlob: Blob) => void;
  title?: string;
  cropShape?: "rect" | "round";
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function ImageCropper({
  isOpen,
  onClose,
  imageSrc,
  aspectRatio = 1,
  onCropComplete,
  title = "Crop Image",
  cropShape = "rect",
}: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Track when canvas becomes available
  useEffect(() => {
    if (isOpen && canvasRef.current) {
      console.log("[ImageCropper] Canvas is ready");
      setCanvasReady(true);
    } else {
      setCanvasReady(false);
    }
  }, [isOpen]);

  // Canvas dimensions
  const CANVAS_SIZE = 400;
  const CROP_PADDING = 40;
  const cropSize = CANVAS_SIZE - CROP_PADDING * 2;
  const cropWidth = aspectRatio >= 1 ? cropSize : cropSize * aspectRatio;
  const cropHeight = aspectRatio >= 1 ? cropSize / aspectRatio : cropSize;

  // Load image
  useEffect(() => {
    if (!imageSrc || !isOpen) {
      console.log("[ImageCropper] Not loading - imageSrc:", !!imageSrc, "isOpen:", isOpen);
      return;
    }

    console.log("[ImageCropper] Loading image:", imageSrc.substring(0, 50) + "...");

    // Reset state before loading new image
    setImageLoaded(false);
    setImageError(null);
    imageRef.current = null;

    const img = new Image();

    // Only set crossOrigin for remote URLs, not for local sources (blob: or data: URLs)
    if (!imageSrc.startsWith('blob:') && !imageSrc.startsWith('data:')) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      console.log("[ImageCropper] Image loaded successfully:", img.width, "x", img.height);
      imageRef.current = img;
      setImageLoaded(true);
      setImageError(null);

      // Reset transform state when new image loads
      setZoom(1);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
    };

    img.onerror = (e) => {
      console.error("[ImageCropper] Failed to load image:", e);
      setImageLoaded(false);
      setImageError("Failed to load image. Please try a different file.");
    };

    // Set src after attaching event handlers
    img.src = imageSrc;

    // Cleanup function
    return () => {
      console.log("[ImageCropper] Cleanup - removing image ref");
      img.onload = null;
      img.onerror = null;
    };
  }, [imageSrc, isOpen]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw semi-transparent background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Calculate crop area position (centered)
    const cropX = (CANVAS_SIZE - cropWidth) / 2;
    const cropY = (CANVAS_SIZE - cropHeight) / 2;

    // Clear the crop area
    if (cropShape === "round") {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        cropWidth / 2,
        cropHeight / 2,
        0,
        0,
        2 * Math.PI
      );
      ctx.clip();
    } else {
      ctx.clearRect(cropX, cropY, cropWidth, cropHeight);
    }

    // Draw image
    ctx.save();
    ctx.translate(CANVAS_SIZE / 2 + position.x, CANVAS_SIZE / 2 + position.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate image dimensions to fit
    const scale = Math.max(cropWidth / img.width, cropHeight / img.height);
    const imgWidth = img.width * scale;
    const imgHeight = img.height * scale;

    ctx.drawImage(img, -imgWidth / 2, -imgHeight / 2, imgWidth, imgHeight);
    ctx.restore();

    if (cropShape === "round") {
      ctx.restore();
    }

    // Draw crop border
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    if (cropShape === "round") {
      ctx.beginPath();
      ctx.ellipse(
        CANVAS_SIZE / 2,
        CANVAS_SIZE / 2,
        cropWidth / 2,
        cropHeight / 2,
        0,
        0,
        2 * Math.PI
      );
      ctx.stroke();
    } else {
      ctx.strokeRect(cropX, cropY, cropWidth, cropHeight);

      // Draw grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(cropX + cropWidth / 3, cropY);
      ctx.lineTo(cropX + cropWidth / 3, cropY + cropHeight);
      ctx.moveTo(cropX + (2 * cropWidth) / 3, cropY);
      ctx.lineTo(cropX + (2 * cropWidth) / 3, cropY + cropHeight);
      // Horizontal lines
      ctx.moveTo(cropX, cropY + cropHeight / 3);
      ctx.lineTo(cropX + cropWidth, cropY + cropHeight / 3);
      ctx.moveTo(cropX, cropY + (2 * cropHeight) / 3);
      ctx.lineTo(cropX + cropWidth, cropY + (2 * cropHeight) / 3);
      ctx.stroke();
    }
  }, [zoom, rotation, position, cropWidth, cropHeight, cropShape, imageLoaded]);

  // Redraw when state changes
  useEffect(() => {
    if (imageLoaded && canvasRef.current) {
      console.log("[ImageCropper] Drawing canvas...");
      // Use requestAnimationFrame to ensure canvas is ready
      requestAnimationFrame(() => {
        drawCanvas();
      });
    }
  }, [drawCanvas, imageLoaded]);

  // Additional effect to handle Dialog animation delay
  useEffect(() => {
    if (isOpen && imageSrc) {
      // Give Dialog animation time to complete before checking canvas
      const timer = setTimeout(() => {
        if (canvasRef.current && imageRef.current) {
          console.log("[ImageCropper] Delayed redraw after dialog animation");
          drawCanvas();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, imageSrc, drawCanvas]);

  // Mouse handlers for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Generate cropped image
  const handleCrop = useCallback(() => {
    console.log("[ImageCropper] handleCrop called");
    const img = imageRef.current;
    if (!img) {
      console.error("[ImageCropper] No image reference!");
      return;
    }

    console.log("[ImageCropper] Creating crop canvas, img size:", img.width, "x", img.height);

    // Create output canvas
    const outputCanvas = document.createElement("canvas");
    const outputSize = Math.max(cropWidth, cropHeight) * 2; // Higher resolution output
    const canvasWidth = aspectRatio >= 1 ? outputSize : outputSize * aspectRatio;
    const canvasHeight = aspectRatio >= 1 ? outputSize / aspectRatio : outputSize;
    outputCanvas.width = canvasWidth;
    outputCanvas.height = canvasHeight;
    const ctx = outputCanvas.getContext("2d");

    if (!ctx) {
      console.error("[ImageCropper] Failed to get canvas context!");
      return;
    }

    // For round crops, apply circular clip FIRST before drawing
    if (cropShape === "round") {
      ctx.beginPath();
      ctx.ellipse(
        canvasWidth / 2,
        canvasHeight / 2,
        canvasWidth / 2,
        canvasHeight / 2,
        0,
        0,
        2 * Math.PI
      );
      ctx.clip();
    }

    // Apply transformations
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Calculate scale
    const scale = Math.max(cropWidth / img.width, cropHeight / img.height);
    const scaleFactor = canvasWidth / cropWidth;

    ctx.drawImage(
      img,
      (-img.width * scale * scaleFactor) / 2 + position.x * scaleFactor,
      (-img.height * scale * scaleFactor) / 2 + position.y * scaleFactor,
      img.width * scale * scaleFactor,
      img.height * scale * scaleFactor
    );

    // Convert to blob - use PNG for round crops to preserve transparency
    const mimeType = cropShape === "round" ? "image/png" : "image/jpeg";
    console.log("[ImageCropper] Converting canvas to blob, mimeType:", mimeType);

    outputCanvas.toBlob(
      (blob) => {
        if (blob) {
          console.log("[ImageCropper] Blob created, size:", blob.size, "type:", blob.type);
          onCropComplete(blob);
          handleClose();
        } else {
          console.error("[ImageCropper] Failed to create blob!");
        }
      },
      mimeType,
      0.9
    );
  }, [zoom, rotation, position, cropWidth, cropHeight, aspectRatio, cropShape, onCropComplete]);

  const handleClose = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImageLoaded(false);
    setCanvasReady(false);
    setImageError(null);
    imageRef.current = null;
    onClose();
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Debug log when dialog state changes
  useEffect(() => {
    console.log("[ImageCropper] Dialog state - isOpen:", isOpen, "imageSrc length:", imageSrc?.length, "imageLoaded:", imageLoaded);
  }, [isOpen, imageSrc, imageLoaded]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/* Canvas */}
          <div className="relative bg-gray-900 rounded-lg overflow-hidden">
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="cursor-move touch-none"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center flex-col gap-2">
                {imageError ? (
                  <div className="text-red-400 text-center px-4">
                    <p className="text-sm">{imageError}</p>
                  </div>
                ) : (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <p className="text-white text-sm">Loading image...</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-full space-y-4">
            {/* Zoom slider */}
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={0.5}
                max={3}
                step={0.1}
                onValueChange={([value]) => setZoom(value)}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleRotate}>
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <Move className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Drag to reposition. Use controls to zoom and rotate.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleCrop} disabled={!imageLoaded}>
            <Check className="h-4 w-4 mr-2" />
            Apply Crop
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ImageCropper;

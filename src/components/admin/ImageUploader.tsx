import { useState, useRef, useEffect, DragEvent } from "react";
import { X, Upload, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { optimiseImageForUpload, type OptimisedImageResult } from "@/lib/image-upload";

interface ImageUploaderProps {
  images: { file: File | null; url: string; isPrimary: boolean }[];
  setImages: (images: { file: File | null; url: string; isPrimary: boolean }[]) => void;
  maxFiles?: number;
  isUploading?: boolean;
}

interface ImageMetadata {
  width: number | null;
  height: number | null;
  size: number | null;
  format: string | null;
  filename: string | null;
}

interface OptimisationInfo {
  originalSize: number;
  optimisedSize: number;
  originalWidth: number;
  originalHeight: number;
  optimisedWidth: number;
  optimisedHeight: number;
  format: string;
  wasOptimised: boolean;
  usedOriginal: boolean;
  processing: boolean;
  error?: string;
  optimisedPreviewUrl?: string;
}

const RECOMMENDED_WIDTH = 1200;
const RECOMMENDED_HEIGHT = 1200;
const RECOMMENDED_MIN_KB = 100;
const RECOMMENDED_MAX_KB = 300;
const RECOMMENDED_FORMAT = "WebP";

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"];

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "Unknown";
  if (bytes < 1024) return bytes + " B";
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + " KB";
  const mb = kb / 1024;
  return mb.toFixed(2) + " MB";
}

function getFormatFromType(mimeType: string | null): string {
  if (!mimeType) return "Unknown";
  if (mimeType === "image/jpeg") return "JPEG";
  if (mimeType === "image/png") return "PNG";
  if (mimeType === "image/webp") return "WebP";
  const parts = mimeType.split("/");
  if (parts.length === 2) return parts[1].toUpperCase();
  return "Unknown";
}

export function ImageUploader({ images, setImages, maxFiles = 5, isUploading = false }: ImageUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [metadata, setMetadata] = useState<Record<number, ImageMetadata>>({});
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [optimisation, setOptimisation] = useState<Record<number, OptimisationInfo>>({});
  const optimisationUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
      objectUrlsRef.current.clear();
      optimisationUrlsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          // ignore
        }
      });
      optimisationUrlsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const loadMetadataForImages = async () => {
      const newMetadata: Record<number, ImageMetadata> = {};

      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        const meta: ImageMetadata = {
          width: null,
          height: null,
          size: null,
          format: null,
          filename: null,
        };

        if (img.file) {
          meta.filename = img.file.name;
          meta.size = img.file.size;
          meta.format = getFormatFromType(img.file.type);
        } else if (img.url) {
          try {
            const urlParts = img.url.split("/");
            const lastPart = urlParts[urlParts.length - 1];
            if (lastPart && !lastPart.includes("?")) {
              meta.filename = decodeURIComponent(lastPart);
            }
          } catch (e) {
            // ignore
          }
        }

        try {
          const image = new Image();
          await new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error("Failed to load image"));
            image.src = img.url;
          });
          meta.width = image.naturalWidth;
          meta.height = image.naturalHeight;
        } catch (e) {
          // ignore
        }

        newMetadata[index] = meta;
      }

      setMetadata(newMetadata);
    };

    loadMetadataForImages();
  }, [images]);

  // Optimise new files for preview/comparison (shared optimiser)
  useEffect(() => {
    const optimiseFiles = async () => {
      for (let index = 0; index < images.length; index++) {
        const img = images[index];
        if (!img.file) continue;
        const fileToOptimise = img.file;
        // Skip if already optimised info present
        if (optimisation[index] && !optimisation[index].processing) continue;

        setOptimisation((prev) => ({
          ...prev,
          [index]: {
            originalSize: fileToOptimise.size,
            optimisedSize: fileToOptimise.size,
            originalWidth: 0,
            originalHeight: 0,
            optimisedWidth: 0,
            optimisedHeight: 0,
            format: getFormatFromType(fileToOptimise.type),
            wasOptimised: false,
            usedOriginal: true,
            processing: true,
          },
        }));

        try {
          const result: OptimisedImageResult = await optimiseImageForUpload(fileToOptimise);
          if (result.previewUrl) {
            optimisationUrlsRef.current.add(result.previewUrl);
          }
          setOptimisation((prev) => ({
            ...prev,
            [index]: {
              originalSize: result.originalSize,
              optimisedSize: result.optimisedSize,
              originalWidth: result.originalWidth,
              originalHeight: result.originalHeight,
              optimisedWidth: result.width,
              optimisedHeight: result.height,
              format: result.format.toUpperCase(),
              wasOptimised: result.wasOptimised,
              usedOriginal: result.usedOriginal,
              processing: false,
              optimisedPreviewUrl: result.previewUrl,
            },
          }));
          // Replace file with optimised file in state to avoid double compression
          setImages(((prevImages: { file: File | null; url: string; isPrimary: boolean }[]) => {
            const updated = [...prevImages];
            if (updated[index]) {
              updated[index] = {
                ...updated[index],
                file: result.file,
              };
            }
            return updated;
          }) as any);
        } catch (e) {
          setOptimisation((prev) => ({
            ...prev,
            [index]: {
              ...(prev[index] || {
                originalSize: fileToOptimise.size,
                optimisedSize: fileToOptimise.size,
                originalWidth: 0,
                originalHeight: 0,
                optimisedWidth: 0,
                optimisedHeight: 0,
                format: getFormatFromType(fileToOptimise.type),
                wasOptimised: false,
                usedOriginal: true,
              }),
              processing: false,
              error: "Optimisation failed, using original",
            },
          }));
        }
      }
    };

    optimiseFiles();
  }, [images]);

  const validateFiles = (files: File[]) => {
    const maxSize = 2 * 1024 * 1024;

    for (const file of files) {
      if (!VALID_TYPES.includes(file.type)) {
        setError("Invalid file type: " + file.name);
        return false;
      }
      if (file.size > maxSize) {
        setError("File too large: " + file.name);
        return false;
      }
    }
    if (images.length + files.length > maxFiles) {
      setError("Maximum " + maxFiles + " images allowed");
      return false;
    }
    setError(null);
    return true;
  };

  const handleFiles = (files: File[] | FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    if (!validateFiles(fileArray)) return;

    const newImages = fileArray.map((file, idx) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return {
        file,
        url,
        isPrimary: images.length === 0 && idx === 0,
      };
    });

    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const imgToRemove = images[index];
    if (imgToRemove.url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(imgToRemove.url);
        objectUrlsRef.current.delete(imgToRemove.url);
      } catch (e) {
        // ignore
      }
    }
    if (optimisation[index]?.optimisedPreviewUrl) {
      try {
        URL.revokeObjectURL(optimisation[index].optimisedPreviewUrl!);
        optimisationUrlsRef.current.delete(optimisation[index].optimisedPreviewUrl!);
      } catch (e) {
        // ignore
      }
    }

    const newImages = images.filter((_, i) => i !== index);
    if (imgToRemove.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    setImages(newImages);

    setMetadata((prev) => {
      const updated: Record<number, ImageMetadata> = {};
      Object.keys(prev).forEach((key) => {
        const k = parseInt(key);
        if (k < index) {
          updated[k] = prev[k];
        } else if (k > index) {
          updated[k - 1] = prev[k];
        }
      });
      return updated;
    });
    setOptimisation((prev) => {
      const updated: Record<number, OptimisationInfo> = {};
      Object.keys(prev).forEach((key) => {
        const k = parseInt(key);
        if (k < index) {
          updated[k] = prev[k];
        } else if (k > index) {
          updated[k - 1] = prev[k];
        }
      });
      return updated;
    });
  };

  const setPrimary = (index: number) => {
    setImages(
      images.map((img, i) => ({ ...img, isPrimary: i === index }))
    );
  };

  const getWarnings = (meta: ImageMetadata) => {
    const warnings: string[] = [];

    if (meta.format && !["JPEG", "PNG", "WebP"].includes(meta.format)) {
      warnings.push("Unsupported format detected.");
    } else if (meta.format && meta.format !== "WebP") {
      warnings.push("Recommended format: WebP for optimal performance.");
    }

    if (meta.width !== null && meta.height !== null) {
      if (meta.width < RECOMMENDED_WIDTH || meta.height < RECOMMENDED_HEIGHT) {
        warnings.push("Low resolution detected. Recommended: " + RECOMMENDED_WIDTH + " × " + RECOMMENDED_HEIGHT + "px.");
      }
      if (meta.width > RECOMMENDED_WIDTH * 1.5 || meta.height > RECOMMENDED_HEIGHT * 1.5) {
        warnings.push("Large dimensions detected. Consider resizing to " + RECOMMENDED_WIDTH + " × " + RECOMMENDED_HEIGHT + "px while preserving aspect ratio.");
      }
    }

    if (meta.size !== null) {
      const sizeKB = meta.size / 1024;
      if (sizeKB > 500) {
        warnings.push("Large file size (" + formatFileSize(meta.size) + "). Recommended: " + RECOMMENDED_MIN_KB + "–" + RECOMMENDED_MAX_KB + " KB where quality permits.");
      } else if (sizeKB > RECOMMENDED_MAX_KB) {
        warnings.push("File size (" + formatFileSize(meta.size) + ") is above recommended range. Aim for " + RECOMMENDED_MIN_KB + "–" + RECOMMENDED_MAX_KB + " KB where quality permits.");
      }
    }

    return warnings;
  };

  return (
    <div className="space-y-4">
      <div
        className={"border-2 border-dashed rounded-md p-4 transition-colors " + (dragOver ? "border-primary bg-primary/10" : "border-gray-300")}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: DragEvent) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((img, index) => {
            const meta = metadata[index] || {
              width: null,
              height: null,
              size: null,
              format: null,
              filename: null,
            };
            const warnings = getWarnings(meta);
            const opt = optimisation[index];
            const isOptimal = warnings.length === 0 && meta.width && meta.height && meta.format === "WebP" && meta.size && meta.size / 1024 >= RECOMMENDED_MIN_KB && meta.size / 1024 <= RECOMMENDED_MAX_KB && meta.width >= RECOMMENDED_WIDTH && meta.height >= RECOMMENDED_HEIGHT;

            return (
              <div key={img.url + "-" + index} className="border rounded-md overflow-hidden bg-white">
                <div className="relative group aspect-square">
                  <img loading="lazy" decoding="async" src={img.url} alt={meta.filename || "Product image"} className="w-full h-full object-contain bg-gray-50" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <Button size="sm" variant="destructive" onClick={() => removeImage(index)}><X size={16} /></Button>
                    <Button size="sm" onClick={() => setPrimary(index)} disabled={img.isPrimary}>Primary</Button>
                  </div>
                  {img.isPrimary && <span className="absolute top-2 left-2 bg-primary text-white text-xs px-2 py-1 rounded">Primary</span>}
                </div>
                <div className="p-3 space-y-2 text-sm">
                  <div className="font-medium text-gray-900">Image Guidance</div>
                  <div className="space-y-1 text-gray-700">
                    <div><span className="font-medium">Filename:</span> {meta.filename || "Unknown"}</div>
                    <div><span className="font-medium">Dimensions:</span> {meta.width && meta.height ? meta.width + " × " + meta.height + " px" : "Loading..."}</div>
                    <div><span className="font-medium">File size:</span> {formatFileSize(meta.size)}</div>
                    <div><span className="font-medium">Format:</span> {meta.format || "Unknown"}</div>
                  </div>
                  {opt && (
                    <div className="pt-2 border-t space-y-1">
                      <div className="font-medium text-gray-900">Optimisation (pre-upload)</div>
                      {opt.processing ? (
                        <div className="text-xs text-blue-700">Processing...</div>
                      ) : (
                        <>
                          <div className="text-gray-700 space-y-1">
                            <div><span className="font-medium">Original:</span> {formatFileSize(opt.originalSize)}{opt.originalWidth && opt.originalHeight ? ` (${opt.originalWidth} × ${opt.originalHeight}px)` : ""}</div>
                            <div><span className="font-medium">Optimised:</span> {formatFileSize(opt.optimisedSize)}{opt.optimisedWidth && opt.optimisedHeight ? ` (${opt.optimisedWidth} × ${opt.optimisedHeight}px)` : ""}</div>
                            <div><span className="font-medium">Format:</span> {opt.format}</div>
                            <div className="text-xs text-gray-600">
                              {opt.usedOriginal ? "Using original (quality-first)" : opt.wasOptimised ? "Optimised with shared optimiser" : "Optimised"}
                            </div>
                          </div>
                          {opt.optimisedPreviewUrl && (
                            <div className="pt-1">
                              <div className="text-xs font-medium text-gray-700 mb-1">Final image preview</div>
                              <img src={opt.optimisedPreviewUrl} alt="Optimised preview" className="w-full h-32 object-contain bg-gray-50 rounded border" />
                            </div>
                          )}
                        </>
                      )}
                      {opt.error && <div className="text-xs text-amber-700">{opt.error}</div>}
                    </div>
                  )}
                  <div className="pt-2 border-t space-y-1">
                    <div className="font-medium text-gray-900">Recommendations</div>
                    <div className="text-gray-600 text-xs space-y-1">
                      <div>• Recommended dimensions: {RECOMMENDED_WIDTH} × {RECOMMENDED_HEIGHT} pixels</div>
                      <div>• Recommended format: {RECOMMENDED_FORMAT}</div>
                      <div>• Suggested file size: {RECOMMENDED_MIN_KB}–{RECOMMENDED_MAX_KB} KB where quality permits</div>
                    </div>
                  </div>
                  {warnings.length > 0 && (
                    <div className="pt-2 border-t space-y-1">
                      <div className="flex items-center gap-1 font-medium text-amber-700">
                        <AlertTriangle size={14} />
                        <span>Warnings</span>
                      </div>
                      <div className="space-y-1">
                        {warnings.map((warning, wIdx) => (
                          <div key={wIdx} className="text-xs text-amber-700">• {warning}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  {isOptimal && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle size={14} />
                        <span>Meets recommendations</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {images.length < maxFiles && (
            <div
              className="border-2 border-dashed border-gray-300 rounded-md flex flex-col items-center justify-center aspect-square cursor-pointer hover:border-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="text-gray-400" />
              <span className="text-sm text-gray-400">Upload</span>
            </div>
          )}
        </div>
      </div>
      <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {isUploading && (
        <div className="flex flex-col items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "100%" }} />
          </div>
          <p className="text-xs text-blue-700 font-medium">Compressing and uploading images...</p>
        </div>
      )}
    </div>
  );
}

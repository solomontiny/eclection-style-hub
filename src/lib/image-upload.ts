import { supabase } from "@/integrations/supabase/client";

export interface UploadedImage {
  path: string;
  publicUrl: string;
  width: number;
  height: number;
  size: number;
  format: "webp" | "jpeg" | "png";
  thumbnails?: Record<string, { url: string; width: number; height: number; size: number }>;
}

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeKB?: number;
  generateThumbnails?: boolean;
  thumbnailSizes?: number[];
}

const DEFAULT_OPTIONS: Required<CompressionOptions> = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 0.85,
  maxSizeKB: 300, // recommendation only, not enforced if it hurts quality
  generateThumbnails: true,
  thumbnailSizes: [200, 400, 800],
};

const RECOMMENDED_PRODUCT_SIZE = 1200;

export interface OptimisedImageResult {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  format: "webp" | "jpeg" | "png";
  originalSize: number;
  optimisedSize: number;
  originalWidth: number;
  originalHeight: number;
  wasOptimised: boolean;
  usedOriginal: boolean;
  previewUrl: string;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function getCanvasDimensions(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }
  return { width, height };
}

function compressToWebP(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas context unavailable"));
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("WebP encoding failed"))),
      "image/webp",
      quality
    );
  });
}

function compressToPNG(
  img: HTMLImageElement,
  width: number,
  height: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas context unavailable"));
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("PNG encoding failed"))),
      "image/png"
    );
  });
}

function compressToJPEG(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("Canvas context unavailable"));
    ctx.drawImage(img, 0, 0, width, height);
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("JPEG encoding failed"))),
      "image/jpeg",
      quality
    );
  });
}

async function imageHasTransparency(img: HTMLImageElement): Promise<boolean> {
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(img.width, 200);
  canvas.height = Math.min(img.height, 200);
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

function blobToFile(blob: Blob, originalName: string, extension: string): File {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
  const fileName = `${nameWithoutExt}.${extension}`;
  try {
    return new File([blob], fileName, { type: blob.type });
  } catch {
    // Fallback for environments where File constructor may be limited
    const file = new Blob([blob], { type: blob.type }) as any;
    file.name = fileName;
    file.lastModified = Date.now();
    return file as File;
  }
}

// Mark to detect already-optimised files produced by our optimiser
const OPTIMISED_MARKER = "x-eclection-optimised";

function isAlreadyOptimised(file: File): boolean {
  try {
    if ((file as any)[OPTIMISED_MARKER]) return true;
    // Also check name pattern if needed (not required)
  } catch {
    // ignore
  }
  return false;
}

function markOptimised(file: File): File {
  try {
    (file as any)[OPTIMISED_MARKER] = true;
  } catch {
    // ignore
  }
  return file;
}

async function generateThumbnail(
  img: HTMLImageElement,
  size: number,
  quality: number,
  format: "webp" | "png"
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");
  const ratio = Math.min(size / img.width, size / img.height);
  const drawWidth = Math.round(img.width * ratio);
  const drawHeight = Math.round(img.height * ratio);
  const offsetX = (size - drawWidth) / 2;
  const offsetY = (size - drawHeight) / 2;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error(`${format} encoding failed`))),
      `image/${format}`,
      quality
    );
  });
}

export async function optimiseImageForUpload(
  file: File,
  options: CompressionOptions = {}
): Promise<OptimisedImageResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const originalSize = file.size;

  try {
    // If already optimised by our system, avoid reprocessing where possible
    if (isAlreadyOptimised(file)) {
      const dataUrl = await fileToDataURL(file);
      const img = await loadImage(dataUrl);
      const blob = file.slice(0, file.size, file.type) as Blob;
      const previewUrl = URL.createObjectURL(blob);
      const format = (file.type.split("/")[1] as "webp" | "jpeg" | "png") || "webp";
      return {
        blob,
        file,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: (format as string) === "jpg" ? "jpeg" : (format as "jpeg" | "png" | "webp"),
        originalSize,
        optimisedSize: file.size,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        wasOptimised: true,
        usedOriginal: true,
        previewUrl,
      };
    }

    const dataUrl = await fileToDataURL(file);
    const img = await loadImage(dataUrl);
    const originalWidth = img.naturalWidth;
    const originalHeight = img.naturalHeight;

    const hasAlpha = await imageHasTransparency(img);
    const isPng = file.type === "image/png";

    // Determine if we should resize
    let targetMaxW = opts.maxWidth;
    let targetMaxH = opts.maxHeight;
    // Don't resize unnecessarily if already within recommended and small? But still ensure max 1600
    const { width: resizedW, height: resizedH } = getCanvasDimensions(img, targetMaxW, targetMaxH);

    if (isPng && hasAlpha) {
      // Preserve transparency, prefer PNG; only downscale if over max or very large
      let currentWidth = resizedW;
      let currentHeight = resizedH;
      let blob = await compressToPNG(img, currentWidth, currentHeight);
      // Quality-first: only scale down if still too large AND scaling helps meaningfully
      // Avoid aggressive compression; try to keep quality
      let attempts = 0;
      const maxBytes = opts.maxSizeKB * 1024;
      while (blob.size > maxBytes * 1.5 && currentWidth > 800 && attempts < 3) {
        const scale = Math.sqrt((maxBytes * 1.2) / blob.size);
        currentWidth = Math.max(800, Math.round(currentWidth * scale));
        currentHeight = Math.max(800, Math.round(currentHeight * scale));
        blob = await compressToPNG(img, currentWidth, currentHeight);
        attempts++;
      }
      // If still larger than original and worse quality not needed, prefer original if original is reasonable
      if (blob.size >= originalSize && originalSize <= 5 * 1024 * 1024) {
        // Use original to preserve quality
        const originalBlob = file.slice(0, file.size, file.type);
        const originalFile = markOptimised(file);
        const previewUrl = URL.createObjectURL(originalBlob);
        return {
          blob: originalBlob,
          file: originalFile,
          width: originalWidth,
          height: originalHeight,
          format: "png",
          originalSize,
          optimisedSize: originalSize,
          originalWidth,
          originalHeight,
          wasOptimised: false,
          usedOriginal: true,
          previewUrl,
        };
      }
      const outFile = markOptimised(blobToFile(blob, file.name, "png"));
      const previewUrl = URL.createObjectURL(blob);
      return {
        blob,
        file: outFile,
        width: currentWidth,
        height: currentHeight,
        format: "png",
        originalSize,
        optimisedSize: blob.size,
        originalWidth,
        originalHeight,
        wasOptimised: true,
        usedOriginal: false,
        previewUrl,
      };
    } else {
      // Suitable for WebP (photographic) - start at ~85% quality
      const quality = opts.quality >= 0.8 && opts.quality <= 0.9 ? opts.quality : 0.85;
      let currentWidth = resizedW;
      let currentHeight = resizedH;
      let blob = await compressToWebP(img, currentWidth, currentHeight, quality);
      // Quality-first: do NOT aggressively force to 300KB if it hurts quality.
      // Only reduce if significantly over and quality still acceptable; prefer higher quality.
      const maxBytes = opts.maxSizeKB * 1024;
      let attempts = 0;
      // Try to reduce size gently if way over, but stop early to preserve quality
      while (blob.size > maxBytes * 1.8 && quality > 0.75 && attempts < 2) {
        // Reduce quality slightly
        const q2 = Math.max(0.75, quality - 0.05 * (attempts + 1));
        blob = await compressToWebP(img, currentWidth, currentHeight, q2);
        attempts++;
        if (blob.size < originalSize) break;
      }
      // If compressed is larger than original, use original
      if (blob.size >= originalSize && originalSize > 0) {
        const originalBlob = file.slice(0, file.size, file.type);
        const originalFile = markOptimised(file);
        const previewUrl = URL.createObjectURL(originalBlob);
        const origFmtRaw = file.type.split("/")[1] || "jpeg";
      let origFmt: "jpeg" | "png" | "webp" = "jpeg";
      if (origFmtRaw === "png") origFmt = "png";
      else if (origFmtRaw === "webp") origFmt = "webp";
      else origFmt = "jpeg";
        return {
          blob: originalBlob,
          file: originalFile,
          width: originalWidth,
          height: originalHeight,
          format: (origFmt as string) === "jpg" ? "jpeg" : origFmt,
          originalSize,
          optimisedSize: originalSize,
          originalWidth,
          originalHeight,
          wasOptimised: false,
          usedOriginal: true,
          previewUrl,
        };
      }
      // If still very large but quality-first - don't force down below reasonable quality; accept larger if needed
      const outFile = markOptimised(blobToFile(blob, file.name, "webp"));
      const previewUrl = URL.createObjectURL(blob);
      return {
        blob,
        file: outFile,
        width: currentWidth,
        height: currentHeight,
        format: "webp",
        originalSize,
        optimisedSize: blob.size,
        originalWidth,
        originalHeight,
        wasOptimised: true,
        usedOriginal: false,
        previewUrl,
      };
    }
  } catch (e) {
    // If optimisation fails, safely retain original
    const originalBlob = file.slice(0, file.size, file.type);
    const originalFile = markOptimised(file);
    const previewUrl = URL.createObjectURL(originalBlob);
    const origFmtRaw2 = file.type.split("/")[1] || "jpeg";
    let origFmt: "jpeg" | "png" | "webp" = "jpeg";
    if (origFmtRaw2 === "png") origFmt = "png";
    else if (origFmtRaw2 === "webp") origFmt = "webp";
    else origFmt = "jpeg";
    try {
      const img = await loadImage(await fileToDataURL(file));
      return {
        blob: originalBlob,
        file: originalFile,
        width: img.naturalWidth,
        height: img.naturalHeight,
        format: origFmt,
        originalSize,
        optimisedSize: originalSize,
        originalWidth: img.naturalWidth,
        originalHeight: img.naturalHeight,
        wasOptimised: false,
        usedOriginal: true,
        previewUrl,
      };
    } catch {
      return {
        blob: originalBlob,
        file: originalFile,
        width: 0,
        height: 0,
        format: origFmt,
        originalSize,
        optimisedSize: originalSize,
        originalWidth: 0,
        originalHeight: 0,
        wasOptimised: false,
        usedOriginal: true,
        previewUrl,
      };
    }
  }
}

export async function compressAndConvertImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; width: number; height: number; format: "webp" | "png" }> {
  // Use shared optimiser for consistency
  const result = await optimiseImageForUpload(file, options);
  return {
    blob: result.blob,
    width: result.width,
    height: result.height,
    format: result.format === "jpeg" ? "webp" : (result.format as "webp" | "png"),
  };
}

function generateStoragePath(extension: string = "webp"): string {
  return `${crypto.randomUUID()}.${extension}`;
}

function extractStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/product-images/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = publicUrl.slice(idx + marker.length);
  return decodeURIComponent(path);
}

export async function uploadProductImage(
  file: File,
  options: CompressionOptions = {}
): Promise<UploadedImage> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  // Optimise (shared) - will skip if already optimised
  const optimised = await optimiseImageForUpload(file, options);
  const blob = optimised.blob;
  const width = optimised.width;
  const height = optimised.height;
  const format = optimised.format;
  const storagePath = generateStoragePath(format);

  const { data, error } = await supabase.storage
    .from("product-images")
    .upload(storagePath, blob, {
      contentType: `image/${format}`,
      cacheControl: "public, max-age=31536000, immutable",
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: publicUrlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(data.path);

  const uploadedImage: UploadedImage = {
    path: data.path,
    publicUrl: publicUrlData.publicUrl,
    width,
    height,
    size: blob.size,
    format,
  };

  if (opts.generateThumbnails) {
    try {
      const dataUrl = await fileToDataURL(optimised.usedOriginal ? file : optimised.file);
      const img = await loadImage(dataUrl);
      const thumbnails: Record<string, { url: string; width: number; height: number; size: number }> = {};

      for (const thumbSize of opts.thumbnailSizes) {
        const thumbBlob = await generateThumbnail(img, thumbSize, opts.quality, format === "png" ? "png" : "webp");
        const thumbPath = `${storagePath.replace(/\.[^.]+$/, "")}_${thumbSize}w.${format === "png" ? "png" : "webp"}`;

        const { data: thumbData, error: thumbError } = await supabase.storage
          .from("product-images")
          .upload(thumbPath, thumbBlob, {
            contentType: `image/${format === "png" ? "png" : "webp"}`,
            cacheControl: "public, max-age=31536000, immutable",
            upsert: false,
          });

        if (!thumbError && thumbData) {
          const { data: thumbUrlData } = supabase.storage
            .from("product-images")
            .getPublicUrl(thumbData.path);
          thumbnails[`${thumbSize}w`] = {
            url: thumbUrlData.publicUrl,
            width: thumbSize,
            height: thumbSize,
            size: thumbBlob.size,
          };
        }
      }

      if (Object.keys(thumbnails).length > 0) {
        uploadedImage.thumbnails = thumbnails;
      }
    } catch (e) {
      // ignore thumbnail errors
    }
  }

  return uploadedImage;
}

export async function uploadMultipleProductImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<UploadedImage[]> {
  const results: UploadedImage[] = [];
  for (const file of files) {
    results.push(await uploadProductImage(file, options));
  }
  return results;
}

export async function deleteProductImages(pathsOrUrls: string[]): Promise<void> {
  const paths = pathsOrUrls
    .map((p) => (p.includes("/storage/v1/object/public/") ? extractStoragePathFromPublicUrl(p) : p))
    .filter((p): p is string => p !== null && p.length > 0);

  if (paths.length === 0) return;

  const allPaths = [...paths];
  for (const path of paths) {
    const baseName = path.replace(/\.[^.]+$/, "");
    for (const size of DEFAULT_OPTIONS.thumbnailSizes) {
      allPaths.push(`${baseName}_${size}w.webp`);
      allPaths.push(`${baseName}_${size}w.png`);
    }
  }

  const { error } = await supabase.storage.from("product-images").remove(allPaths);
  if (error) console.error("Failed to delete images:", error.message);
}

export async function replaceProductImage(
  oldPathOrUrl: string,
  newFile: File,
  options: CompressionOptions = {}
): Promise<UploadedImage> {
  const oldPath = extractStoragePathFromPublicUrl(oldPathOrUrl) ?? oldPathOrUrl;
  await deleteProductImages([oldPathOrUrl]);
  return uploadProductImage(newFile, options);
}

export function getThumbnailUrl(imageUrl: string, width: number): string | null {
  if (!imageUrl || !Number.isFinite(width) || width <= 0) return null;

  try {
    const url = new URL(imageUrl);
    const marker = "/storage/v1/object/public/product-images/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;

    const objectPath = url.pathname.slice(markerIndex + marker.length);
    url.pathname = `${url.pathname.slice(0, markerIndex)}/storage/v1/render/image/public/product-images/${objectPath}`;
    url.searchParams.set("width", String(Math.round(width)));
    url.searchParams.set("height", String(Math.round(width)));
    url.searchParams.set("resize", "cover");
    return url.toString();
  } catch {
    return null;
  }
}

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
  quality: 0.82,
  maxSizeKB: 300,
  generateThumbnails: true,
  thumbnailSizes: [200, 400, 800],
};

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

async function ensureUnderSizeLimit(
  img: HTMLImageElement,
  width: number,
  height: number,
  quality: number,
  maxSizeKB: number
): Promise<{ blob: Blob; finalQuality: number; finalWidth: number; finalHeight: number }> {
  let currentQuality = quality;
  let currentWidth = width;
  let currentHeight = height;
  let blob = await compressToWebP(img, currentWidth, currentHeight, currentQuality);

  const maxBytes = maxSizeKB * 1024;

  while (blob.size > maxBytes && (currentQuality > 0.4 || currentWidth > 400)) {
    if (currentQuality > 0.4) {
      currentQuality = Math.max(0.4, currentQuality - 0.08);
    } else {
      const scale = Math.sqrt(maxBytes / blob.size);
      currentWidth = Math.max(400, Math.round(currentWidth * scale));
      currentHeight = Math.max(400, Math.round(currentHeight * scale));
    }
    blob = await compressToWebP(img, currentWidth, currentHeight, currentQuality);
  }

  return { blob, finalQuality: currentQuality, finalWidth: currentWidth, finalHeight: currentHeight };
}

async function ensureUnderSizeLimitPNG(
  img: HTMLImageElement,
  width: number,
  height: number,
  maxSizeKB: number
): Promise<{ blob: Blob; finalWidth: number; finalHeight: number }> {
  let currentWidth = width;
  let currentHeight = height;
  let blob = await compressToPNG(img, currentWidth, currentHeight);

  const maxBytes = maxSizeKB * 1024;

  while (blob.size > maxBytes && currentWidth > 400) {
    const scale = Math.sqrt(maxBytes / blob.size);
    currentWidth = Math.max(400, Math.round(currentWidth * scale));
    currentHeight = Math.max(400, Math.round(currentHeight * scale));
    blob = await compressToPNG(img, currentWidth, currentHeight);
  }

  return { blob, finalWidth: currentWidth, finalHeight: currentHeight };
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

export async function compressAndConvertImage(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; width: number; height: number; format: "webp" | "png" }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dataUrl = await fileToDataURL(file);
  const img = await loadImage(dataUrl);
  const { width, height } = getCanvasDimensions(img, opts.maxWidth, opts.maxHeight);

  const hasAlpha = await imageHasTransparency(img);
  const usePng = file.type === "image/png" && hasAlpha;

  let blob: Blob;
  let format: "webp" | "png";
  let finalWidth = width;
  let finalHeight = height;

  if (usePng) {
    const result = await ensureUnderSizeLimitPNG(
      img,
      width,
      height,
      opts.maxSizeKB
    );
    blob = result.blob;
    format = "png";
    finalWidth = result.finalWidth;
    finalHeight = result.finalHeight;
  } else {
    const result = await ensureUnderSizeLimit(
      img,
      width,
      height,
      opts.quality,
      opts.maxSizeKB
    );
    blob = result.blob;
    format = "webp";
    finalWidth = result.finalWidth;
    finalHeight = result.finalHeight;
  }

  return { blob, width: finalWidth, height: finalHeight, format };
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
  const { blob, width, height, format } = await compressAndConvertImage(file, options);
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
    const dataUrl = await fileToDataURL(file);
    const img = await loadImage(dataUrl);
    const thumbnails: Record<string, { url: string; width: number; height: number; size: number }> = {};

    for (const thumbSize of opts.thumbnailSizes) {
      const thumbBlob = await generateThumbnail(img, thumbSize, opts.quality, format);
      const thumbPath = `${storagePath.replace(/\.[^.]+$/, "")}_${thumbSize}w.${format}`;

      const { data: thumbData, error: thumbError } = await supabase.storage
        .from("product-images")
        .upload(thumbPath, thumbBlob, {
          contentType: `image/${format}`,
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
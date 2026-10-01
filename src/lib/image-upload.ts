/**
 * Client-side image preparation for product uploads.
 *
 * Product images are served straight from Supabase Storage, so an unoptimised
 * camera PNG (commonly 2 MB) is downloaded by every storefront visitor who sees
 * that product. Compressing in the browser before the upload keeps the same
 * visual result at a fraction of the bytes, which is the single biggest lever
 * on Storage bandwidth.
 *
 * This only ever affects a file the admin has just picked. Existing images in
 * Storage are never touched, replaced or removed by this helper.
 */

import { supabase } from "@/integrations/supabase/client";

/** Bucket every product image lives in. */
export const PRODUCT_IMAGE_BUCKET = "product-images";

/**
 * Cache lifetime, in seconds, applied to every uploaded product image.
 *
 * This is only safe because product images are addressed by an immutable,
 * versioned URL: every upload writes a brand-new object path, so a given URL
 * always resolves to the same bytes for as long as it exists. When an admin
 * replaces an image the URL changes, and browsers fetch the new file instead of
 * serving the old one from cache.
 *
 * The invariant to preserve: never overwrite an existing object in place.
 * Changing the bytes behind a live URL while it carries this TTL would leave
 * customers on the previous image for up to a year.
 */
export const PRODUCT_IMAGE_CACHE_CONTROL = "31536000";

/** Longest edge kept, in pixels. Tall product shots stay sharp on any display. */
const MAX_EDGE = 1600;

/** Files already this small and this size are uploaded untouched. */
const SKIP_BELOW_BYTES = 250 * 1024;

const WEBP_QUALITY = 0.85;

export type PreparedImage = {
  /** The bytes to upload — either the original file or a re-encoded one. */
  file: File;
  /** Filename to store under, with the extension matching the new bytes. */
  name: string;
  originalBytes: number;
  /** False when the original was small enough to upload as-is. */
  compressed: boolean;
};

type Decoded = {
  width: number;
  height: number;
  source: CanvasImageSource;
  release: () => void;
};

async function decodeImage(file: File): Promise<Decoded | null> {
  // createImageBitmap is faster and decodes off the main thread where available.
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        width: bitmap.width,
        height: bitmap.height,
        source: bitmap,
        release: () => bitmap.close(),
      };
    } catch {
      // Fall through to the <img> decoder.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode failed"));
      el.src = url;
    });
    return {
      width: img.naturalWidth,
      height: img.naturalHeight,
      source: img,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

function encodeCanvas(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (webp) => {
        if (webp) return resolve(webp);
        // Safari < 14 and a few older engines have no WebP encoder.
        canvas.toBlob((jpeg) => resolve(jpeg), "image/jpeg", WEBP_QUALITY);
      },
      "image/webp",
      WEBP_QUALITY,
    );
  });
}

function withExtension(originalName: string, extension: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, "") || "image";
  return `${base}.${extension}`;
}

/**
 * Returns the file to upload. Any failure falls back to the untouched original
 * so a compression problem can never block an admin from saving a product.
 */
export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
  const passthrough: PreparedImage = {
    file,
    name: file.name,
    originalBytes: file.size,
    compressed: false,
  };

  // Animated and vector formats must keep their original bytes.
  if (!file.type.startsWith("image/")) return passthrough;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return passthrough;

  try {
    const decoded = await decodeImage(file);
    if (!decoded) return passthrough;

    const tooLarge = Math.max(decoded.width, decoded.height) > MAX_EDGE;
    if (!tooLarge && file.size <= SKIP_BELOW_BYTES) {
      decoded.release();
      return passthrough;
    }

    const scale = Math.min(1, MAX_EDGE / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      decoded.release();
      return passthrough;
    }

    ctx.drawImage(decoded.source, 0, 0, width, height);
    decoded.release();

    const blob = await encodeCanvas(canvas);
    // Never trade a bigger file or a failed encode for a "compressed" one.
    if (!blob || blob.size >= file.size) return passthrough;

    const name = withExtension(file.name, blob.type === "image/webp" ? "webp" : "jpg");
    return {
      file: new File([blob], name, { type: blob.type }),
      name,
      originalBytes: file.size,
      compressed: true,
    };
  } catch {
    return passthrough;
  }
}

/**
 * Compresses, uploads and resolves one product image.
 *
 * Every call stores the bytes under a fresh UUID-prefixed path, so a URL handed
 * out by this function is never reused for different content. That is what
 * makes the one-year cache lifetime safe: replacing a product image produces a
 * new URL, so no browser can be stuck showing the previous file.
 *
 * Returns the canonical public URL, which is the only form the storefront and
 * the database should ever store.
 */
export async function uploadProductImage(file: File): Promise<{
  url: string;
  path: string;
  originalBytes: number;
  compressed: boolean;
}> {
  const prepared = await prepareImageForUpload(file);
  const path = `${crypto.randomUUID()}-${prepared.name.replace(/\s+/g, "-")}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGE_BUCKET)
    .upload(path, prepared.file, {
      cacheControl: PRODUCT_IMAGE_CACHE_CONTROL,
      upsert: false,
    });

  if (error) throw new Error(error.message);

  return {
    url: supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl,
    path,
    originalBytes: prepared.originalBytes,
    compressed: prepared.compressed,
  };
}

/**
 * Storage paths for the public URLs a product currently references.
 *
 * `remove()` takes bucket-relative paths, not URLs, so replacing an image has
 * to translate before it can reclaim the old object. Without this the old file
 * is silently orphaned in the bucket.
 */
export function storagePathsFromUrls(urls: string[]): string[] {
  const marker = `/object/public/${PRODUCT_IMAGE_BUCKET}/`;
  return urls
    .map((url) => {
      const at = url.indexOf(marker);
      return at === -1 ? null : url.slice(at + marker.length);
    })
    .filter((path): path is string => !!path);
}

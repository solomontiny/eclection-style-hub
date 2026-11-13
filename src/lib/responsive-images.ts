import {
  createResponsiveImageProps,
  getProductImageThumbnailUrl,
  handleResponsiveImageError,
} from "@/lib/responsive-image-utils.mjs";
import type { ResponsiveImageOptions } from "@/lib/responsive-image-utils.mjs";
import type { SyntheticEvent } from "react";

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();

function createConfiguredResponsiveImageProps(imageUrl: string, options: ResponsiveImageOptions = {}) {
  return createResponsiveImageProps(imageUrl, { ...options, supabaseUrl: configuredSupabaseUrl });
}

export function fallbackToOriginalImage(event: SyntheticEvent<HTMLImageElement>, fallbackSrc?: string) {
  handleResponsiveImageError(event.currentTarget, fallbackSrc);
}

export interface ResponsiveImageProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  priority?: boolean;
  width?: number;
  height?: number;
}

export function getSrcSet(baseUrl: string, widths: number[] = [200, 400, 800, 1200]): string {
  return createConfiguredResponsiveImageProps(baseUrl, { widths }).srcSet;
}

export function getResponsiveImageProps(
  imageUrl: string,
  options: ResponsiveImageOptions = {}
): {
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
} {
  return createConfiguredResponsiveImageProps(imageUrl, options);
}

export function getProductCardImageProps(imageUrl: string) {
  return getResponsiveImageProps(imageUrl, {
    sizes: "(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px",
    widths: [200, 400],
    fallbackWidth: 320,
    fallbackHeight: 400,
  });
}

export function getProductDetailImageProps(imageUrl: string) {
  return getResponsiveImageProps(imageUrl, {
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px",
    widths: [400, 800, 1200],
    fallbackWidth: 800,
    fallbackHeight: 1000,
  });
}

export function getCategoryImageProps(imageUrl: string) {
  return getResponsiveImageProps(imageUrl, {
    sizes: "(max-width: 640px) 160px, (max-width: 1024px) 200px, 240px",
    widths: [200, 400],
    fallbackWidth: 320,
    fallbackHeight: 400,
  });
}

export function getQuickViewImageProps(imageUrl: string) {
  return getResponsiveImageProps(imageUrl, {
    sizes: "(max-width: 768px) 100vw, 400px",
    widths: [200, 400, 800],
    fallbackWidth: 400,
    fallbackHeight: 500,
  });
}

export function getThumbnailProps(imageUrl: string, size: number) {
  const thumbUrl = getProductImageThumbnailUrl(imageUrl, size, configuredSupabaseUrl);
  if (!thumbUrl) return null;
  return {
    src: thumbUrl,
    width: size,
    height: size,
  };
}

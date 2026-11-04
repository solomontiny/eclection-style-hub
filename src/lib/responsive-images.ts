import { getThumbnailUrl } from "@/lib/image-upload";
import type { SyntheticEvent } from "react";

export function fallbackToOriginalImage(event: SyntheticEvent<HTMLImageElement>) {
  const image = event.currentTarget;
  if (image.currentSrc && image.currentSrc !== image.src) {
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    return;
  }
  image.style.display = "none";
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
  return widths
    .map((w) => {
      const thumbUrl = getThumbnailUrl(baseUrl, w);
      return thumbUrl ? `${thumbUrl} ${w}w` : null;
    })
    .filter(Boolean)
    .join(", ");
}

export function getResponsiveImageProps(
  imageUrl: string,
  options: {
    sizes?: string;
    widths?: number[];
    fallbackWidth?: number;
    fallbackHeight?: number;
  } = {}
): {
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
} {
  const { sizes = "(max-width: 640px) 200px, (max-width: 1024px) 400px, 800px", widths = [200, 400, 800, 1200] } = options;
  
  const srcSet = getSrcSet(imageUrl, widths);
  
  return {
    src: imageUrl,
    srcSet,
    sizes,
    width: options.fallbackWidth || 800,
    height: options.fallbackHeight || 1000,
  };
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
  const thumbUrl = getThumbnailUrl(imageUrl, size);
  if (!thumbUrl) return null;
  return {
    src: thumbUrl,
    width: size,
    height: size,
  };
}
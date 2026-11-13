export type ResponsiveImageOptions = {
  sizes?: string;
  widths?: number[];
  fallbackWidth?: number;
  fallbackHeight?: number;
  supabaseUrl?: string;
};

export type ResponsiveImagePropsData = {
  src: string;
  srcSet: string;
  sizes: string;
  width: number;
  height: number;
};

export function getProductImageThumbnailUrl(
  imageUrl: string,
  width: number,
  supabaseUrl?: string,
): string | null;
export function createResponsiveImageProps(
  imageUrl: string,
  options?: ResponsiveImageOptions,
): ResponsiveImagePropsData;
export function handleResponsiveImageError(
  image: HTMLImageElement,
  fallbackSrc?: string,
): void;

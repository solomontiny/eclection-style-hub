const PRODUCT_IMAGES_OBJECT_PATH = "/storage/v1/object/public/product-images/";

export function getProductImageThumbnailUrl(imageUrl, width, supabaseUrl) {
  if (!imageUrl || !Number.isFinite(width) || width <= 0) return null;

  try {
    const url = new URL(imageUrl);
    const supabaseOrigin = new URL(supabaseUrl).origin;
    if (url.origin !== supabaseOrigin) return null;
    const markerIndex = url.pathname.indexOf(PRODUCT_IMAGES_OBJECT_PATH);
    if (markerIndex === -1) return null;

    const objectPath = url.pathname.slice(markerIndex + PRODUCT_IMAGES_OBJECT_PATH.length);
    if (!objectPath) return null;

    url.pathname = `${url.pathname.slice(0, markerIndex)}/storage/v1/render/image/public/product-images/${objectPath}`;
    url.searchParams.set("width", String(Math.round(width)));
    url.searchParams.set("height", String(Math.round(width)));
    url.searchParams.set("resize", "cover");
    return url.toString();
  } catch {
    return null;
  }
}

export function createResponsiveImageProps(imageUrl, options = {}) {
  const {
    sizes = "(max-width: 640px) 200px, (max-width: 1024px) 400px, 800px",
    widths = [200, 400, 800, 1200],
    fallbackWidth = 800,
    fallbackHeight = 1000,
    supabaseUrl,
  } = options;

  const srcSet = widths
    .map((width) => {
      const thumbnailUrl = getProductImageThumbnailUrl(imageUrl, width, supabaseUrl);
      return thumbnailUrl ? `${thumbnailUrl} ${width}w` : null;
    })
    .filter(Boolean)
    .join(", ");

  return { src: imageUrl, srcSet, sizes, width: fallbackWidth, height: fallbackHeight };
}

export function handleResponsiveImageError(image, fallbackSrc) {
  if (image.currentSrc && image.currentSrc !== image.src) {
    image.removeAttribute("srcset");
    image.removeAttribute("sizes");
    return;
  }

  if (fallbackSrc && image.getAttribute("src") !== fallbackSrc) {
    image.setAttribute("src", fallbackSrc);
    return;
  }

  image.style.display = "none";
}

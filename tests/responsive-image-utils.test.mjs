import test from "node:test";
import assert from "node:assert/strict";
import {
  createResponsiveImageProps,
  getProductImageThumbnailUrl,
  handleResponsiveImageError,
} from "../src/lib/responsive-image-utils.mjs";

const projectUrl = "https://store-example.supabase.co";
const productImageUrl = `${projectUrl}/storage/v1/object/public/product-images/items/dress.webp`;

test("only configured Supabase product-images URLs receive transformations", () => {
  assert.equal(
    getProductImageThumbnailUrl(productImageUrl, 200, projectUrl),
    `${projectUrl}/storage/v1/render/image/public/product-images/items/dress.webp?width=200&height=200&resize=cover`,
  );
  assert.equal(
    getProductImageThumbnailUrl(
      "https://cdn.example.com/storage/v1/object/public/product-images/dress.webp",
      200,
      projectUrl,
    ),
    null,
  );
  assert.equal(
    getProductImageThumbnailUrl(`${projectUrl}/storage/v1/object/public/site-media/dress.webp`, 200, projectUrl),
    null,
  );
  assert.equal(getProductImageThumbnailUrl(productImageUrl, 0, projectUrl), null);
});

test("responsive props retain original source fallback and omit transforms for external images", () => {
  const local = createResponsiveImageProps(productImageUrl, {
    widths: [100, 200],
    sizes: "160px",
    fallbackWidth: 160,
    fallbackHeight: 200,
    supabaseUrl: projectUrl,
  });
  assert.equal(local.src, productImageUrl);
  assert.equal(local.sizes, "160px");
  assert.equal(local.width, 160);
  assert.equal(local.height, 200);
  assert.match(local.srcSet, /width=100.*100w/);
  assert.match(local.srcSet, /width=200.*200w/);

  const externalUrl = "https://images.example.com/dress.webp";
  const external = createResponsiveImageProps(externalUrl, { supabaseUrl: projectUrl });
  assert.equal(external.src, externalUrl);
  assert.equal(external.srcSet, "");

  const profileUrl = `${projectUrl}/storage/v1/object/public/customer-profiles/customer/avatar.webp`;
  const profile = createResponsiveImageProps(profileUrl, { supabaseUrl: projectUrl });
  assert.equal(profile.src, profileUrl);
  assert.equal(profile.srcSet, "");
});

test("responsive image errors fall back to original, then optional brand fallback", () => {
  const attributes = { src: productImageUrl, srcset: "transformed candidates", sizes: "160px" };
  const image = {
    currentSrc: `${projectUrl}/storage/v1/render/image/public/product-images/items/dress.webp?width=200`,
    src: productImageUrl,
    style: {},
    getAttribute(name) { return attributes[name] ?? null; },
    setAttribute(name, value) { attributes[name] = value; },
    removeAttribute(name) { delete attributes[name]; },
  };

  handleResponsiveImageError(image);
  assert.equal(attributes.src, productImageUrl);
  assert.equal(attributes.srcset, undefined);
  assert.equal(attributes.sizes, undefined);

  image.currentSrc = productImageUrl;
  handleResponsiveImageError(image, "/brand-fallback.png");
  assert.equal(attributes.src, "/brand-fallback.png");
  handleResponsiveImageError(image, "/brand-fallback.png");
  assert.equal(image.style.display, "none");
});

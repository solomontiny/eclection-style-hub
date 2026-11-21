export const WHOLESALE_BUNDLE_SIZE = 10;
export const MAX_BUNDLES_PER_ORDER = 10;
export const MAX_WHOLESALE_QUANTITY = WHOLESALE_BUNDLE_SIZE * MAX_BUNDLES_PER_ORDER; // 100 pieces

export const WHOLESALE_TIERS = [
  { minimumQuantity: 10, pricePerPiece: 6000 },
  { minimumQuantity: 50, pricePerPiece: 5900 },
  { minimumQuantity: 100, pricePerPiece: 5800 },
  { minimumQuantity: 500, pricePerPiece: 5700 },
  { minimumQuantity: 1000, pricePerPiece: 5500 },
] as const;

export function isValidWholesaleQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= WHOLESALE_BUNDLE_SIZE && quantity % WHOLESALE_BUNDLE_SIZE === 0 && quantity <= MAX_WHOLESALE_QUANTITY;
}

export function isValidBundleCount(bundleCount: number) {
  return Number.isInteger(bundleCount) && bundleCount >= 1 && bundleCount <= MAX_BUNDLES_PER_ORDER;
}

export function getWholesaleTier(quantity: number) {
  if (!isValidWholesaleQuantity(quantity)) return null;
  for (let index = WHOLESALE_TIERS.length - 1; index >= 0; index -= 1) {
    const tier = WHOLESALE_TIERS[index];
    if (quantity >= tier.minimumQuantity) return tier;
  }
  return null;
}

export function getNextWholesaleTier(quantity: number) {
  if (quantity < WHOLESALE_BUNDLE_SIZE) return WHOLESALE_TIERS[0];
  return WHOLESALE_TIERS.find((tier) => tier.minimumQuantity > quantity) ?? null;
}

export function getEffectiveProductBasePrice(product: {
  price?: number | string | null;
  sale_price?: number | string | null;
  discount_percent?: number | string | null;
}) {
  const sale = product.sale_price == null ? null : Number(product.sale_price);
  if (sale != null && Number.isFinite(sale) && sale > 0) return sale;

  const base = Number(product.price ?? 0);
  const discount = Number(product.discount_percent ?? 0);
  const safeBase = Number.isFinite(base) ? base : 0;
  const safeDiscount = Number.isFinite(discount) ? discount : 0;
  const discounted = safeBase * (1 - safeDiscount / 100);

  if (Number.isFinite(discounted) && discounted > 0) return discounted;
  return safeBase > 0 ? safeBase : 0;
}
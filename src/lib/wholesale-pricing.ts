export const WHOLESALE_BUNDLE_SIZE = 10;

export const WHOLESALE_TIERS = [
  { minimumQuantity: 10, pricePerPiece: 6000 },
  { minimumQuantity: 50, pricePerPiece: 5900 },
  { minimumQuantity: 100, pricePerPiece: 5800 },
  { minimumQuantity: 500, pricePerPiece: 5700 },
  { minimumQuantity: 1000, pricePerPiece: 5600 },
] as const;

export function isValidWholesaleQuantity(quantity: number) {
  return Number.isInteger(quantity) && quantity >= WHOLESALE_BUNDLE_SIZE && quantity % WHOLESALE_BUNDLE_SIZE === 0;
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

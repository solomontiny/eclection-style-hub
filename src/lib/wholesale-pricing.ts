export const WHOLESALE_BUNDLE_SIZE = 10;

export const WHOLESALE_TIERS = [
  { minimumQuantity: 10, pricePerPiece: 6500 },
  { minimumQuantity: 30, pricePerPiece: 6400 },
  { minimumQuantity: 40, pricePerPiece: 6200 },
  { minimumQuantity: 50, pricePerPiece: 6100 },
  { minimumQuantity: 500, pricePerPiece: 6000 },
  { minimumQuantity: 1000, pricePerPiece: 6000 },
] as const;

export function getWholesaleTier(quantity: number) {
  for (let index = WHOLESALE_TIERS.length - 1; index >= 0; index -= 1) {
    const tier = WHOLESALE_TIERS[index];
    if (quantity >= tier.minimumQuantity) return tier;
  }
  return null;
}

export function getNextWholesaleTier(quantity: number) {
  return WHOLESALE_TIERS.find((tier) => tier.minimumQuantity > quantity) ?? null;
}

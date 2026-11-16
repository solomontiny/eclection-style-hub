export const CHECKOUT_ATTEMPT_STORAGE_KEY: string;

export type CheckoutAttemptItem = {
  id?: string | null;
  size?: string | null;
  color?: string | null;
  qty?: number | string | null;
  bundleId?: string | null;
  isBulk?: boolean | null;
};

export type CheckoutAttemptState = {
  key: string;
  fingerprint: string;
  created: boolean;
};

export function createCheckoutAttemptFingerprint(items?: CheckoutAttemptItem[] | null): string;

export function resolveCheckoutAttemptKey(args?: {
  items?: CheckoutAttemptItem[] | null;
  storage?: Pick<Storage, "getItem" | "setItem"> | null;
  storageKey?: string;
  createKey?: () => string;
}): CheckoutAttemptState;

export function clearCheckoutAttemptKey(
  storage?: Pick<Storage, "removeItem"> | null,
  storageKey?: string,
): void;

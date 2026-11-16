export const CHECKOUT_ATTEMPT_STORAGE_KEY = "sa_checkout_attempt_v1";

function normalizeText(value) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

export function createCheckoutAttemptFingerprint(items = []) {
  const normalized = (Array.isArray(items) ? items : []).map((item) => ({
    id: normalizeText(item?.id),
    size: normalizeText(item?.size),
    color: normalizeText(item?.color),
    qty: Number.isFinite(Number(item?.qty)) ? Math.trunc(Number(item.qty)) : 0,
    bundleId: normalizeText(item?.bundleId),
    isBulk: !!item?.isBulk,
  }));

  normalized.sort((a, b) => {
    const ka = `${a.bundleId}|${a.id}|${a.size}|${a.color}|${a.isBulk ? 1 : 0}|${a.qty}`;
    const kb = `${b.bundleId}|${b.id}|${b.size}|${b.color}|${b.isBulk ? 1 : 0}|${b.qty}`;
    return ka.localeCompare(kb);
  });

  return JSON.stringify(normalized);
}

function parseStoredAttempt(raw) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const key = typeof parsed.key === "string" ? parsed.key : "";
    const fingerprint = typeof parsed.fingerprint === "string" ? parsed.fingerprint : "";
    if (!key || !fingerprint) return null;
    return { key, fingerprint };
  } catch {
    return null;
  }
}

export function resolveCheckoutAttemptKey({
  items = [],
  storage,
  storageKey = CHECKOUT_ATTEMPT_STORAGE_KEY,
  createKey = () => globalThis.crypto.randomUUID(),
} = {}) {
  const fingerprint = createCheckoutAttemptFingerprint(items);
  const canRead = storage && typeof storage.getItem === "function";
  const canWrite = storage && typeof storage.setItem === "function";

  let existing = null;
  if (canRead) {
    try {
      existing = parseStoredAttempt(storage.getItem(storageKey));
    } catch {
      existing = null;
    }
  }
  if (existing && existing.fingerprint === fingerprint) {
    return { key: existing.key, fingerprint, created: false };
  }

  const key = String(createKey());
  if (canWrite) {
    try {
      storage.setItem(storageKey, JSON.stringify({ key, fingerprint }));
    } catch {
      // Storage may be unavailable (private mode/quota). The in-memory key still
      // protects against double-submit in the current page session.
    }
  }
  return { key, fingerprint, created: true };
}

export function clearCheckoutAttemptKey(storage, storageKey = CHECKOUT_ATTEMPT_STORAGE_KEY) {
  if (!storage || typeof storage.removeItem !== "function") return;
  try {
    storage.removeItem(storageKey);
  } catch {
    // Ignore storage removal failures.
  }
}

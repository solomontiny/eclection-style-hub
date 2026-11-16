import test from "node:test";
import assert from "node:assert/strict";
import {
  CHECKOUT_ATTEMPT_STORAGE_KEY,
  clearCheckoutAttemptKey,
  createCheckoutAttemptFingerprint,
  resolveCheckoutAttemptKey,
} from "../src/lib/checkout-attempt.mjs";

function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    dump() {
      return Object.fromEntries(data.entries());
    },
  };
}

test("same checkout attempt reuses the same key for an identical cart", () => {
  const storage = memoryStorage();
  let seq = 0;
  const createKey = () => `attempt-${++seq}`;
  const items = [
    { id: "p1", size: "M", color: "Red", qty: 1 },
    { id: "p2", size: "L", qty: 2, isBulk: true, bundleId: "b1" },
  ];

  const first = resolveCheckoutAttemptKey({ items, storage, createKey });
  const second = resolveCheckoutAttemptKey({ items: [...items].reverse(), storage, createKey });

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.key, first.key);
  assert.equal(seq, 1);
  assert.equal(storage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY) != null, true);
});

test("a genuinely new attempt gets a different key after the previous attempt is cleared", () => {
  const storage = memoryStorage();
  let seq = 0;
  const createKey = () => `attempt-${++seq}`;
  const items = [{ id: "p1", size: "M", color: "Blue", qty: 1 }];

  const first = resolveCheckoutAttemptKey({ items, storage, createKey });
  clearCheckoutAttemptKey(storage);
  const second = resolveCheckoutAttemptKey({ items, storage, createKey });

  assert.notEqual(second.key, first.key);
  assert.equal(first.key, "attempt-1");
  assert.equal(second.key, "attempt-2");
});

test("changing cart contents rotates the attempt key for a different checkout attempt", () => {
  const storage = memoryStorage();
  let seq = 0;
  const createKey = () => `attempt-${++seq}`;

  const first = resolveCheckoutAttemptKey({
    items: [{ id: "p1", size: "M", qty: 1 }],
    storage,
    createKey,
  });
  const second = resolveCheckoutAttemptKey({
    items: [{ id: "p1", size: "M", qty: 2 }],
    storage,
    createKey,
  });

  assert.notEqual(second.key, first.key);
  assert.equal(second.created, true);
  assert.notEqual(
    createCheckoutAttemptFingerprint([{ id: "p1", size: "M", qty: 1 }]),
    createCheckoutAttemptFingerprint([{ id: "p1", size: "M", qty: 2 }]),
  );
});

test("storage unavailable or failing is handled safely without losing the in-session key", () => {
  const throwingStorage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("quota");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };

  const resolved = resolveCheckoutAttemptKey({
    items: [{ id: "p1", size: "M", qty: 1 }],
    storage: throwingStorage,
    createKey: () => "attempt-memory",
  });

  assert.equal(resolved.key, "attempt-memory");
  assert.equal(resolved.created, true);
  assert.doesNotThrow(() => clearCheckoutAttemptKey(throwingStorage));
});

test("cleared or missing storage yields a new key so an identical later purchase is a new attempt", () => {
  let seq = 0;
  const createKey = () => `attempt-${++seq}`;
  const items = [{ id: "p1", size: "M", qty: 1, bundleId: "b1", isBulk: true }];

  const a = resolveCheckoutAttemptKey({ items, storage: memoryStorage(), createKey });
  const b = resolveCheckoutAttemptKey({ items, storage: memoryStorage(), createKey });

  assert.notEqual(a.key, b.key);
  assert.equal(a.created, true);
  assert.equal(b.created, true);
});


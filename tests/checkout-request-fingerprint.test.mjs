import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCanonicalCheckoutRequest,
  createCheckoutRequestFingerprint,
  serializeCanonicalCheckoutRequest,
} from "../src/lib/checkout-request-fingerprint.mjs";

const baseOrder = {
  user_id: "user-1",
  customer_name: "Ada",
  customer_email: "ada@example.com",
  customer_phone: "08000000000",
  shipping_address: { address: "1 Road", city: "Lagos", state: "Lagos", country: "Nigeria", postal_code: null, delivery_instructions: null },
  subtotal: 1000,
  discount: 0,
  shipping: 0,
  vat_amount: 0,
  vat_rate: 0,
  taxable_subtotal: 1000,
  total: 1000,
  payment_status: "pending",
  payment_method: "bank_transfer",
  paystack_reference: null,
  currency: "NGN",
  payment_currency: "NGN",
  payment_amount: 1000,
  notes: "Dress x 1",
};

const baseItems = [
  { product_id: "p1", product_name: "Dress", unit_price: 1000, quantity: 1, size: "M", color: "Red", bundle_id: null, subtotal: 1000 },
];

test("fingerprint is stable for identical logical payloads regardless of item order", async () => {
  const a = await createCheckoutRequestFingerprint(baseOrder, baseItems);
  const b = await createCheckoutRequestFingerprint(baseOrder, [...baseItems].reverse());
  assert.equal(a, b);
});

test("fingerprint changes when any logical checkout field changes", async () => {
  const original = await createCheckoutRequestFingerprint(baseOrder, baseItems);
  const cases = [
    [{ ...baseOrder, total: 1200 }, baseItems],
    [{ ...baseOrder, currency: "USD" }, baseItems],
    [{ ...baseOrder, payment_amount: 2 }, baseItems],
    [{ ...baseOrder, customer_email: "other@example.com" }, baseItems],
    [{ ...baseOrder, shipping_address: { ...baseOrder.shipping_address, city: "Abuja" } }, baseItems],
    [baseOrder, [{ ...baseItems[0], quantity: 2, subtotal: 2000 }]],
    [baseOrder, [{ ...baseItems[0], unit_price: 1100, subtotal: 1100 }]],
    [baseOrder, [{ ...baseItems[0], size: "L" }]],
    [baseOrder, [{ ...baseItems[0], color: "Blue" }]],
    [baseOrder, [{ ...baseItems[0], bundle_id: "b1" }]],
    [baseOrder, [{ ...baseItems[0], product_id: "p2" }]],
  ];
  for (const [order, items] of cases) {
    const changed = await createCheckoutRequestFingerprint(order, items);
    assert.notEqual(changed, original, serializeCanonicalCheckoutRequest(order, items));
  }
});

test("canonical request includes server-authoritative items and totals", () => {
  const canonical = buildCanonicalCheckoutRequest(baseOrder, baseItems);
  assert.equal(canonical.user_id, "user-1");
  assert.equal(canonical.total, 1000);
  assert.equal(Array.isArray(canonical.items), true);
  assert.equal(canonical.items[0].product_id, "p1");
});

test("invalid or non-finite numeric values do not collapse to equivalent fingerprints", async () => {
  const valid = await createCheckoutRequestFingerprint(baseOrder, baseItems);

  const nanTotal = await createCheckoutRequestFingerprint({ ...baseOrder, total: NaN }, baseItems);
  const nullishTotal = await createCheckoutRequestFingerprint({ ...baseOrder, total: undefined }, baseItems);
  const zeroTotal = await createCheckoutRequestFingerprint({ ...baseOrder, total: 0 }, baseItems);
  const infiniteTotal = await createCheckoutRequestFingerprint({ ...baseOrder, total: Infinity }, baseItems);

  assert.notEqual(nanTotal, valid);
  assert.notEqual(nanTotal, zeroTotal);
  assert.notEqual(nanTotal, nullishTotal);
  assert.notEqual(infiniteTotal, valid);
  assert.notEqual(infiniteTotal, nanTotal);

  const nanQty = await createCheckoutRequestFingerprint(baseOrder, [{ ...baseItems[0], quantity: NaN }]);
  const floatQty = await createCheckoutRequestFingerprint(baseOrder, [{ ...baseItems[0], quantity: 1.5 }]);
  const validQty = await createCheckoutRequestFingerprint(baseOrder, [{ ...baseItems[0], quantity: 1 }]);
  assert.notEqual(nanQty, validQty);
  assert.notEqual(floatQty, validQty);
});

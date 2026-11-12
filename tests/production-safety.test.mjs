import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ADVERT_VIDEO_MAX_BYTES,
  validateAdvertVideo,
} from "../src/lib/advert-upload-validation.mjs";
import {
  getOrderIdFromSearch,
  setOrderIdInSearch,
  summarizePaidRevenue,
} from "../src/lib/admin-order-view.mjs";

const fixture = (overrides = {}) => ({
  id: "order-1",
  order_number: "SA-1001",
  customer_name: "Test Customer",
  customer_email: "local@example.test",
  status: "processing",
  payment_status: "paid",
  payment_method: "bank_transfer",
  total: 15000,
  subtotal: 12000,
  shipping: 5000,
  discount: 2000,
  items: [
    { product_name: "Test Dress", size: "M", quantity: 1, unit_price: 7000, subtotal: 7000 },
    { product_name: "Test Shirt", size: "L", quantity: 1, unit_price: 5000, subtotal: 5000 },
  ],
  ...overrides,
});

test("paid, pending, cancelled, and multi-item local order fixtures preserve stored values", () => {
  const paid = fixture();
  const pending = fixture({ id: "order-2", payment_status: "pending", status: "pending" });
  const cancelled = fixture({ id: "order-3", status: "cancelled" });
  assert.equal(paid.items.length, 2);
  assert.deepEqual(
    paid.items.map(({ size, quantity }) => [size, quantity]),
    [
      ["M", 1],
      ["L", 1],
    ],
  );
  assert.equal(paid.total, paid.subtotal + paid.shipping - paid.discount);
  assert.equal(pending.payment_status, "pending");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(paid.order_number, "SA-1001");
});

test("deep links load an order ID and close removes only orderId", () => {
  assert.equal(getOrderIdFromSearch("?tab=all&orderId=order-1"), "order-1");
  assert.equal(setOrderIdInSearch("?tab=all&orderId=order-1", null), "?tab=all");
  assert.equal(setOrderIdInSearch("?tab=all", "order-2"), "?tab=all&orderId=order-2");
  assert.equal(getOrderIdFromSearch("?orderId=%3Cscript%3E"), "<script>");
});

test("dashboard revenue excludes pending and cancelled orders", () => {
  assert.equal(
    summarizePaidRevenue([
      fixture({ total: 15000 }),
      fixture({ payment_status: "pending", total: 9000 }),
      fixture({ status: "cancelled", total: 4000 }),
    ]),
    15000,
  );
});

test("advert MP4 validator accepts below and exactly 15 MiB, rejects above", () => {
  assert.equal(ADVERT_VIDEO_MAX_BYTES, 15728640);
  assert.equal(validateAdvertVideo({ type: "video/mp4", size: ADVERT_VIDEO_MAX_BYTES - 1 }), null);
  assert.equal(validateAdvertVideo({ type: "video/mp4", size: ADVERT_VIDEO_MAX_BYTES }), null);
  assert.match(
    validateAdvertVideo({ type: "video/mp4", size: ADVERT_VIDEO_MAX_BYTES + 1 }),
    /15 MB/,
  );
});

test("advert validator rejects webm, quicktime, and missing or incorrect MIME types", () => {
  for (const type of ["video/webm", "video/quicktime", "", "application/octet-stream"]) {
    assert.match(validateAdvertVideo({ type, size: 100 }), /MP4/);
  }
  assert.match(validateAdvertVideo(null), /MP4/);
});

test("order dialog stays read-only and renders item/status/customer/financial fields", async () => {
  const source = await readFile(new URL("../src/pages/admin/Orders.tsx", import.meta.url), "utf8");
  const dialog = source.slice(source.indexOf("function OrderDetailsDialog"));
  assert.match(dialog, /\.eq\("id", orderId/);
  assert.match(dialog, /\.eq\("order_id", orderId/);
  for (const field of [
    "customer_name",
    "customer_email",
    "customer_phone",
    "order_number",
    "payment_status",
    "shipping_address",
    "unit_price",
    "quantity",
    "size",
    "subtotal",
    "shipping",
    "discount",
    "total",
  ])
    assert.ok(dialog.includes(field), `dialog includes ${field}`);
  assert.doesNotMatch(
    dialog,
    /\.update\(|\.insert\(|\.delete\(|verifyBankTransferPayment|cancelOrder|sendBankTransferReceipt/,
  );
});

test("shared Size Chart has no size-selection callback or shopping mutations", async () => {
  const chart = await readFile(
    new URL("../src/components/SizeChartDialog.tsx", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(chart, /onSelectSize|selectedSize|onClick=.*handleRow/);
  assert.match(chart, /DialogTrigger/);
  for (const file of [
    "../src/routes/product.$slug.tsx",
    "../src/components/QuickViewModal.tsx",
    "../src/components/BuyNowDialog.tsx",
  ]) {
    const page = await readFile(new URL(file, import.meta.url), "utf8");
    assert.match(page, /<SizeChartDialog\s*\/>/);
  }
});

function normalizeScalar(value) {
  if (value === undefined) return null;
  return value;
}

function canonicalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(canonicalizeValue);
  }
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalizeValue(value[key]);
    }
    return out;
  }
  return normalizeScalar(value);
}

function normalizeRequiredNumber(value) {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number(value);
  if (Number.isFinite(n)) return n;
  // Preserve invalid/non-finite values distinctly to avoid unsafe equivalence
  // (e.g. NaN vs null/0) in a server-authoritative fingerprint.
  return `__invalid_number__:${String(value)}`;
}

function normalizeRequiredInteger(value) {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : Number(value);
  if (Number.isFinite(n) && Number.isInteger(n)) return n;
  return `__invalid_integer__:${String(value)}`;
}

export function buildCanonicalCheckoutRequest(orderData, orderItems) {
  const canonicalItems = (Array.isArray(orderItems) ? orderItems : [])
    .map((item) => ({
      product_id: item?.product_id ?? null,
      product_name: item?.product_name ?? null,
      unit_price: normalizeRequiredNumber(item?.unit_price),
      quantity: normalizeRequiredInteger(item?.quantity),
      size: item?.size ?? "",
      color: item?.color ?? "",
      bundle_id: item?.bundle_id ?? null,
      subtotal: normalizeRequiredNumber(item?.subtotal),
    }))
    .sort((a, b) =>
      JSON.stringify(canonicalizeValue(a)).localeCompare(JSON.stringify(canonicalizeValue(b))),
    );

  return canonicalizeValue({
    user_id: orderData?.user_id ?? null,
    customer_name: orderData?.customer_name ?? null,
    customer_email: orderData?.customer_email ?? null,
    customer_phone: orderData?.customer_phone ?? null,
    shipping_address: orderData?.shipping_address ?? null,
    subtotal: normalizeRequiredNumber(orderData?.subtotal),
    discount: normalizeRequiredNumber(orderData?.discount),
    shipping: normalizeRequiredNumber(orderData?.shipping),
    vat_amount: normalizeRequiredNumber(orderData?.vat_amount),
    vat_rate: normalizeRequiredNumber(orderData?.vat_rate),
    taxable_subtotal: normalizeRequiredNumber(orderData?.taxable_subtotal),
    total: normalizeRequiredNumber(orderData?.total),
    payment_status: orderData?.payment_status ?? null,
    payment_method: orderData?.payment_method ?? null,
    paystack_reference: orderData?.paystack_reference ?? null,
    currency: orderData?.currency ?? null,
    payment_currency: orderData?.payment_currency ?? null,
    payment_amount: normalizeRequiredNumber(orderData?.payment_amount),
    notes: orderData?.notes ?? null,
    items: canonicalItems,
  });
}

export function serializeCanonicalCheckoutRequest(orderData, orderItems) {
  return JSON.stringify(buildCanonicalCheckoutRequest(orderData, orderItems));
}

export async function createCheckoutRequestFingerprint(orderData, orderItems) {
  const payload = serializeCanonicalCheckoutRequest(orderData, orderItems);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

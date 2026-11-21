import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { CONTACT } from "./contact";
import { getSupabaseAdmin, getEnvVar } from "./supabase-admin.server";
import { newOrderNotification, sendCustomerOrderEmail } from "./notifications";
import { getOrderStockReservations, emitStockAlerts } from "./stock";
import { sendEmail } from "./email.server";
import {
  getPaymentCurrency,
  PAYSTACK_SUPPORTED_CURRENCIES,
  calculatePaystackAmount,
  getExpectedPaystackAmount,
  getOrderPaymentCurrency,
  convertToPaymentCurrency,
} from "./currency";
import {
  isValidWholesaleQuantity,
  isValidBundleCount,
  getWholesaleTier,
  WHOLESALE_BUNDLE_SIZE,
  MAX_BUNDLES_PER_ORDER,
  MAX_WHOLESALE_QUANTITY,
} from "./wholesale-pricing";
import { createHash } from "node:crypto";

/**
 * Reads the Paystack LIVE secret key from the server runtime.
 *
 * The Cloudflare Worker bindings are injected into `process.env` by the
 * custom `src/server.ts` worker entry (`bindServerEnvironment`) on every
 * request, so `process.env.PAYSTACK_SECRET_KEY` is the single supported
 * access path for this binding. Local dev falls back to the `.env` file
 * loaded by the same entry.
 */
export function getPaystackSecret(): string | undefined {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  console.log(`PAYSTACK_SECRET_KEY configured: ${secret ? "YES" : "NO"}`);
  return secret;
}

const SnapshotSchema = z.object({
  orderRef: z.string().min(3).max(64),
  createdAt: z.number(),
  customer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(160),
    phone: z.string().max(40).optional().default(""),
  }),
  items: z
    .array(
      z.object({
        id: z.string().max(120),
        name: z.string().min(1).max(200),
        size: z.string().max(10),
        color: z.string().optional(),
        qty: z.number().int().min(1).max(99),
        price: z.number().min(0),
        image: z.string().max(500).optional().default(""),
        bundleId: z.string().optional(),
        isBulk: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(50),
  delivery: z.object({
    label: z.string().max(200),
    fee: z.number().min(0),
    eta: z.string().max(120),
  }),
  subtotal: z.number().min(0),
  total: z.number().min(0),
});

const InputSchema = z.object({
  snapshot: SnapshotSchema,
  paystackRef: z
    .string()
    .min(3)
    .max(80)
    .regex(/^[A-Za-z0-9_-]+$/),
});

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

function esc(s: string | number | undefined | null) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailHtml(args: {
  snapshot: z.infer<typeof SnapshotSchema>;
  paystackRef: string;
  audience: "customer" | "business";
}) {
  const { snapshot: s, paystackRef, audience } = args;
  const dateStr = new Date(s.createdAt).toLocaleString("en-NG");
  const firstName = s.customer.name.split(" ")[0] || "there";
  const greeting =
    audience === "customer"
      ? `Hi ${esc(firstName)}, thank you for shopping with SupplierAffordable!`
      : `New paid order received from ${esc(s.customer.name)}.`;

  const rows = s.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;">${esc(it.name)}<br><span style="color:#888;font-size:12px;">Size ${esc(it.size)}${esc(it.color ? ` · Color ${it.color}` : "")}${it.isBulk ? ` · Bulk` : ""} · Qty ${esc(it.qty)}${it.bundleId ? ` · Bundle ${it.bundleId.slice(-6)}` : ""}</span></td>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;text-align:right;white-space:nowrap;">${naira(it.price * it.qty)}</td>
      </tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
    <tr><td style="padding:24px 24px 8px;">
      <p style="margin:0;font-size:11px;letter-spacing:2px;color:#c44569;text-transform:uppercase;font-weight:700;">${audience === "customer" ? "Order confirmation" : "New paid order"}</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#111;">${greeting}</h1>
      <p style="margin:6px 0 0;color:#666;font-size:13px;">Order #${esc(s.orderRef)} · ${esc(dateStr)}</p>
    </td></tr>

    <tr><td style="padding:0 24px;">
      <div style="margin-top:16px;padding:12px 14px;background:#fdf2f7;border:1px solid #f6c8da;border-radius:10px;font-size:13px;">
        <b style="color:#c44569;">Paystack reference:</b> <span style="font-family:monospace;">${esc(paystackRef)}</span>
      </div>
    </td></tr>

    <tr><td style="padding:16px 24px 0;">
      <h2 style="font-size:13px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:14px 0 6px;">Dresses</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${rows}
      </table>
    </td></tr>

    <tr><td style="padding:8px 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
        <tr><td style="padding:6px 0;color:#666;">Subtotal</td><td style="padding:6px 0;text-align:right;">${naira(s.subtotal)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Delivery (${esc(s.delivery.label)})</td><td style="padding:6px 0;text-align:right;">${s.delivery.fee === 0 ? "FREE" : naira(s.delivery.fee)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:12px;" colspan="2">Arrives in <b style="color:#111;">${esc(s.delivery.eta)}</b></td></tr>
        <tr><td style="padding:12px 0 0;border-top:1px solid #eee;font-weight:700;font-size:16px;">Total paid</td><td style="padding:12px 0 0;border-top:1px solid #eee;text-align:right;font-weight:700;font-size:18px;color:#c44569;">${naira(s.total)}</td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:16px 24px 24px;">
      <h2 style="font-size:13px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:14px 0 6px;">${audience === "customer" ? "Delivery to" : "Customer"}</h2>
      <p style="margin:0;font-size:14px;line-height:1.6;">
        <b>${esc(s.customer.name)}</b><br>
        ${esc(s.customer.email)}${s.customer.phone ? `<br>${esc(s.customer.phone)}` : ""}
      </p>

      <p style="margin:18px 0 0;font-size:12px;color:#888;">
        ${
          audience === "customer"
            ? `Questions? Reply to this email or write to ${esc(CONTACT.email)}.`
            : `Reply to the customer at ${esc(s.customer.email)} or call ${esc(s.customer.phone || "—")}.`
        }
      </p>
    </td></tr>

  </table>
</body></html>`;
}

export const getTaxSettings = createServerFn({ method: "GET" }).handler(async () => {
  console.log("Fetching tax settings...");
  const { data: settings, error } = await getSupabaseAdmin()
    .from("shop_settings")
    .select("tax_percent")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    console.error("Error fetching tax settings:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { taxPercent: 0, vatEnabled: false };
  }
  console.log("Fetched tax settings:", settings);
  const taxPercent = settings ? Number(settings.tax_percent) : 0;
  return {
    taxPercent,
    vatEnabled: taxPercent > 0,
  };
});

/**
 * Server function to fetch all active products using admin client.
 * Bypasses RLS to ensure all products are visible (fixes PostgREST anon limit issue).
 */
export const getAllProductsServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = getSupabaseAdmin();
  
  const { data: products, error } = await supabaseAdmin
    .from("products")
    .select("*, category:categories(name, active)")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllProductsServerFn error:", error);
    throw new Error(error.message);
  }

  return products ?? [];
});
async function getAuthenticatedUserFromRequest() {
  const headers = getRequestHeaders();
  const authHeader = headers.get("authorization");
  const cookieHeader = headers.get("cookie");
  const authUrl = getEnvVar("SUPABASE_URL");
  const authKey = getEnvVar("SUPABASE_ANON_KEY");

  console.log("[getAuthenticatedUserFromRequest] Debug:", {
    hasAuthHeader: !!authHeader,
    hasCookie: !!cookieHeader,
    hasAuthUrl: !!authUrl,
    hasAuthKey: !!authKey,
  });

  if (!(authHeader || cookieHeader) || !authUrl || !authKey) {
    console.warn("[getAuthenticatedUserFromRequest] Missing headers or env vars:", {
      hasAuthHeader: !!authHeader,
      hasCookie: !!cookieHeader,
      hasAuthUrl: !!authUrl,
      hasAuthKey: !!authKey,
    });
    return null;
  }

  const userClient = createClient<Database>(authUrl, authKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    },
  });

  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const {
    data: { user },
    error,
  } = token ? await userClient.auth.getUser(token) : await userClient.auth.getUser();

  if (error) {
    console.error("[getAuthenticatedUserFromRequest] auth.getUser error:", error.message);
  }

  console.log("[getAuthenticatedUserFromRequest] Resolved user:", user?.id ?? "null");
  return user ?? null;
}

async function requireAdminUser() {
  const user = await getAuthenticatedUserFromRequest();
  if (!user) {
    throw new Error("Unauthorized: Authentication required.");
  }

  const { data: roleData } = await getSupabaseAdmin()
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    throw new Error("Unauthorized: Admin access required.");
  }

  return user;
}

export const createOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      items: z.array(
        z.object({
          id: z.string(),
          size: z.string(),
          color: z.string().optional(),
          qty: z.number().int().min(1),
          isBulk: z.boolean().optional(),
          bundleId: z.string().optional(),
        }),
      ),
      customer: z.object({
        name: z.string(),
        email: z.string().email(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        country: z.string().optional(),
        postalCode: z.string().optional(),
        deliveryInstructions: z.string().optional(),
      }),
      callbackUrl: z.string().url().optional(),
      currency: z.string().optional().default("NGN"),
      checkoutAttemptKey: z.string().optional(),
      checkoutRequestFingerprint: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { items, customer, callbackUrl, currency, checkoutAttemptKey, checkoutRequestFingerprint } = data;
    let supabaseAdmin: ReturnType<typeof getSupabaseAdmin>;
    try {
      supabaseAdmin = getSupabaseAdmin();
    } catch (supabaseError) {
      console.error("[createOrderServerFn] Supabase admin init failed:", supabaseError);
      throw new Error("Server configuration error. Please try again later.");
    }

    const authenticatedUser = await getAuthenticatedUserFromRequest();
    if (!authenticatedUser) {
      throw new Error("You must be signed in to place an order.");
    }

    // Bank transfer checkout gate: only allow new orders when enabled in shop_settings
    const { data: shopSettings, error: settingsError } = await getSupabaseAdmin()
      .from("shop_settings")
      .select("bank_transfer_enabled, bank_accounts")
      .eq("id", "default")
      .maybeSingle();

    const serverUrl = process.env.SUPABASE_URL || "";
    console.log("[createOrderServerFn] shop_settings diagnostic:", {
      hasError: !!settingsError,
      errorCode: settingsError?.code ?? null,
      errorMessage: settingsError?.message ?? null,
      recordFound: !!shopSettings,
      bankTransferEnabled: shopSettings?.bank_transfer_enabled ?? null,
      bankAccountsCount: Array.isArray(shopSettings?.bank_accounts) ? shopSettings.bank_accounts.length : 0,
      isExpectedProject: serverUrl.includes("clvxfobvtqwdmuzqbehk"),
    });

    // Validate bank accounts have required fields
    const hasValidBankAccounts = Array.isArray(shopSettings?.bank_accounts) &&
      shopSettings.bank_accounts.length > 0 &&
      shopSettings.bank_accounts.some((acc: any) =>
        typeof acc?.bank_name === 'string' && acc.bank_name.trim() !== '' &&
        typeof acc?.account_name === 'string' && acc.account_name.trim() !== '' &&
        typeof acc?.account_number === 'string' && acc.account_number.trim() !== ''
      );

    if (settingsError || !shopSettings?.bank_transfer_enabled || !hasValidBankAccounts) {
      throw new Error("Bank transfer payments are temporarily unavailable.");
    }

try {
      // Determine payment currency: use display currency if supported, otherwise NGN
      const paymentCurrency = "NGN";

      // 1. Fetch products
      const { data: products, error: productError } = await getSupabaseAdmin()
        .from("products")
        .select("id, name, price, sale_price, discount_percent, stock")
        .in(
          "id",
          items.map((i) => i.id),
        );

      if (productError || !products) {
        console.error(
          "Failed to fetch products:",
          productError?.code,
          productError?.message,
          productError?.details,
        );
        throw new Error("We could not load your items. Please refresh your cart and try again.");
      }

      // 1b. Reject out-of-stock items before creating the order (pre-check for better UX).
      for (const item of items) {
        const product = products.find((p) => p.id === item.id);
        if (!product) throw new Error("One of the items in your cart is no longer available.");
        if (Math.max(0, Number(product.stock ?? 0)) < item.qty) {
          throw new Error(
            `${product.name} does not have enough stock. Only ${product.stock} available.`,
          );
        }
      }

      // 2. Calculate totals (authoritative, server-side, no VAT)
      let subtotal = 0;

      // Group bulk items by bundleId to calculate tiered pricing per bundle
      const bulkItemsByBundle = new Map<string, typeof items>();
      const regularItems: typeof items = [];

      for (const item of items) {
        if (item.isBulk && item.bundleId) {
          const bundleItems = bulkItemsByBundle.get(item.bundleId) ?? [];
          bundleItems.push(item);
          bulkItemsByBundle.set(item.bundleId, bundleItems);
        } else if (item.isBulk) {
          // Bulk item without bundleId - treat as its own bundle
          const bundleItems = bulkItemsByBundle.get(`single-${item.id}`) ?? [];
          bundleItems.push(item);
          bulkItemsByBundle.set(`single-${item.id}`, bundleItems);
        } else {
          regularItems.push(item);
        }
      }

      // Calculate wholesale price per bundle
      const bundleWholesalePrices = new Map<string, number>();
      for (const [bundleId, bundleItems] of bulkItemsByBundle.entries()) {
        const totalBundleQty = bundleItems.reduce((sum, item) => sum + item.qty, 0);

        // Validate wholesale quantity
        if (!isValidWholesaleQuantity(totalBundleQty)) {
          throw new Error(
            `Invalid wholesale quantity for bundle ${bundleId.slice(0, 8)}: ${totalBundleQty} pieces. Must be at least ${WHOLESALE_BUNDLE_SIZE} and a multiple of ${WHOLESALE_BUNDLE_SIZE}, maximum ${MAX_WHOLESALE_QUANTITY} pieces (${MAX_BUNDLES_PER_ORDER} bundles).`
          );
        }

        // Validate bundle count
        const bundleCount = totalBundleQty / WHOLESALE_BUNDLE_SIZE;
        if (!isValidBundleCount(bundleCount)) {
          throw new Error(
            `Invalid bundle count for bundle ${bundleId.slice(0, 8)}: ${bundleCount} bundles. Maximum ${MAX_BUNDLES_PER_ORDER} bundles per order.`
          );
        }

        // Business rule: A single product selected inside a bundle cannot exceed quantity 10.
        const productQtyInBundle = new Map<string, number>();
        for (const item of bundleItems) {
          const current = productQtyInBundle.get(item.id) ?? 0;
          productQtyInBundle.set(item.id, current + item.qty);
        }
        for (const [productId, qty] of productQtyInBundle.entries()) {
          if (qty > 10) {
            const product = products.find((p) => p.id === productId);
            throw new Error(
              `Product ${product?.name ?? productId} exceeds maximum quantity of 10 per bundle selection. Requested: ${qty}.`
            );
          }
        }

        const tier = getWholesaleTier(totalBundleQty);
        if (!tier) {
          throw new Error(`Unable to determine wholesale tier for ${totalBundleQty} pieces.`);
        }

        bundleWholesalePrices.set(bundleId, tier.pricePerPiece);
      }

      const orderItems = items.map((item) => {
        const product = products.find((p) => p.id === item.id);
        if (!product) throw new Error("One of the items in your cart is no longer available.");

        const base =
          product.sale_price != null
            ? Number(product.sale_price)
            : Number(product.price) * (1 - Number(product.discount_percent ?? 0) / 100);

        let price: number;
        if (item.isBulk && item.bundleId) {
          price = bundleWholesalePrices.get(item.bundleId) ?? base;
        } else if (item.isBulk) {
          // Single bulk item without bundle - validate and price individually
          if (!isValidWholesaleQuantity(item.qty)) {
            throw new Error(
              `Invalid wholesale quantity for ${product.name}: ${item.qty} pieces. Must be at least ${WHOLESALE_BUNDLE_SIZE} and a multiple of ${WHOLESALE_BUNDLE_SIZE}, maximum ${MAX_WHOLESALE_QUANTITY} pieces (${MAX_BUNDLES_PER_ORDER} bundles).`
            );
          }
          
          // Validate bundle count for single bulk item
          const bundleCount = item.qty / WHOLESALE_BUNDLE_SIZE;
          if (!isValidBundleCount(bundleCount)) {
            throw new Error(
              `Invalid bundle count for ${product.name}: ${bundleCount} bundles. Maximum ${MAX_BUNDLES_PER_ORDER} bundles per order.`
            );
          }

          // Business rule: A single product selected inside a bundle cannot exceed quantity 10.
          if (item.qty > 10) {
            throw new Error(
              `Product ${product.name} exceeds maximum quantity of 10 per bundle selection. Requested: ${item.qty}.`
            );
          }
          const tier = getWholesaleTier(item.qty);
          price = tier?.pricePerPiece ?? base;
        } else {
          price = base;
        }

        const itemSubtotal = price * item.qty;
        subtotal += itemSubtotal;

        return {
          product_id: product.id,
          product_name: product.name,
          unit_price: price,
          quantity: item.qty,
          size: item.size || "",
          color: item.color || "",
          bundle_id: item.bundleId || null,
          subtotal: itemSubtotal,
        };
      });

      const total = subtotal;
      const reference = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      // 3. Build order and items JSON for the atomic RPC
      const shippingAddress =
        customer.address || customer.city || customer.state
          ? {
              address: customer.address ?? null,
              city: customer.city ?? null,
              state: customer.state ?? null,
              country: customer.country ?? null,
              postal_code: customer.postalCode ?? null,
              delivery_instructions: customer.deliveryInstructions ?? null,
            }
          : null;

      // Calculate payment amount in payment currency major units
      const paymentAmountMajor = convertToPaymentCurrency(total, paymentCurrency);

      const itemsData = orderItems.map((item) => ({
        product_id: item.product_id,
        product_name: item.product_name,
        unit_price: item.unit_price,
        quantity: item.quantity,
        subtotal: item.subtotal,
        size: item.size,
        color: item.color,
        bundle_id: item.bundle_id,
      }));

      // Build canonical payload for fingerprint (deterministic, sorted keys)
      const fingerprintPayload = JSON.stringify({
        user_id: authenticatedUser.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone && customer.phone.trim() !== "" ? customer.phone : null,
        shipping_address: shippingAddress,
        subtotal: subtotal,
        total: total,
        currency: currency.toUpperCase(),
        payment_currency: paymentCurrency,
        payment_amount: paymentAmountMajor,
        items: itemsData.map((item) => ({
          product_id: item.product_id,
          unit_price: item.unit_price,
          quantity: item.quantity,
          size: item.size,
          color: item.color,
          bundle_id: item.bundle_id,
        })),
      });

      // Generate fingerprint if not provided by client
      const fingerprint = checkoutRequestFingerprint || createHash("sha256").update(fingerprintPayload).digest("hex");

      // Use provided attempt key or generate one (should be provided by client for retries)
      const attemptKey = checkoutAttemptKey || `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      const orderData = {
        user_id: authenticatedUser.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone && customer.phone.trim() !== "" ? customer.phone : null,
        shipping_address: shippingAddress,
        subtotal: subtotal,
        discount: 0,
        shipping: 0,
        vat_amount: 0,
        vat_rate: 0,
        taxable_subtotal: 0,
        total: total,
        paystack_reference: reference,
        currency: currency.toUpperCase(), // display currency
        payment_currency: paymentCurrency, // actual payment currency
        payment_amount: paymentAmountMajor, // payment amount in major units
        notes: items
          .map((i) => {
            const p = products.find((p) => p.id === i.id);
            const parts = [p?.name];
            if (i.isBulk) parts.push("(Bulk)");
            else parts.push(`(Size ${i.size})`);
            if (i.color) parts.push(`(Color ${i.color})`);
            parts.push(`x ${i.qty}`);
            return parts.join(" ");
          })
          .join(", "),
        checkout_attempt_key: attemptKey,
        checkout_request_fingerprint: fingerprint,
      };

      // 4. Call the atomic RPC: creates order, order_items, reservations, and decrements stock in one transaction
      const { data: rpcResult, error: rpcError } = await getSupabaseAdmin().rpc(
        "create_order_with_stock_reservations",
        {
          p_order: orderData,
          p_items: itemsData,
        },
      );

      if (rpcError) {
        console.error("create_order_with_stock_reservations failed:", {
          code: rpcError.code,
          message: rpcError.message,
          details: rpcError.details,
          hint: rpcError.hint,
        });
        // The RPC rolls back automatically on error (insufficient stock, etc.)
        if (rpcError.message.includes("enough stock") || rpcError.message.includes("Insufficient")) {
          throw new Error(
            "One or more items no longer have enough stock. Please refresh your cart and try again.",
          );
        }
        throw new Error(
          `We could not save your order (${rpcError.code || "db_error"}). Please try again.`,
        );
      }

      if (!rpcResult) {
        throw new Error("Failed to create order: No data returned from RPC");
      }

      const order = rpcResult;

      void newOrderNotification({ data: { orderId: order.id } }).catch((err: unknown) =>
        console.error("Admin notification failed:", (err as Error)?.message),
      );

      // 5. After the order is fully created, emit idempotent stock alerts for
      // any product that just crossed the low/out threshold.
      void emitStockAlerts(
        supabaseAdmin,
        items.map((i) => i.id),
      ).catch((err: unknown) => console.error("Stock alert emission failed:", (err as Error)?.message));

      // Bank transfer only: no payment provider. Return the created order
      // immediately. Bank details are rendered by /payment-instructions.
      return {
        success: true as const,
        orderId: order.id,
        orderNumber: order.order_number,
        total: Number(order.total),
        paymentCurrency,
        paymentMethod: "bank_transfer",
        message: "Order created. Please complete payment via bank transfer.",
      };
    } catch (handlerError: unknown) {
      console.error("[createOrderServerFn] Handler error:", handlerError);
      throw new Error((handlerError as Error).message || "Checkout failed. Please try again.");
    }
  });

export const verifyBankTransferPayment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    // Admin-only check
    const headers = getRequestHeaders();
    const authHeader = headers.get("authorization");
    const cookieHeader = headers.get("cookie");
const authUrl = process.env.SUPABASE_URL;
const authKey = process.env.SUPABASE_ANON_KEY;

    let isAdmin = false;
    if ((authHeader || cookieHeader) && authUrl && authKey) {
      const userClient = createClient<Database>(authUrl, authKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
          headers: {
            ...(authHeader ? { Authorization: authHeader } : {}),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
          },
        },
      });
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      const {
        data: { user },
      } = token ? await userClient.auth.getUser(token) : await userClient.auth.getUser();
      if (user) {
        const { data: roleData } = await getSupabaseAdmin()
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        isAdmin = !!roleData;
      }
    }

    if (!isAdmin) {
      return { status: "error" as const, message: "Unauthorized: Admin access required." };
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data: order, error } = await getSupabaseAdmin()
      .from("orders")
      .select("id, order_number, total, payment_status, payment_method")
      .eq("id", data.orderId)
      .single();

    if (error || !order) {
      return { status: "error" as const, message: "Order not found." };
    }

    if (order.payment_method !== "bank_transfer") {
      return { status: "error" as const, message: "This order is not a bank transfer order." };
    }

    if (order.payment_status === "paid") {
      return {
        status: "paid" as const,
        orderNumber: order.order_number,
        total: Number(order.total),
        message: "Order is already marked as paid.",
      };
    }

    const { data: updated, error: updateError } = await getSupabaseAdmin()
      .from("orders")
      .update({ payment_status: "paid" })
      .eq("id", order.id)
      .eq("payment_status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError) {
      return { status: "error" as const, message: "Failed to verify payment." };
    }

    if (!updated) {
      return {
        status: "paid" as const,
        orderNumber: order.order_number,
        total: Number(order.total),
        message: "Order is already marked as paid.",
      };
    }

    void deliverPaymentReceipt(order.id).catch((err: unknown) =>
      console.error("Customer receipt email failed:", (err as Error)?.message),
    );

    return {
      status: "paid" as const,
      orderNumber: order.order_number,
      total: Number(order.total),
      message: "Payment verified successfully.",
    };
  });

/**
 * Server function: Send a bank transfer payment receipt email to the customer.
 * Only callable by admins after successful payment verification.
 */
async function deliverPaymentReceipt(
  orderId: string,
): Promise<{ sent: boolean; message?: string }> {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select(
      "id, order_number, total, customer_email, customer_name, payment_status, payment_method",
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return { sent: false, message: "Order not found." };
  }

  if (order.payment_status !== "paid") {
    return { sent: false, message: "Order is not paid." };
  }
  if (order.payment_method !== "bank_transfer") {
    return { sent: false, message: "Order is not a bank transfer order." };
  }

  if (!order.customer_email) {
    return { sent: false, message: "Order has no customer email." };
  }

  const confirmationDate = new Date().toLocaleDateString("en-NG");
  const formattedAmount = Number(order.total).toLocaleString("en-NG");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
    <tr><td style="padding:24px 24px 8px;">
      <p style="margin:0;font-size:11px;letter-spacing:2px;color:#8b5cf6;text-transform:uppercase;font-weight:700;">Payment Confirmation</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#111;">Payment Confirmed</h1>
      <p style="margin:6px 0 0;color:#666;font-size:13px;">Order #${esc(order.order_number)} · ${confirmationDate}</p>
    </td></tr>
    <tr><td style="padding:16px 24px 24px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr><td style="padding:6px 0;color:#666;">Order Number</td><td style="padding:6px 0;text-align:right;">${esc(order.order_number)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Amount Paid</td><td style="padding:6px 0;text-align:right;">₦${formattedAmount}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Payment Method</td><td style="padding:6px 0;text-align:right;">Bank Transfer (Moniepoint)</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Payment Status</td><td style="padding:6px 0;text-align:right;"><b style="color:#10b981;">Paid</b></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Confirmation Date</td><td style="padding:6px 0;text-align:right;">${confirmationDate}</td></tr>
      </table>
      <p style="margin-top:24px;font-size:14px;color:#666;">
        Thank you for shopping with Supplier Affordable. Your payment has been verified.
        Keep this email as proof of payment.
      </p>
      <p style="margin-top:12px;font-size:14px;color:#666;">
        Questions? Email ${esc(CONTACT.email)}.
      </p>
    </td></tr>
  </table>
</body></html>`;

  // Best-effort receipt tracking using payment_receipts.
  let receiptRowId: string | null = null;
  let trackingAvailable = true;
  try {
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from("payment_receipts")
      .insert({ order_id: orderId, status: "pending" })
      .select("id")
      .maybeSingle();

    if (insertError) {
      if (insertError.code === "23505") {
        const { data: existing } = await supabaseAdmin
          .from("payment_receipts")
          .select("id, status")
          .eq("order_id", orderId)
          .maybeSingle();
        if (existing?.status === "sent") {
          return { sent: true, message: "Receipt already sent." };
        }
        receiptRowId = existing?.id ?? null;
      } else {
        trackingAvailable = false;
      }
    } else {
      receiptRowId = inserted?.id ?? null;
    }

    if (trackingAvailable && receiptRowId) {
      await supabaseAdmin
        .from("payment_receipts")
        .update({ status: "sending", last_error: null, updated_at: new Date().toISOString() })
        .eq("id", receiptRowId);
    }
  } catch {
    trackingAvailable = false;
  }

  let emailSent = false;
  let emailError: string | null = null;
  try {
    const result = await sendEmail({
      to: order.customer_email,
      subject: `Order #${order.order_number} — Payment Confirmed`,
      html,
      text: `Order #${order.order_number} — Payment confirmed. Amount: ₦${formattedAmount}. Method: Bank Transfer (Moniepoint). Status: Paid.`,
    });
    emailSent = result.success;
    if (!result.success) {
      emailError = result.error || "Email delivery failed.";
      console.error("[NOTIFICATION] Bank transfer receipt email failed:", emailError);
    }
  } catch (err: unknown) {
    emailError = (err as Error)?.message || "Email delivery failed.";
    console.error("[NOTIFICATION] Bank transfer receipt email failed:", (err as Error)?.message);
  }

  if (trackingAvailable && receiptRowId) {
    try {
      await supabaseAdmin
        .from("payment_receipts")
        .update({
          status: emailSent ? "sent" : "failed",
          last_error: emailSent ? null : emailError,
          updated_at: new Date().toISOString(),
        })
        .eq("id", receiptRowId);
    } catch {
      // Tracking is best-effort; email result still stands.
    }
  }

  return { sent: emailSent, message: emailError || undefined };
}

export const sendBankTransferReceipt = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireAdminUser();
    } catch (e: unknown) {
      return { status: "error" as const, message: (e as Error)?.message || "Unauthorized." };
    }

    try {
      const { data: existing } = await getSupabaseAdmin()
        .from("payment_receipts")
        .select("status")
        .eq("order_id", data.orderId)
        .maybeSingle();
      if (existing?.status === "sent") {
        return { status: "sent" as const, sent: true, message: "Receipt already sent." };
      }
    } catch {
      // Tracking table may be unavailable; continue with best-effort delivery.
    }

    const result = await deliverPaymentReceipt(data.orderId);
    if (!result.sent) {
      return { status: "error" as const, message: result.message || "Receipt email was not sent." };
    }
    return { status: "sent" as const, sent: true, message: "Receipt sent." };
  });

export const retryPaymentReceipt = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    try {
      await requireAdminUser();
    } catch (e: unknown) {
      return { status: "error" as const, message: (e as Error)?.message || "Unauthorized." };
    }

    const result = await deliverPaymentReceipt(data.orderId);
    if (!result.sent) {
      return { status: "error" as const, message: result.message || "Receipt retry failed." };
    }
    return { status: "sent" as const, sent: true, message: "Receipt sent." };
  });

export const confirmPaystackPayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      reference: z
        .string()
        .min(3)
        .max(80)
        .regex(/^[A-Za-z0-9_.-]+$/),
    }),
  )
  .handler(async ({ data }) => {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      return { status: "error" as const, message: "Payment verification is not configured." };
    }

    const supabaseAdmin = getSupabaseAdmin();

    try {
      const res = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } },
      );
      const json: unknown = await res.json().catch(() => ({}));
      const txn = (json as { data?: { status?: string; currency?: string; amount?: number } })?.data;

      const { data: order } = await getSupabaseAdmin()
        .from("orders")
        .select(
          "id, order_number, total, payment_status, currency, payment_currency, payment_amount",
        )
        .eq("paystack_reference", data.reference)
        .maybeSingle();

      if (!order) {
        return { status: "error" as const, message: "We could not find this order." };
      }
      if (order.payment_status === "paid") {
        return {
          status: "paid" as const,
          orderNumber: order.order_number,
          total: Number(order.total),
          paymentCurrency: getOrderPaymentCurrency(order),
        };
      }
      if (!res.ok || txn?.status !== "success") {
        return { status: "pending" as const, message: "Payment not confirmed yet." };
      }
      // Verify the transaction currency matches the order's payment currency
      const orderPaymentCurrency = getOrderPaymentCurrency(order);
      if (txn.currency !== orderPaymentCurrency) {
        return {
          status: "error" as const,
          message: `Payment currency mismatch. Expected ${orderPaymentCurrency}, got ${txn.currency}.`,
        };
      }
      // Verify the transaction amount matches the expected Paystack subunit amount
      const expectedPaystackAmount = getExpectedPaystackAmount(order);
      if (Math.abs(Number(txn.amount ?? 0) - expectedPaystackAmount) > 100) {
        return { status: "error" as const, message: "Payment amount does not match this order." };
      }

      // Idempotent: only act when the order is not already paid.
      if (order.payment_status !== ("paid" as unknown)) {
        await getSupabaseAdmin()
          .from("orders")
          .update({ payment_status: "paid" })
          .eq("id", order.id);

        void sendCustomerOrderEmail(order.id).catch((err: unknown) =>
          console.error("Customer receipt email failed:", (err as Error)?.message),
        );

        // Re-evaluate stock alerts now that the order is paid and stock has
        // been reserved — a product may have just crossed the low/out line.
        const { data: paidItems } = await getSupabaseAdmin()
          .from("order_items")
          .select("product_id")
          .eq("order_id", order.id);

        void emitStockAlerts(
          getSupabaseAdmin(),
            (paidItems ?? []).map((i: { product_id: string | null }) => i.product_id).filter((id): id is string => Boolean(id)),
        ).catch((err: unknown) => console.error("Stock alert emission failed:", (err as Error)?.message));
      }

      return {
        status: "paid" as const,
        orderNumber: order.order_number,
        total: Number(order.total),
        paymentCurrency: orderPaymentCurrency,
      };
    } catch (err: unknown) {
      console.error("confirmPaystackPayment failed:", (err as Error)?.message);
      return { status: "error" as const, message: "Could not verify the payment right now." };
    }
  });

export const sendOrderReceipt = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { snapshot, paystackRef } = data;

    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error("PAYSTACK_SECRET_KEY is not configured");
      return {
        status: "error" as const,
        message: "Payment verification is not configured. Please contact support.",
      };
    }

    try {
      const verifyRes = await fetch(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackRef)}`,
        { headers: { Authorization: `Bearer ${paystackSecret}` } },
      );
      const verifyJson: unknown = await verifyRes.json().catch(() => ({}));
      const txn = (verifyJson as { data?: { status?: string; amount?: number } })?.data;
      if (!verifyRes.ok || txn?.status !== "success") {
        console.warn("Paystack verification failed", { paystackRef, status: txn?.status });
        return {
          status: "error" as const,
          message: "We could not verify this payment. Please contact support with your reference.",
        };
      }

      // Paystack amounts are in kobo. Allow a small rounding tolerance.
      const expectedKobo = Math.round(snapshot.total * 100);
      const paidKobo = Number(txn.amount ?? 0);
      if (Math.abs(paidKobo - expectedKobo) > 100) {
        console.warn("Paystack amount mismatch", { expectedKobo, paidKobo });
        return {
          status: "error" as const,
          message: "Payment amount does not match this order. Please contact support.",
        };
      }

      const subject = `Order #${snapshot.orderRef} — SupplierAffordable`;

      // Build (and log server-side only) the receipt HTML. Email delivery is
      // currently disabled — do NOT include these payloads in the response.
      const customerHtml = buildEmailHtml({ snapshot, paystackRef, audience: "customer" });
      const businessHtml = buildEmailHtml({ snapshot, paystackRef, audience: "business" });
      void customerHtml;
      void businessHtml;

      console.log("📧 Verified order", {
        ref: snapshot.orderRef,
        paystackRef,
        customer: snapshot.customer.email,
        business: CONTACT.email,
        subject,
      });

      return {
        status: "sent" as const,
        message: "Order verified and processed successfully.",
      };
    } catch (err: unknown) {
      console.error("sendOrderReceipt failed:", err);
      return {
        status: "error" as const,
        message: "Order processing failed. Please try again.",
      };
    }
  });

/**
 * Server function to fetch all customers for admin panel.
 * Uses admin client to bypass RLS and return all profiles with order stats.
 */
export const getAdminCustomersServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => {
    try {
      await requireAdminUser();
    } catch (e: unknown) {
      throw new Error((e as Error)?.message || "Unauthorized: Admin access required.");
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Fetch all profiles
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from("profiles")
      .select("id, user_id, display_name, phone, created_at")
      .order("created_at", { ascending: false });

    if (profilesError) {
      console.error("Failed to fetch profiles:", profilesError);
      throw new Error("Failed to load customers");
    }

    // Fetch all orders for stats
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from("orders")
      .select("user_id, total, customer_email, customer_name, customer_phone, created_at");

    if (ordersError) {
      console.error("Failed to fetch orders:", ordersError);
      throw new Error("Failed to load order stats");
    }

    // Map profiles by user_id
    const profileMap = new Map<string, any>();
     (profiles ?? []).forEach((p: any) => {
      if (p.user_id) profileMap.set(p.user_id, p);
    });

    // Aggregate order stats by user_id and customer_email
    const orderMap = new Map<
      string,
      { count: number; total: number; email: string; name: string; phone: string }
    >();
    (orders ?? []).forEach((o) => {
      const key = o.user_id ?? o.customer_email;
      if (!key) return;
      const cur = orderMap.get(key) ?? {
        count: 0,
        total: 0,
        email: o.customer_email ?? "",
        name: o.customer_name ?? "",
        phone: o.customer_phone ?? "",
      };
      cur.count += 1;
      cur.total += Number(o.total || 0);
      if (!cur.email && o.customer_email) cur.email = o.customer_email;
      if (!cur.name && o.customer_name) cur.name = o.customer_name;
      if (!cur.phone && o.customer_phone) cur.phone = o.customer_phone;
      orderMap.set(key, cur);
    });

    const allProfiles = Array.from(profileMap.values());
    return allProfiles.map((p) => {
      const stats = orderMap.get(p.user_id) ?? {
        count: 0,
        total: 0,
        email: "",
        name: "",
        phone: "",
      };
      const email = stats.email || "";
      return {
        id: p.id,
        user_id: p.user_id,
        display_name: p.display_name,
        email,
        phone: p.phone || stats.phone,
        avatar_url: null,
        created_at: p.created_at,
        stats: { count: stats.count, total: stats.total },
      };
    });
  });

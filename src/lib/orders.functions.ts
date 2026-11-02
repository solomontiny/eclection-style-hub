import { createServerFn } from "@tanstack/react-start";
import { sendLovableEmail } from "@lovable.dev/email-js";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { CONTACT } from "./contact";
import { getSupabaseAdmin, getEnvVar } from "./supabase-admin.server";
import { newOrderNotification, sendCustomerOrderEmail } from "./notifications";
import { reserveStock, restoreStock, getOrderStockReservations, emitStockAlerts } from "./stock";
import {
  getPaymentCurrency,
  PAYSTACK_SUPPORTED_CURRENCIES,
  calculatePaystackAmount,
  getExpectedPaystackAmount,
  getOrderPaymentCurrency,
  convertToPaymentCurrency,
} from "./currency";

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

/** Wholesale price per piece (1 bundle = 10 pieces = ₦60,000). */
const BULK_UNIT_PRICE = 6000;

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
    }),
  )
  .handler(async ({ data }) => {
    const { items, customer, callbackUrl, currency } = data;
    let supabaseAdmin;
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
      .select("bank_transfer_enabled")
      .eq("id", "default")
      .maybeSingle();

    const serverUrl = getEnvVar("SUPABASE_URL") || "";
    console.log("[createOrderServerFn] shop_settings diagnostic:", {
      hasError: !!settingsError,
      errorCode: settingsError?.code ?? null,
      errorMessage: settingsError?.message ?? null,
      recordFound: !!shopSettings,
      bankTransferEnabled: shopSettings?.bank_transfer_enabled ?? null,
      isExpectedProject: serverUrl.includes("qwwpaxljefedekeysuye"),
    });

    if (settingsError || !shopSettings?.bank_transfer_enabled) {
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

      // 1b. Reject out-of-stock items before creating the order.
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
      const orderItems = items.map((item) => {
        const product = products.find((p) => p.id === item.id);
        if (!product) throw new Error("One of the items in your cart is no longer available.");

        // Bulk/wholesale pieces are a fixed ₦6,000 per piece.
        const base =
          product.sale_price != null
            ? Number(product.sale_price)
            : Number(product.price) * (1 - Number(product.discount_percent ?? 0) / 100);
        const price = item.isBulk ? BULK_UNIT_PRICE : base;
        const itemSubtotal = price * item.qty;
        subtotal += itemSubtotal;

        return {
          product_id: product.id,
          product_name: product.name,
          unit_price: price,
          quantity: item.qty,
          size: item.size || "",
          color: item.color || "",
          bundle_id: item.bundleId || null, // Persist bundleId
          subtotal: itemSubtotal,
        };
      });

      const total = subtotal;
      const reference = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      // 2b. Reserve stock atomically. A row-level UPDATE ... WHERE stock >= qty
      // prevents concurrent checkouts from overselling.
      const reservation = await reserveStock(
        supabaseAdmin,
        items.map((i) => ({ productId: i.id, qty: i.qty })),
      );
      if (!reservation.ok) {
        throw new Error(
          "One or more items no longer have enough stock. Please refresh your cart and try again.",
        );
      }

      // 3. Insert order
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

      const orderData = {
        user_id: authenticatedUser.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone && customer.phone.trim() !== "" ? customer.phone : null,
        shipping_address: shippingAddress,
        subtotal: subtotal,
        total,
        payment_status: "pending" as const,
        payment_method: "bank_transfer" as Database["public"]["Enums"]["payment_method"],
        paystack_reference: reference,
        currency: currency.toUpperCase(), // display currency
        payment_currency: paymentCurrency, // actual Paystack payment currency
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
      };

      const { data: order, error: orderError } = await getSupabaseAdmin()
        .from("orders")
        .insert(orderData)
        .select("id, order_number, total, payment_status")
        .single();

      if (orderError) {
        console.error("Failed to create order in Supabase:", {
          code: orderError.code,
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
        });
        // Roll back the stock reservation — the order was never saved.
        void restoreStock(
          supabaseAdmin,
          items.map((i) => ({ productId: i.id, qty: i.qty })),
        ).catch((err: unknown) =>
          console.error("Stock restore after order insert failed:", (err as Error)?.message),
        );
        throw new Error(
          `We could not save your order (${orderError.code || "db_error"}). Please try again.`,
        );
      }
      if (!order) {
        // Roll back the stock reservation — the order was never saved.
        void restoreStock(
          supabaseAdmin,
          items.map((i) => ({ productId: i.id, qty: i.qty })),
        ).catch((err: unknown) =>
          console.error("Stock restore after order insert failed:", (err as Error)?.message),
        );
        throw new Error("Failed to create order: No data returned");
      }

      // 4. Insert items
      const { error: itemsError } = await getSupabaseAdmin()
        .from("order_items")
        .insert(orderItems.map((item) => ({ ...item, order_id: order.id })));

      if (itemsError) {
        console.error("Failed to create order items:", {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code,
        });
        // Roll back the stock reservation — the order is incomplete.
        void restoreStock(
          supabaseAdmin,
          items.map((i) => ({ productId: i.id, qty: i.qty })),
        ).catch((err: unknown) =>
          console.error("Stock restore after order items failed:", (err as Error)?.message),
        );
        throw new Error("Failed to create order items. Please contact support.");
      }

      void newOrderNotification({ data: { orderId: order.id } }).catch((err: unknown) =>
        console.error("Admin notification failed:", (err as Error)?.message),
      );

      // 4b. After the order is fully created, emit idempotent stock alerts for
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
    const authUrl = getEnvVar("SUPABASE_URL");
    const authKey = getEnvVar("SUPABASE_ANON_KEY");

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
    const apiKey = process.env.LOVABLE_EMAIL_API_KEY;
    if (apiKey) {
      await sendLovableEmail(
        {
          to: order.customer_email,
          from: CONTACT.email,
          subject: `Order #${order.order_number} — Payment Confirmed`,
          html,
          text: `Order #${order.order_number} — Payment confirmed. Amount: ₦${formattedAmount}. Method: Bank Transfer (Moniepoint). Status: Paid.`,
        },
        { apiKey },
      );
      emailSent = true;
    } else {
      emailError = "LOVABLE_EMAIL_API_KEY is not configured.";
      console.log("[NOTIFICATION] Bank transfer receipt email (no API key):", {
        to: order.customer_email,
        subject: `Order #${order.order_number}`,
        orderId: order.id,
      });
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

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CONTACT } from "./contact";
import { getSupabaseAdmin } from "./supabase-admin.server";
import { newOrderNotification, sendCustomerOrderEmail } from "./notifications";

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
  paystackRef: z.string().min(3).max(80).regex(/^[A-Za-z0-9_-]+$/),
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
  const firstName = (s.customer.name.split(" ")[0] || "there");
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
        ${audience === "customer"
          ? `Questions? Reply to this email or write to ${esc(CONTACT.email)}.`
          : `Reply to the customer at ${esc(s.customer.email)} or call ${esc(s.customer.phone || "—")}.`}
      </p>
    </td></tr>

  </table>
</body></html>`;
}

export const getTaxSettings = createServerFn({ method: "GET" })
  .handler(async () => {
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
      vatEnabled: taxPercent > 0 
    };
  });
export const createOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    items: z.array(z.object({
      id: z.string(),
      size: z.string(),
      color: z.string().optional(),
      qty: z.number().int().min(1),
      isBulk: z.boolean().optional(),
      bundleId: z.string().optional(),
    })),
    customer: z.object({ name: z.string(), email: z.string().email(), phone: z.string().optional() }),
    callbackUrl: z.string().url().optional(),
  }))
  .handler(async ({ data }) => {
    const { items, customer, callbackUrl } = data;
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch products
    const { data: products, error: productError } = await getSupabaseAdmin()
      .from("products")
      .select("id, name, price, sale_price, discount_percent")
      .in("id", items.map(i => i.id));

    if (productError || !products) {
      console.error("Failed to fetch products:", productError?.code, productError?.message, productError?.details);
      throw new Error("We could not load your items. Please refresh your cart and try again.");
    }

    // 2. Calculate totals (authoritative, server-side, no VAT)
    let subtotal = 0;
    const orderItems = items.map(item => {
      const product = products.find((p) => p.id === item.id);
      if (!product) throw new Error("One of the items in your cart is no longer available.");

      // Bulk/wholesale pieces are a fixed ₦6,000 per piece.
      const base = product.sale_price != null
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
        size: item.size || '',
        color: item.color || '',
        bundle_id: item.bundleId || null, // Persist bundleId
        subtotal: itemSubtotal
      };
    });

    const total = subtotal;
    const reference = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // 3. Insert order
    const orderData = {
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone && customer.phone.trim() !== "" ? customer.phone : null,
      subtotal: subtotal,
      total,
      payment_status: 'pending' as const,
      paystack_reference: reference,
      notes: items.map(i => {
        const p = products.find((p) => p.id === i.id);
        const parts = [p?.name];
        if (i.isBulk) parts.push("(Bulk)");
        else parts.push(`(Size ${i.size})`);
        if (i.color) parts.push(`(Color ${i.color})`);
        parts.push(`x ${i.qty}`);
        return parts.join(" ");
      }).join(", "),
    };

    const { data: order, error: orderError } = await getSupabaseAdmin()
      .from("orders")
      .insert(orderData)
      .select("id")
      .single();

    if (orderError) {
      console.error("Failed to create order in Supabase:", {
        code: orderError.code,
        message: orderError.message,
        details: orderError.details,
        hint: orderError.hint
      });
      throw new Error(`We could not save your order (${orderError.code || "db_error"}). Please try again.`);
    }
    if (!order) {
      throw new Error("Failed to create order: No data returned");
    }

    // 4. Insert items
    const { error: itemsError } = await getSupabaseAdmin()
      .from("order_items")
      .insert(orderItems.map(item => ({ ...item, order_id: order.id })));

    if (itemsError) {
      console.error("Failed to create order items:", {
        message: itemsError.message,
        details: itemsError.details,
        hint: itemsError.hint,
        code: itemsError.code
      });
      throw new Error("Failed to create order items. Please contact support.");
    }

    void newOrderNotification({ data: { orderId: order.id } }).catch((err: any) =>
      console.error("Admin notification failed:", err?.message)
    );

    // 5. Initialize Paystack transaction (server-side, secret never leaves the server)
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    if (!paystackSecret) {
      console.error("PAYSTACK_SECRET_KEY is not configured");
      return {
        success: false as const,
        orderId: order.id,
        reference,
        total,
        message: "Payment is not configured yet. Please contact support.",
      };
    }

    try {
      const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: customer.email,
          amount: Math.round(total * 100),
          currency: "NGN",
          reference,
          ...(callbackUrl ? { callback_url: callbackUrl } : {}),
          metadata: { order_id: order.id, customer_name: customer.name },
        }),
      });
      const initJson: any = await initRes.json().catch(() => ({}));

      if (!initRes.ok || !initJson?.status || !initJson?.data?.authorization_url) {
        console.error("Paystack initialize failed", initRes.status, initJson);
        return {
          success: false as const,
          orderId: order.id,
          reference,
          total,
          message: initJson?.message || "Could not start the payment. Please try again.",
        };
      }

      return {
        success: true as const,
        orderId: order.id,
        reference,
        total,
        authorization_url: initJson.data.authorization_url as string,
        access_code: initJson.data.access_code as string,
      };
    } catch (err: any) {
      console.error("Paystack initialize error:", err?.message);
      return {
        success: false as const,
        orderId: order.id,
        reference,
        total,
        message: "Could not reach the payment provider. Please try again.",
      };
    }
  });

export const sendDeliveryNotification = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    const { data: order } = await getSupabaseAdmin()
      .from("orders")
      .select("id, order_number, total, payment_status")
      .eq("id", data.orderId)
      .single();

    if (!order) throw new Error("Order not found");

    await getSupabaseAdmin()
      .from("orders")
      .update({ payment_status: 'pending' })
      .eq("id", order.id);

    return { status: "no-change" };
  });
export const confirmPaystackPayment = createServerFn({ method: "POST" })
  .inputValidator(z.object({ reference: z.string().min(3).max(80).regex(/^[A-Za-z0-9_.-]+$/) }))
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
      const json: any = await res.json().catch(() => ({}));
      const txn = json?.data;

      const { data: order } = await getSupabaseAdmin()
        .from("orders")
        .select("id, order_number, total, payment_status")
        .eq("paystack_reference", data.reference)
        .maybeSingle();

      if (!order) {
        return { status: "error" as const, message: "We could not find this order." };
      }
      if (order.payment_status === "paid") {
        return { status: "paid" as const, orderNumber: order.order_number, total: Number(order.total) };
      }
      if (!res.ok || txn?.status !== "success") {
        return { status: "pending" as const, message: "Payment not confirmed yet." };
      }
      if (Math.abs(Number(txn.amount ?? 0) - Math.round(Number(order.total) * 100)) > 100) {
        return { status: "error" as const, message: "Payment amount does not match this order." };
      }

      await getSupabaseAdmin()
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", order.id);

      void sendCustomerOrderEmail(order.id).catch((err: any) =>
        console.error("Customer receipt email failed:", err?.message)
      );

      return { status: "paid" as const, orderNumber: order.order_number, total: Number(order.total) };
    } catch (err: any) {
      console.error("confirmPaystackPayment failed:", err?.message);
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
      const verifyJson: any = await verifyRes.json().catch(() => ({}));
      const txn = verifyJson?.data;
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
    } catch (err: any) {
      console.error("sendOrderReceipt failed:", err);
      return {
        status: "error" as const,
        message: "Order processing failed. Please try again.",
      };
    }
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "./supabase-admin.server";
import { CONTACT } from "./contact";
import { sendLovableEmail } from "@lovable.dev/email-js";

function naira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

function esc(s: string | undefined | null) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

type ShippingAddress = {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  delivery_instructions?: string | null;
};

/**
 * Produce a compact, human-readable delivery location string from an
 * order's `shipping_address` JSONB column. Never exposes anything beyond
 * what the customer typed at checkout.
 */
function formatOrderLocation(order: {
  shipping_address?: unknown;
  customer_phone?: string | null;
}): string {
  const addr = order.shipping_address as ShippingAddress | null;
  if (!addr || typeof addr !== "object") return "";
  const parts = [addr.city, addr.state, addr.country]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  return parts.join(", ") || addr.address || "";
}

export const newOrderNotification = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    orderId: z.string().uuid(),
  }))
  .handler(async ({ data }) => {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, total, status, customer_name, customer_email, customer_phone, created_at")
      .eq("id", data.orderId)
      .single();

    if (orderError || !order) return { sent: false };

    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_name, quantity, unit_price, size, color")
      .eq("order_id", order.id);

    const itemRows = (items || [])
      .map((it: any) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:14px;">
            ${esc(it.product_name)}<br>
            <span style="color:#888;font-size:12px;">Size ${esc(it.size)}${it.color ? ` · Color ${esc(it.color)}` : ""} · Qty ${esc(it.quantity)}</span>
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">${naira(Number(it.unit_price) * it.quantity)}</td>
        </tr>`)
      .join("");

    const dateStr = new Date(order.created_at).toLocaleString("en-NG");
    const subject = `New order #${order.order_number} — SupplierAffordable`;

    const locationLine = formatOrderLocation(order);

    const adminHtml = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
    <tr><td style="padding:24px 24px 8px;">
      <p style="margin:0;font-size:11px;letter-spacing:2px;color:#c44569;text-transform:uppercase;font-weight:700;">New order alert</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#111;">New order received</h1>
      <p style="margin:6px 0 0;color:#666;font-size:13px;">Order #${esc(order.order_number)} · ${esc(dateStr)}</p>
    </td></tr>
    <tr><td style="padding:16px 24px 0;">
      <h2 style="font-size:13px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:14px 0 6px;">Items</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemRows}</table>
    </td></tr>
    <tr><td style="padding:8px 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
        <tr><td style="padding:6px 0;color:#666;">Total</td><td style="padding:6px 0;text-align:right;"><b>${naira(Number(order.total))}</b></td></tr>
        ${locationLine ? `<tr><td style="padding:6px 0;color:#666;">Delivery location</td><td style="padding:6px 0;text-align:right;">${esc(locationLine)}</td></tr>` : ""}
      </table>
    </td></tr>
    <tr><td style="padding:16px 24px 24px;">
      <h2 style="font-size:13px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:14px 0 6px;">Customer</h2>
      <p style="margin:0;font-size:14px;line-height:1.6;">
        <b>${esc(order.customer_name)}</b><br>
        ${esc(order.customer_email)}${order.customer_phone ? `<br>${esc(order.customer_phone)}` : ""}
        ${locationLine ? `<br><span style="color:#888;font-size:12px;">📍 ${esc(locationLine)}</span>` : ""}
      </p>
    </td></tr>
    <tr><td style="padding:0 24px 24px;">
      <a href="${process.env.ADMIN_BASE_URL || "https://supplieraffordable.com"}/admin/orders" style="display:inline-block;padding:12px 24px;background:#8b5cf6;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">View in dashboard</a>
    </td></tr>
  </table>
</body></html>`;

    let emailSent = false;

    try {
      const apiKey = process.env.LOVABLE_EMAIL_API_KEY;
      if (apiKey) {
        await sendLovableEmail(
          {
            to: CONTACT.email,
            from: CONTACT.email,
            subject,
            html: adminHtml,
            text: `New order #${order.order_number} — ${naira(Number(order.total))}. View: ${process.env.ADMIN_BASE_URL || "https://supplieraffordable.com"}/admin/orders`,
          },
          { apiKey }
        );
        emailSent = true;
      } else {
        console.log("[NOTIFICATION] Admin email (no API key configured):", {
          to: CONTACT.email,
          subject,
          orderId: order.id,
        });
      }
    } catch (err: any) {
      console.error("[NOTIFICATION] Failed to send admin email:", err?.message);
    }

    await supabaseAdmin.from("notifications").insert({
      type: "new_order",
      title: `New order #${order.order_number}`,
      message: `${order.customer_name} · ${naira(Number(order.total))}${formatOrderLocation(order) ? ` · ${formatOrderLocation(order)}` : ""}`,
      order_id: order.id,
      sent_email: emailSent,
    });

    return { sent: emailSent, orderId: order.id };
  });

export async function sendCustomerOrderEmail(orderId: string) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("order_number, total, customer_name, customer_email, status, created_at")
    .eq("id", orderId)
    .single();

  if (orderError || !order || !order.customer_email) return { sent: false };

  const { data: items } = await supabaseAdmin
    .from("order_items")
    .select("product_name, quantity, unit_price, size, color")
    .eq("order_id", orderId);

  const itemRows = (items || [])
    .map((it: any) => `
        <tr>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:14px;">
            ${esc(it.product_name)}<br>
            <span style="color:#888;font-size:12px;">Size ${esc(it.size)}${it.color ? ` · Color ${esc(it.color)}` : ""} · Qty ${esc(it.quantity)}</span>
          </td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:14px;text-align:right;">${naira(Number(it.unit_price) * it.quantity)}</td>
        </tr>`)
    .join("");

  const dateStr = new Date(order.created_at).toLocaleString("en-NG");
  const firstName = order.customer_name.split(" ")[0] || "there";
  const subject = `Order #${order.order_number} confirmation — SupplierAffordable`;

  const customerHtml = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
    <tr><td style="padding:24px 24px 8px;">
      <p style="margin:0;font-size:11px;letter-spacing:2px;color:#8b5cf6;text-transform:uppercase;font-weight:700;">Order confirmation</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#111;">Hi ${esc(firstName)}, thank you for your order!</h1>
      <p style="margin:6px 0 0;color:#666;font-size:13px;">Order #${esc(order.order_number)} · ${esc(dateStr)}</p>
    </td></tr>
    <tr><td style="padding:16px 24px 0;">
      <h2 style="font-size:13px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:14px 0 6px;">Items</h2>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${itemRows}</table>
    </td></tr>
    <tr><td style="padding:8px 24px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;">
        <tr><td style="padding:6px 0;color:#666;">Total</td><td style="padding:6px 0;text-align:right;"><b>${naira(Number(order.total))}</b></td></tr>
      </table>
    </td></tr>
    <tr><td style="padding:16px 24px 24px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#666;">
        Your order is being processed and will be shipped soon. You'll receive another email when your order status changes.
      </p>
      <p style="margin:12px 0 0;font-size:14px;">
        Questions? Email ${esc(CONTACT.email)}.
      </p>
    </td></tr>
  </table>
</body></html>`;

  let emailSent = false;
  try {
    const apiKey = process.env.LOVABLE_EMAIL_API_KEY;
    if (apiKey) {
      await sendLovableEmail(
        {
          to: order.customer_email,
          from: CONTACT.email,
          subject,
          html: customerHtml,
          text: `Order #${order.order_number} — ${naira(Number(order.total))}. Thank you for shopping with SupplierAffordable!`,
        },
        { apiKey }
      );
      emailSent = true;
    } else {
      console.log("[NOTIFICATION] Customer receipt (no API key):", {
        to: order.customer_email,
        subject,
        orderId,
      });
    }
  } catch (err: any) {
    console.error("[NOTIFICATION] Customer email failed:", err?.message);
  }

  return { sent: emailSent };
}

export const sendCustomerStatusChangeEmail = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, total, customer_name, customer_email, status, created_at")
    .eq("id", data.orderId)
    .single();

  if (orderError || !order || !order.customer_email) return { sent: false };

  const statusLabels: Record<string, string> = {
    pending: "Order received",
    processing: "Processing",
    shipped: "Shipped",
    out_for_delivery: "Out for delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };
  const label = statusLabels[order.status] || order.status;
  const subject = `Order #${order.order_number} status update — ${label}`;

  const customerHtml = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#fafafa;font-family:Arial,Helvetica,sans-serif;color:#222;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #eee;">
    <tr><td style="padding:24px 24px 8px;">
      <p style="margin:0;font-size:11px;letter-spacing:2px;color:#8b5cf6;text-transform:uppercase;font-weight:700;">Status update</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#111;">Your order status has been updated</h1>
      <p style="margin:6px 0 0;color:#666;font-size:13px;">Order #${esc(order.order_number)} is now <b style="color:#111;">${label}</b>.</p>
    </td></tr>
    <tr><td style="padding:16px 24px 24px;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#666;">
        Thank you for shopping with SupplierAffordable. You'll be notified of further updates until your order is delivered.
      </p>
    </td></tr>
  </table>
</body></html>`;

  let emailSent = false;
  try {
    const apiKey = process.env.LOVABLE_EMAIL_API_KEY;
    if (apiKey) {
      await sendLovableEmail(
        {
          to: order.customer_email,
          from: CONTACT.email,
          subject,
          html: customerHtml,
          text: `Order #${order.order_number} is now ${label}.`,
        },
        { apiKey }
      );
      emailSent = true;
    } else {
      console.log("[NOTIFICATION] Customer status update (no API key):", {
        to: order.customer_email,
        subject,
        orderId: data.orderId,
        status: order.status,
      });
    }
  } catch (err: any) {
    console.error("[NOTIFICATION] Customer status email failed:", err?.message);
  }

  await supabaseAdmin.from("notifications").insert({
    type: "status_change",
    title: `Order #${order.order_number} — ${label}`,
    message: `Order status updated to ${label}. Customer notified.`,
    order_id: order.id,
    sent_email: emailSent,
  });

  return { sent: emailSent };
  });

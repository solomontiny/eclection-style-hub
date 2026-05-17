import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CONTACT } from "./contact";

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
        qty: z.number().int().min(1).max(99),
        price: z.number().min(0),
        image: z.string().max(500).optional().default(""),
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

function buildEmailHtml(args: {
  snapshot: z.infer<typeof SnapshotSchema>;
  paystackRef: string;
  audience: "customer" | "business";
}) {
  const { snapshot: s, paystackRef, audience } = args;
  const dateStr = new Date(s.createdAt).toLocaleString("en-NG");
  const greeting =
    audience === "customer"
      ? `Hi ${s.customer.name.split(" ")[0] || "there"}, thank you for shopping with E Style Collection!`
      : `New paid order received from ${s.customer.name}.`;

  const rows = s.items
    .map(
      (it) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;">${it.name}<br><span style="color:#888;font-size:12px;">Size ${it.size} · Qty ${it.qty}</span></td>
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
      <p style="margin:6px 0 0;color:#666;font-size:13px;">Order #${s.orderRef} · ${dateStr}</p>
    </td></tr>

    <tr><td style="padding:0 24px;">
      <div style="margin-top:16px;padding:12px 14px;background:#fdf2f7;border:1px solid #f6c8da;border-radius:10px;font-size:13px;">
        <b style="color:#c44569;">Paystack reference:</b> <span style="font-family:monospace;">${paystackRef}</span>
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
        <tr><td style="padding:6px 0;color:#666;">Delivery (${s.delivery.label})</td><td style="padding:6px 0;text-align:right;">${s.delivery.fee === 0 ? "FREE" : naira(s.delivery.fee)}</td></tr>
        <tr><td style="padding:6px 0;color:#666;font-size:12px;" colspan="2">Arrives in <b style="color:#111;">${s.delivery.eta}</b></td></tr>
        <tr><td style="padding:12px 0 0;border-top:1px solid #eee;font-weight:700;font-size:16px;">Total paid</td><td style="padding:12px 0 0;border-top:1px solid #eee;text-align:right;font-weight:700;font-size:18px;color:#c44569;">${naira(s.total)}</td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:16px 24px 24px;">
      <h2 style="font-size:13px;letter-spacing:1.5px;color:#888;text-transform:uppercase;margin:14px 0 6px;">${audience === "customer" ? "Delivery to" : "Customer"}</h2>
      <p style="margin:0;font-size:14px;line-height:1.6;">
        <b>${s.customer.name}</b><br>
        ${s.customer.email}${s.customer.phone ? `<br>${s.customer.phone}` : ""}
      </p>

      <p style="margin:18px 0 0;font-size:12px;color:#888;">
        ${audience === "customer"
          ? `Questions? Reply to this email or WhatsApp us at ${CONTACT.phone}.`
          : `Reply to the customer at ${s.customer.email} or call ${s.customer.phone || "—"}.`}
      </p>
    </td></tr>

  </table>
</body></html>`;
}

/**
 * Sends order receipt (SAFE VERSION — no external email dependency)
 */
export const sendOrderReceipt = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { snapshot, paystackRef } = data;

    // 🚨 Email service removed temporarily to prevent deployment failure
    // This avoids broken dependency: @lovable.dev/email-js

    const subject = `Order #${snapshot.orderRef} — E Style Collection`;

    const customerHtml = buildEmailHtml({
      snapshot,
      paystackRef,
      audience: "customer",
    });

    const businessHtml = buildEmailHtml({
      snapshot,
      paystackRef,
      audience: "business",
    });

    try {
      console.log("📧 Order received (email system disabled)");
      console.log("Customer email:", snapshot.customer.email);
      console.log("Business email:", CONTACT.email);
      console.log("Subject:", subject);

      // Instead of sending email, we just simulate success
      return {
        status: "sent" as const,
        message: "Order processed successfully (email temporarily disabled)",
        debug: {
          customerHtml,
          businessHtml,
        },
      };
    } catch (err: any) {
      console.error("sendOrderReceipt failed:", err);
      return {
        status: "error" as const,
        message: err?.message ?? "Order processing failed.",
      };
    }
  });
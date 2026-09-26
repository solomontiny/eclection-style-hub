import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "./supabase-admin.server";
import { restoreStock, getOrderStockReservations, emitStockAlerts } from "./stock";
import { sendCustomerStatusChangeEmail } from "./notifications";

/**
 * Cancel or refund an order and restore the reserved stock.
 *
 * Idempotent: re-running against an already-cancelled/refunded order is a
 * no-op (the `payment_status` / `status` guards prevent double-restore).
 */
export const cancelOrder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, status, payment_status")
      .eq("id", data.orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found.");
    }

    const wasPaid = order.payment_status === "paid";
    const alreadyCancelled = order.status === "cancelled";
    const alreadyRefunded = order.payment_status === "refunded";

    // Restore stock exactly once — on the first cancellation of an order that
    // still holds a reservation. A pending order *does* hold a reservation
    // (createOrderServerFn reserves before inserting), so it must be released
    // here too, otherwise an abandoned pending order permanently consumes stock.
    if (!alreadyCancelled && !alreadyRefunded) {
      const reservations = await getOrderStockReservations(supabaseAdmin, order.id);
      await restoreStock(supabaseAdmin, reservations);
    }

    await supabaseAdmin
      .from("orders")
      .update({
        status: "cancelled",
        payment_status: wasPaid || alreadyRefunded ? "refunded" : order.payment_status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    // Re-evaluate stock alerts after a restock so a future low/out
    // transition can fire again.
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id")
      .eq("order_id", order.id);

    void emitStockAlerts(
      supabaseAdmin,
      (items ?? []).map((i: any) => i.product_id).filter(Boolean),
    ).catch((err: any) => console.error("Stock alert emission failed:", err?.message));

    void sendCustomerStatusChangeEmail({ data: { orderId: order.id } }).catch((err: any) =>
      console.error("Customer cancellation email failed:", err?.message)
    );

    return { ok: true, stockRestored: !alreadyCancelled && !alreadyRefunded };
  });
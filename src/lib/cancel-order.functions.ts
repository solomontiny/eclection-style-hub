import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "./supabase-admin.server";
import { emitStockAlerts } from "./stock";
import { sendCustomerStatusChangeEmail } from "./notifications";
import { requireAdminUser } from "./admin-auth.server";

/**
 * Cancel an unpaid pending order and restore its reserved stock once.
 */
export const cancelOrder = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requireAdminUser();
    const supabaseAdmin = getSupabaseAdmin();

    const { data: restorationResult, error } = await supabaseAdmin.rpc(
      "cancel_pending_order_and_restore_reserved_stock",
      { p_order_id: data.orderId },
    );

    if (error) {
      throw new Error(error.message || "Failed to cancel order and restore stock.");
    }

    if (restorationResult === "already_restored") {
      return { ok: true, stockRestored: true };
    }

    if (restorationResult !== "restored") {
      throw new Error("Order cancellation returned an unexpected result.");
    }

    // Re-evaluate stock alerts after a restock so a future low/out
    // transition can fire again.
    const { data: items } = await supabaseAdmin
      .from("order_items")
      .select("product_id")
      .eq("order_id", data.orderId);

    void emitStockAlerts(
      supabaseAdmin,
      (items ?? []).map((i: any) => i.product_id).filter(Boolean),
    ).catch((err: any) => console.error("Stock alert emission failed:", err?.message));

    void sendCustomerStatusChangeEmail({ data: { orderId: data.orderId } }).catch((err: any) =>
      console.error("Customer cancellation email failed:", err?.message),
    );

    return { ok: true, stockRestored: true };
  });
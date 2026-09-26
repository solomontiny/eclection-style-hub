import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getSupabaseAdmin } from "./supabase-admin.server";

/** Sensible default low-stock threshold when a product has none set. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/**
 * Classify a stock level. Uses the product's own threshold when present.
 */
export function classifyStock(
  stock: number | null | undefined,
  threshold: number | null | undefined,
): StockStatus {
  const s = Math.max(0, Number(stock ?? 0));
  if (s <= 0) return "out_of_stock";
  const t = Number(threshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
  return s <= t ? "low_stock" : "in_stock";
}

export function isPurchasable(stock: number | null | undefined): boolean {
  return Math.max(0, Number(stock ?? 0)) > 0;
}

/**
 * Atomically reserve stock for an order.
 *
 * Uses a row-level `UPDATE ... WHERE stock >= qty` so a concurrent checkout
 * can never oversell. Returns the number of rows updated (0 = insufficient
 * stock for at least one item).
 */
export async function reserveStock(
  supabase: SupabaseClient<Database>,
  reservations: { productId: string; qty: number }[],
): Promise<{ ok: true } | { ok: false; insufficient: string[] }> {
  const insufficient: string[] = [];

  for (const { productId, qty } of reservations) {
    const { count, error } = await supabase
      .from("products")
      .update({ stock: supabase.raw("GREATEST(stock - :qty, 0)", { qty }) })
      .eq("id", productId)
      .gte("stock", qty)
      .select("id", { count: "exact", head: true });

    if (error) {
      console.error("reserveStock failed for product", productId, error.message);
      return { ok: false, insufficient: [productId, ...insufficient] };
    }
    if (!count) {
      insufficient.push(productId);
    }
  }

  return insufficient.length > 0
    ? { ok: false, insufficient }
    : { ok: true };
}

/**
 * Restore stock when an order is cancelled/refunded/failed.
 */
export async function restoreStock(
  supabase: SupabaseClient<Database>,
  reservations: { productId: string; qty: number }[],
): Promise<void> {
  for (const { productId, qty } of reservations) {
    const { error } = await supabase
      .from("products")
      .update({ stock: supabase.raw("stock + :qty", { qty }) })
      .eq("id", productId);

    if (error) {
      console.error("restoreStock failed for product", productId, error.message);
    }
  }
}

/**
 * Load the products referenced by an order so stock can be reserved/restored.
 */
export async function getOrderStockReservations(
  supabase: SupabaseClient<Database>,
  orderId: string,
): Promise<{ productId: string; qty: number }[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (error) {
    console.error("getOrderStockReservations failed:", error.message);
    return [];
  }
  return (data ?? [])
    .filter((r) => r.product_id)
    .map((r) => ({ productId: r.product_id, qty: Number(r.quantity) }));
}

/**
 * Emit idempotent stock alert notifications.
 *
 * Uses a sentinel row keyed on (type, product_id, order_id IS NULL) so that
 * a given transition only ever produces one notification. A restock clears
 * the sentinel so a future low/out transition can fire again.
 */
export async function emitStockAlerts(
  supabase: SupabaseClient<Database>,
  productIds: string[],
): Promise<void> {
  if (productIds.length === 0) return;

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, stock, low_stock_threshold, sku")
    .in("id", productIds);

  if (error || !products) {
    console.error("emitStockAlerts failed to load products:", error?.message);
    return;
  }

  const adminClient = getSupabaseAdmin();
  const now = new Date().toISOString();

  for (const p of products) {
    const status = classifyStock(p.stock, p.low_stock_threshold);
    const remaining = Math.max(0, Number(p.stock ?? 0));
    const label = status === "out_of_stock" ? "out_of_stock" : "low_stock";
    const title =
      status === "out_of_stock"
        ? `Out of stock: ${p.name}`
        : `Low stock: ${p.name}`;
    const message =
      status === "out_of_stock"
        ? `${p.name} is now out of stock.`
        : `${p.name} has only ${remaining} left in stock.`;

    // Clear any previous alert sentinel for this product so a future
    // transition can fire again after a restock.
    await adminClient
      .from("notifications")
      .delete()
      .eq("type", "stock_alert")
      .eq("product_id", p.id)
      .is("order_id", null);

    if (status === "in_stock") continue;

    const { error: insertError } = await adminClient
      .from("notifications")
      .insert({
        type: "stock_alert",
        title,
        message,
        product_id: p.id,
        order_id: null,
        is_read: false,
        sent_email: false,
      });

    if (insertError) {
      console.error("emitStockAlerts insert failed:", insertError.message);
    }
  }
}
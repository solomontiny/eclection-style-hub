import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "./supabase-admin.server";
import {
  BANK_TRANSFER_CURRENCY,
  getDefaultBankAccounts,
  normalizeBankAccounts,
  normalizeWhatsappNumber,
  type BankAccount,
} from "./payment-config";

/**
 * Customer-facing bank transfer settings.
 *
 * Bank account details and the business WhatsApp number are intentionally
 * public. No secret, service key or Paystack value is returned here — the
 * response is built from an explicit allow-list of fields only.
 */
export type PublicPaymentSettings = {
  bankAccounts: BankAccount[];
  /** Digits-only international format for wa.me, or null when not configured. */
  whatsappNumber: string | null;
  currency: string;
};

/**
 * Reads the payment details from the existing `shop_settings` row.
 *
 * `select("*")` is deliberate: if the optional `bank_accounts` /
 * `whatsapp_number` columns have not been added yet, the query still
 * succeeds and the app falls back to the built-in account instead of
 * crashing the checkout.
 */
export const getPaymentSettingsServerFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicPaymentSettings> => {
    const fallbackAccounts = getDefaultBankAccounts();

    try {
      const { data, error } = await getSupabaseAdmin()
        .from("shop_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (error) {
        console.error("Failed to load payment settings:", error.message);
        return {
          bankAccounts: fallbackAccounts,
          whatsappNumber: normalizeWhatsappNumber(undefined),
          currency: BANK_TRANSFER_CURRENCY,
        };
      }

      const row = (data ?? {}) as unknown as Record<string, unknown>;
      const stored = normalizeBankAccounts(row.bank_accounts);

      return {
        bankAccounts: stored.length > 0 ? stored.filter((a) => a.active) : fallbackAccounts,
        whatsappNumber: normalizeWhatsappNumber(row.whatsapp_number ?? row.contact_phone),
        currency: BANK_TRANSFER_CURRENCY,
      };
    } catch (err: any) {
      console.error("getPaymentSettingsServerFn failed:", err?.message);
      return {
        bankAccounts: fallbackAccounts,
        whatsappNumber: null,
        currency: BANK_TRANSFER_CURRENCY,
      };
    }
  },
);

export type PublicOrderSummary = {
  orderNumber: string;
  total: number;
  paymentAmount: number;
  paymentCurrency: string;
  customerName: string;
  paymentStatus: string;
  status: string;
};

/**
 * Minimal, non-sensitive summary of a single order for the payment
 * instructions page. It never changes the order — it only reports what the
 * admin has already recorded.
 */
export const getOrderSummaryServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string().uuid() }))
  .handler(async ({ data }): Promise<PublicOrderSummary | null> => {
    const { data: order, error } = await getSupabaseAdmin()
      .from("orders")
      .select("id, order_number, total, customer_name, payment_status, status")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load order summary:", error.message);
      return null;
    }
    if (!order) return null;

    const total = Number(order.total ?? 0);

    return {
      orderNumber: order.order_number,
      total,
      // Bank transfer orders are always settled in naira, so the payable
      // amount is the order total.
      paymentAmount: total,
      paymentCurrency: BANK_TRANSFER_CURRENCY,
      customerName: order.customer_name || "",
      paymentStatus: order.payment_status,
      status: order.status,
    };
  });

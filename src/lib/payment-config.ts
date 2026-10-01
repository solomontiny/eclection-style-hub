import { CONTACT } from "./contact";

/**
 * Customer-facing payment methods supported by checkout.
 *
 * `bank_transfer` — manual bank transfer + WhatsApp receipt (current method).
 * `paystack`       — the original card/bank redirect flow, fully preserved.
 */
export type PaymentMethod = "paystack" | "bank_transfer";

/**
 * The payment method checkout offers to customers right now.
 *
 * Paystack is PAUSED, not removed: its server functions, webhook, currency
 * logic and environment variables are all still in place. To switch the
 * customer-facing checkout back to Paystack, change this constant to
 * "paystack" and restore the Paystack branch in `src/routes/checkout.tsx`.
 * No other file has to be rebuilt.
 */
export const ACTIVE_PAYMENT_METHOD: PaymentMethod = "bank_transfer";

/**
 * True when `method` is the customer-facing payment method in use.
 * Written as a helper (rather than an inline comparison) so flipping
 * `ACTIVE_PAYMENT_METHOD` above never produces a TypeScript error in the
 * pages that branch on it.
 */
export function isActivePaymentMethod(method: PaymentMethod): boolean {
  return ACTIVE_PAYMENT_METHOD === method;
}

/** Bank transfers are settled in Nigerian naira. */
export const BANK_TRANSFER_CURRENCY = "NGN";

export const WHATSAPP_LINK_BASE = "https://wa.me/";

export type BankAccount = {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  active: boolean;
};

type RawBankAccount = {
  id?: unknown;
  bankName?: unknown;
  bank_name?: unknown;
  accountName?: unknown;
  account_name?: unknown;
  accountNumber?: unknown;
  account_number?: unknown;
  active?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Coerce one stored entry into a `BankAccount`, or `null` if it is unusable. */
export function normalizeBankAccount(raw: unknown, index: number): BankAccount | null {
  if (!raw || typeof raw !== "object") return null;
  const entry = raw as RawBankAccount;
  const bankName = text(entry.bankName) || text(entry.bank_name);
  const accountName = text(entry.accountName) || text(entry.account_name);
  const accountNumber = text(entry.accountNumber) || text(entry.account_number);
  if (!bankName || !accountName || !accountNumber) return null;

  return {
    id: text(entry.id) || `bank-${index + 1}`,
    bankName,
    accountName,
    accountNumber,
    active: entry.active === undefined ? true : !!entry.active,
  };
}

/** Normalize a stored list of accounts and keep only the active ones. */
export function normalizeBankAccounts(raw: unknown): BankAccount[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => normalizeBankAccount(entry, index))
    .filter((entry): entry is BankAccount => !!entry);
}

/** The one account that already ships with the app, used until the admin saves settings. */
export function getDefaultBankAccounts(): BankAccount[] {
  return [
    {
      id: "default-bank",
      bankName: CONTACT.bank.bankName,
      accountName: CONTACT.bank.accountName,
      accountNumber: CONTACT.bank.accountNumber,
      active: true,
    },
  ];
}

/**
 * Convert a human-entered phone number into the digits-only international
 * format `wa.me` expects (e.g. "0800 123 4567" -> "2348001234567").
 */
export function normalizeWhatsappNumber(raw: unknown): string | null {
  const digits = text(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("234")) return digits;
  if (digits.startsWith("0")) return `234${digits.slice(1)}`;
  return digits;
}

export type ReceiptMessageArgs = {
  orderNumber: string;
  customerName: string;
  /** Pre-formatted amount, e.g. "₦120,000". */
  amountLabel: string;
};

/** The message pre-filled in the customer's WhatsApp chat. */
export function buildReceiptMessage(args: ReceiptMessageArgs): string {
  return [
    `Hello ${CONTACT.brand},`,
    "",
    "I have made payment for my order.",
    "",
    `Order Number: ${args.orderNumber}`,
    `Customer: ${args.customerName}`,
    `Amount: ${args.amountLabel}`,
    "",
    "I am sending my payment receipt for confirmation.",
  ].join("\n");
}

export function buildWhatsappLink(whatsappNumber: string, message: string): string {
  return `${WHATSAPP_LINK_BASE}${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Copy helper that still works when the clipboard API is unavailable. */
export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // fall through to the legacy path below
  }
  try {
    if (typeof document === "undefined") return false;
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

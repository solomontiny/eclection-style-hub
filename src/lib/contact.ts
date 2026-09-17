export const CONTACT = {
  brand: "SupplierAffordable",
  email: "SupplierAffordable.careline@gmail.com",
  instagram: "_supplieraffordable",
  facebook: "supplier affordable",
  tiktokHandle: "_supplieraffordable",
  // Bank details — update with real account info
  bank: {
    bankName: "Access Bank",
    accountName: "Aken Margaret Ifeoma",
    accountNumber: "0800175647",
  },
} as const;

export const LAGOS_DELIVERY_NOTE = "Lagos Delivery: Your order will be delivered by a rider. Delivery fee is paid directly to the rider when you receive your order.";

export const DELIVERY_INFO = {
  interstate: "Interstate delivery: 2–5 working days",
  international: "International delivery: 2–14 working days",
  note: "Delivery times may vary depending on your location and circumstances.",
} as const;

export const SUPPORT_HOURS = "We reply Monday to Friday, 9 AM to 6 PM.";

export const EXCHANGE_POLICY = "We currently do not offer exchanges. Please carefully confirm your product selection, size and order details before completing your purchase.";

export const PROMO = {
  code: "WELCOME",
  percent: 10,
  label: "WELCOME — 10% OFF",
} as const;

export const SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"] as const;

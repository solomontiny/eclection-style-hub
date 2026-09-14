export const CONTACT = {
  brand: "Supplier Affordable",
  email: "SupplierAffordable.careline@gmail.com",
  phone: "+2348081759542",
  phone2: "+2349165170214",
  whatsappNumber: "2348081759542",
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

export const LAGOS_DELIVERY_NOTE =
  "Lagos Delivery: Your order will be delivered by a rider. The delivery fee is separate and is paid directly to the rider when you receive your order.";

export function whatsappLink(message: string) {
  return `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

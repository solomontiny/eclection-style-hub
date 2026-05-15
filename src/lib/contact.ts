export const CONTACT = {
  brand: "E Style Collection",
  email: "Meggieakenn@gmail.com",
  phone: "+2348081759542",
  phone2: "+2349165170214",
  whatsappNumber: "2348081759542",
  address: "5 Path Akachukwu Drive, Majek, Lekki–Epe Expressway, Lagos",
  mapQuery: "5 Path Akachukwu Drive, Majek, Lekki-Epe Expressway, Lagos, Nigeria",
  // Paystack payment page (replace with your real Paystack page link)
  paystackUrl: "https://paystack.shop/estylecollection",
  instagram: "e_style_wears_collection",
  facebook: "Supplier Affordable",
  tiktokHandle: "supplier.affordable",
  // Bank details — update with real account info
  bank: {
    bankName: "Access Bank",
    accountName: "Aken Margaret Ifeoma",
    accountNumber: "0800175647",
  },
} as const;

export function whatsappLink(message: string) {
  return `https://wa.me/${CONTACT.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

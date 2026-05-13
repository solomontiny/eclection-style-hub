export const CONTACT = {
  brand: "E Style Collection",
  email: "Meggieakenn@gmail.com",
  phone: "+2348081759542",
  whatsappNumber: "2348081759542",
  address: "5 Path Akachukwu Drive, Majek, Lekki–Epe Expressway, Lagos",
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

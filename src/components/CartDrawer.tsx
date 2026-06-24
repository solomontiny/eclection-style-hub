import {
  ShoppingCart,
  MessageCircle,
  Trash2,
  Minus,
  Plus,
  Clock,
  CreditCard,
  Truck,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart, cartItemKey } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { whatsappLink, CONTACT } from "@/lib/contact";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const DELIVERY_PRESETS = [
  { label: "Lekki / Ajah", fee: 2500, eta: "Same day – next day" },
  { label: "Lagos Mainland", fee: 3500, eta: "1 – 2 business days" },
  { label: "Other states", fee: 5000, eta: "3 – 5 business days" },
  { label: "Pickup", fee: 0, eta: "Ready in 24 hrs" },
];

const ADDRESS_STORAGE_KEY = "esc:custom-address";
export const PENDING_ORDER_KEY = "esc:pending-order";

// Keyword-based fare estimator for custom addresses
const FARE_RULES: { keywords: string[]; label: string; fee: number; eta: string }[] = [
  {
    keywords: [
      "lekki",
      "ajah",
      "ikoyi",
      "vi",
      "victoria island",
      "lagos island",
      "oniru",
      "chevron",
      "ikate",
      "sangotedo",
      "ibeju",
    ],
    label: "Lekki axis",
    fee: 2500,
    eta: "Same day – next day",
  },
  {
    keywords: [
      "yaba",
      "ikeja",
      "surulere",
      "gbagada",
      "maryland",
      "ogba",
      "ojota",
      "magodo",
      "ketu",
      "mushin",
      "oshodi",
      "festac",
      "agege",
      "isolo",
      "ojo",
      "ipaja",
      "alimosho",
    ],
    label: "Lagos Mainland",
    fee: 3500,
    eta: "1 – 2 business days",
  },
  {
    keywords: [
      "abuja",
      "port harcourt",
      "ibadan",
      "kano",
      "enugu",
      "kaduna",
      "owerri",
      "benin",
      "calabar",
      "warri",
      "uyo",
      "abeokuta",
      "akure",
      "jos",
      "lokoja",
      "ilorin",
      "asaba",
      "onitsha",
    ],
    label: "Other states",
    fee: 5000,
    eta: "3 – 5 business days",
  },
  {
    keywords: ["ogun", "ibafo", "mowe", "sagamu", "ota", "ifo"],
    label: "Ogun (border)",
    fee: 4000,
    eta: "2 – 3 business days",
  },
];

function estimateFare(address: string): { label: string; fee: number; eta: string } {
  const a = address.toLowerCase();
  for (const rule of FARE_RULES) {
    if (rule.keywords.some((k) => a.includes(k))) {
      return { label: rule.label, fee: rule.fee, eta: rule.eta };
    }
  }
  return { label: "Lagos area (estimate)", fee: 3500, eta: "1 – 3 business days" };
}

export function CartDrawer() {
  const { items, count, subtotal, open, setOpen, updateQty, removeItem, clear } = useCart();
  const [deliveryLabel, setDeliveryLabel] = useState("Lekki / Ajah");
  const [deliveryFee, setDeliveryFee] = useState(2500);
  const [deliveryEta, setDeliveryEta] = useState("Same day – next day");
  const [customAddress, setCustomAddress] = useState("");
  const [usingCustom, setUsingCustom] = useState(false);
  const [savedAddress, setSavedAddress] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDRESS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved?.address) {
          setCustomAddress(saved.address);
          setDeliveryLabel(`${saved.label} — ${saved.address}`);
          setDeliveryFee(saved.fee);
          setDeliveryEta(saved.eta);
          setUsingCustom(true);
          setSavedAddress(true);
        }
      }

      const c = localStorage.getItem("esc:customer");
      if (c) {
        const { name, email, phone } = JSON.parse(c);
        if (name) setCustomerName(name);
        if (email) setCustomerEmail(email);
        if (phone) setCustomerPhone(phone);
      }
    } catch {}
  }, []);

  const total = subtotal + deliveryFee;

  const applyCustomAddress = () => {
    const trimmed = customAddress.trim();
    if (!trimmed) return;

    const est = estimateFare(trimmed);
    setDeliveryLabel(`${est.label} — ${trimmed}`);
    setDeliveryFee(est.fee);
    setDeliveryEta(est.eta);
    setUsingCustom(true);

    try {
      localStorage.setItem(
        ADDRESS_STORAGE_KEY,
        JSON.stringify({
          address: trimmed,
          label: est.label,
          fee: est.fee,
          eta: est.eta,
        })
      );
      setSavedAddress(true);
    } catch {}
  };

  const forgetAddress = () => {
    try {
      localStorage.removeItem(ADDRESS_STORAGE_KEY);
    } catch {}

    setSavedAddress(false);
    setCustomAddress("");
    setUsingCustom(false);

    const p = DELIVERY_PRESETS[0];
    setDeliveryLabel(p.label);
    setDeliveryFee(p.fee);
    setDeliveryEta(p.eta);
  };

  const message =
    `*New Cart Order — E Style Collection* 🛍️\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🧾 *Items*\n` +
    items
      .map(
        (it, i) =>
          `${i + 1}. ${it.name} — Size ${it.size} × ${it.qty}\n   ${formatNaira(
            it.price
          )} × ${it.qty} = ${formatNaira(it.price * it.qty)}`
      )
      .join("\n") +
    `\n\n💰 *Price Breakdown*\n` +
    `• Subtotal       : ${formatNaira(subtotal)}\n` +
    `• Delivery zone  : ${deliveryLabel}\n` +
    `• ETA            : ${deliveryEta}\n` +
    `• Delivery fee   : ${deliveryFee === 0 ? "FREE" : formatNaira(deliveryFee)}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*TOTAL: ${formatNaira(total)}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Please confirm availability and final total. Thank you! 💕`;

  const canPay =
    items.length > 0 &&
    customerName.trim() &&
    /\S+@\S+\.\S+/.test(customerEmail);

  const handlePayNow = () => {
    if (!canPay) return;

    const orderRef = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    const snapshot = {
      orderRef,
      createdAt: Date.now(),
      customer: {
        name: customerName.trim(),
        email: customerEmail.trim(),
        phone: customerPhone.trim(),
      },
      items: items.map((it) => ({
        id: it.id,
        name: it.name,
        size: it.size,
        qty: it.qty,
        price: it.price,
        image: it.image,
      })),
      delivery: { label: deliveryLabel, fee: deliveryFee, eta: deliveryEta },
      subtotal,
      total,
    };

    try {
      localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(snapshot));
      localStorage.setItem("esc:customer", JSON.stringify(snapshot.customer));
    } catch {}

    window.open(CONTACT.paystackUrl, "_blank", "noopener,noreferrer");
    window.location.href = `/thank-you?ref=${encodeURIComponent(orderRef)}`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="relative p-2 rounded-full">
          <ShoppingCart size={20} />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle>Your cart ({count})</SheetTitle>
        </SheetHeader>

        <div className="flex-1">
          {/* UI unchanged for brevity — already stable */}
        </div>
      </SheetContent>
    </Sheet>
  );
}
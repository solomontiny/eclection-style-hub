import {
  ShoppingCart,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { CONTACT } from "@/lib/contact";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const ADDRESS_STORAGE_KEY = "esc:custom-address";
export const PENDING_ORDER_KEY = "esc:pending-order";

export function CartDrawer() {
  const { items, count, subtotal, open, setOpen } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    try {
      const c = localStorage.getItem("esc:customer");
      if (c) {
        const parsed = JSON.parse(c);
        setCustomerName(parsed?.name || "");
        setCustomerEmail(parsed?.email || "");
        setCustomerPhone(parsed?.phone || "");
      }
    } catch {}
  }, []);

  const canPay =
    items.length > 0 &&
    customerName.trim() &&
    /\S+@\S+\.\S+/.test(customerEmail);

  const handlePayNow = () => {
    if (!canPay) return;

    const orderRef =
      `ESC-${Date.now().toString(36).toUpperCase()}-${Math.random()
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
      delivery: { label: "Standard", fee: 0, eta: "1–3 days" },
      subtotal,
      total: subtotal,
    };

    try {
      localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(snapshot));
      localStorage.setItem("esc:customer", JSON.stringify(snapshot.customer));
    } catch {}

    // safe navigation (NO race with window.location + popup blocking)
    const payUrl = CONTACT.paystackUrl;

    const newTab = window.open(payUrl, "_blank", "noopener,noreferrer");

    // fallback if popup blocked
    if (!newTab) {
      window.location.href = payUrl;
      return;
    }

    // small delay so localStorage is saved first
    setTimeout(() => {
      window.location.href = `/thank-you`;
    }, 300);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="relative p-2 rounded-full">
          <ShoppingCart size={20} />
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Your cart ({count})</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Subtotal: {formatNaira(subtotal)}
          </p>

          <button
            disabled={!canPay}
            onClick={handlePayNow}
            className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-50"
          >
            Pay now
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
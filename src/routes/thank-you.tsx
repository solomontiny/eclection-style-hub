import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Check, MessageCircle, Mail, Package, Clock, ShoppingBag } from "lucide-react";
import { formatNaira } from "@/lib/products";
import { CONTACT, whatsappLink } from "@/lib/contact";
import { useCart } from "@/lib/cart";
import { PENDING_ORDER_KEY } from "@/components/CartDrawer";

export const Route = createFileRoute("/thank-you")({
  component: ThankYou,
});

type Snapshot = {
  orderRef: string;
  createdAt: number;
  customer: { name: string; email: string; phone: string };
  items: { id: string; name: string; size: string; qty: number; price: number; image: string }[];
  delivery: { label: string; fee: number; eta: string };
  subtotal: number;
  total: number;
};

function ThankYou() {
  const { clear } = useCart();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [paystackRef, setPaystackRef] = useState("");

  useEffect(() => {
    // SAFE SSR CHECK
    if (typeof window === "undefined") return;

    try {
      const raw = localStorage.getItem(PENDING_ORDER_KEY);
      if (raw) setSnapshot(JSON.parse(raw));
    } catch {}

    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref") || "";
    if (ref) setPaystackRef(ref);
  }, []);

  const orderNumber = useMemo(
    () => snapshot?.orderRef ?? "—",
    [snapshot]
  );

  const copyOrder = async () => {
    try {
      await navigator.clipboard.writeText(orderNumber);
    } catch {}
  };

  if (!snapshot) {
    return (
      <section className="container-x py-20 text-center">
        <ShoppingBag className="mx-auto mb-3" size={40} />
        <h1>No pending order found</h1>
        <Link to="/shop" className="text-primary">
          Go shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="container-x py-12">
      <div className="max-w-2xl mx-auto text-center">
        <CheckCircle2 className="mx-auto text-primary" size={40} />
        <h1 className="text-3xl mt-2">
          Thank you, {snapshot.customer.name}
        </h1>

        <div className="mt-6 border p-4 rounded-lg flex justify-between">
          <span>{orderNumber}</span>
          <button onClick={copyOrder}>
            <Copy size={16} />
          </button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          We’ll process your order shortly.
        </p>

        <a
          href={whatsappLink("Order confirmation")}
          target="_blank"
          rel="noreferrer"
          className="block mt-6"
        >
          <MessageCircle /> WhatsApp us
        </a>

        <Link to="/shop" className="block mt-4 text-sm">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
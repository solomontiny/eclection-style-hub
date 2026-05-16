import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Copy, Check, MessageCircle, Mail, Package, Clock, ShoppingBag } from "lucide-react";
import { formatNaira } from "@/lib/products";
import { CONTACT, whatsappLink } from "@/lib/contact";
import { useCart } from "@/lib/cart";
import { PENDING_ORDER_KEY } from "@/components/CartDrawer";
import { sendOrderReceipt } from "@/lib/orders.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/thank-you")({
  head: () => ({
    meta: [
      { title: "Order confirmation — E Style Collection" },
      { name: "description", content: "Confirm your Paystack payment, get your order number and receive your receipt by email." },
      { name: "robots", content: "noindex" },
    ],
  }),
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
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<"idle" | "ok" | "error" | "pending">("idle");
  const [errMsg, setErrMsg] = useState("");
  const sendFn = useServerFn(sendOrderReceipt);

  // Load snapshot + auto-capture reference from Paystack callback (?reference=… or ?trxref=…)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_ORDER_KEY);
      if (raw) setSnapshot(JSON.parse(raw));
    } catch { /* ignore */ }
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("reference") || params.get("trxref") || "";
    if (ref) setPaystackRef(ref);
  }, []);

  const orderNumber = useMemo(() => snapshot?.orderRef ?? "—", [snapshot]);

  const copyOrder = async () => {
    try { await navigator.clipboard.writeText(orderNumber); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

  const narration = useMemo(() => {
    if (!snapshot) return "";
    return (
      `*Order Confirmation — E Style Collection* ✅\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `🧾 Order #: ${snapshot.orderRef}\n` +
      `💳 Paystack ref: ${paystackRef || "(pending)"}\n` +
      `📅 ${new Date(snapshot.createdAt).toLocaleString("en-NG")}\n\n` +
      `👗 *Dresses*\n` +
      snapshot.items
        .map((it, i) => `${i + 1}. ${it.name}\n   Size ${it.size} × ${it.qty} — ${formatNaira(it.price * it.qty)}`)
        .join("\n") +
      `\n\n📍 Delivery: ${snapshot.delivery.label}\n` +
      `⏱  ETA: ${snapshot.delivery.eta}\n\n` +
      `Subtotal : ${formatNaira(snapshot.subtotal)}\n` +
      `Delivery : ${snapshot.delivery.fee === 0 ? "FREE" : formatNaira(snapshot.delivery.fee)}\n` +
      `━━━━━━━━━━━━━━━━━━\n` +
      `*TOTAL  : ${formatNaira(snapshot.total)}*\n` +
      `━━━━━━━━━━━━━━━━━━\n\n` +
      `👤 ${snapshot.customer.name}\n` +
      `📧 ${snapshot.customer.email}\n` +
      (snapshot.customer.phone ? `📞 ${snapshot.customer.phone}\n` : "")
    );
  }, [snapshot, paystackRef]);

  const sendReceipt = async () => {
    if (!snapshot || !paystackRef.trim()) return;
    setSending(true);
    setErrMsg("");
    try {
      const res = await sendFn({ data: { snapshot, paystackRef: paystackRef.trim() } });
      if (res.status === "sent") {
        setSent("ok");
        clear();
        try { localStorage.removeItem(PENDING_ORDER_KEY); } catch { /* ignore */ }
      } else if (res.status === "pending") {
        setSent("pending");
        setErrMsg(res.message || "Email service is being set up.");
      } else {
        setSent("error");
        setErrMsg(res.message || "Could not send email.");
      }
    } catch (e: any) {
      setSent("error");
      setErrMsg(e?.message ?? "Unexpected error sending receipt.");
    } finally {
      setSending(false);
    }
  };

  if (!snapshot) {
    return (
      <section className="container-x py-20">
        <div className="max-w-xl mx-auto text-center">
          <ShoppingBag className="mx-auto text-primary mb-3" size={40} />
          <h1 className="font-display text-3xl">No pending order found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Start by adding items to your cart and clicking <b>Pay now</b>. If you already paid on Paystack, paste your reference into a fresh order or contact us on WhatsApp.
          </p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link to="/shop" className="btn-primary">Browse the shop</Link>
            <a href={whatsappLink("Hi E Style 👋, I made a Paystack payment and need help with my receipt.")} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-full border border-border text-sm font-semibold">
              <MessageCircle size={16} /> WhatsApp us
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="container-x py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center">
          <CheckCircle2 className="mx-auto text-primary mb-2" size={40} />
          <p className="text-xs uppercase tracking-widest text-primary font-semibold">Order summary</p>
          <h1 className="font-display text-3xl md:text-4xl mt-1">Thank you, {snapshot.customer.name.split(" ")[0] || "friend"}!</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your order is ready. Confirm your Paystack reference below and we'll email the receipt to you and to our team.
          </p>
        </div>

        {/* Order number */}
        <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Order number</p>
            <p className="font-display text-xl text-primary truncate">{orderNumber}</p>
          </div>
          <button onClick={copyOrder} className="p-2 rounded-full bg-background hover:bg-primary hover:text-primary-foreground transition-colors" aria-label="Copy order number">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        {/* Items */}
        <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Package size={12} /> Your dresses</p>
          <div className="mt-3 divide-y divide-border/60">
            {snapshot.items.map((it, i) => (
              <div key={i} className="py-3 flex gap-3 items-center">
                <img src={it.image} alt={it.name} className="h-14 w-12 object-cover rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{it.name}</p>
                  <p className="text-xs text-muted-foreground">Size {it.size} · Qty {it.qty}</p>
                </div>
                <p className="text-sm font-semibold text-primary whitespace-nowrap">{formatNaira(it.price * it.qty)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-border/60 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-semibold">{formatNaira(snapshot.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Delivery ({snapshot.delivery.label})</span><span className="font-semibold">{snapshot.delivery.fee === 0 ? "FREE" : formatNaira(snapshot.delivery.fee)}</span></div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock size={11} /> Arrives in <span className="font-semibold text-foreground">{snapshot.delivery.eta}</span></div>
            <div className="flex justify-between pt-2 border-t border-border/60 mt-2"><span className="font-display text-base">Total paid</span><span className="font-display text-xl text-primary">{formatNaira(snapshot.total)}</span></div>
          </div>
        </div>

        {/* Paystack reference */}
        <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Paystack reference</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            We auto-capture this from the callback URL. If empty, paste the reference shown on your Paystack receipt.
          </p>
          <input
            value={paystackRef}
            onChange={(e) => setPaystackRef(e.target.value)}
            placeholder="e.g. T123456789"
            className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-sm font-mono uppercase tracking-wider focus:outline-none focus:border-primary"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={sendReceipt}
            disabled={!paystackRef.trim() || sending || sent === "ok"}
            className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail size={16} /> {sending ? "Sending…" : sent === "ok" ? "Receipt sent ✓" : "Send receipt to both emails"}
          </button>

          {sent === "ok" && (
            <p className="text-center text-sm text-primary font-semibold">
              ✓ Receipt sent to <span className="underline">{snapshot.customer.email}</span> and our team at <span className="underline">{CONTACT.email}</span>.
            </p>
          )}
          {sent === "pending" && (
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-900 dark:text-amber-200 text-center">
              {errMsg} Use the WhatsApp fallback below — we'll get your order right away.
            </div>
          )}
          {sent === "error" && (
            <p className="text-center text-xs text-destructive">{errMsg}</p>
          )}

          <a
            href={whatsappLink(narration)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full border border-border text-sm font-semibold hover:bg-secondary"
          >
            <MessageCircle size={16} /> Send confirmation on WhatsApp (instant)
          </a>

          <Link to="/shop" className="block text-center text-xs text-muted-foreground hover:text-primary mt-3">
            ← Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}

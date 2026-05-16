import { ShoppingCart, MessageCircle, Trash2, Minus, Plus, Clock, CreditCard, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart, cartItemKey } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { whatsappLink, CONTACT } from "@/lib/contact";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

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
  { keywords: ["lekki", "ajah", "ikoyi", "vi", "victoria island", "lagos island", "oniru", "chevron", "ikate", "sangotedo", "ibeju"], label: "Lekki axis", fee: 2500, eta: "Same day – next day" },
  { keywords: ["yaba", "ikeja", "surulere", "gbagada", "maryland", "ogba", "ojota", "magodo", "ketu", "mushin", "oshodi", "festac", "agege", "isolo", "ojo", "ipaja", "alimosho"], label: "Lagos Mainland", fee: 3500, eta: "1 – 2 business days" },
  { keywords: ["abuja", "port harcourt", "ibadan", "kano", "enugu", "kaduna", "owerri", "benin", "calabar", "warri", "uyo", "abeokuta", "akure", "jos", "lokoja", "ilorin", "asaba", "onitsha"], label: "Other states", fee: 5000, eta: "3 – 5 business days" },
  { keywords: ["ogun", "ibafo", "mowe", "sagamu", "ota", "ifo"], label: "Ogun (border)", fee: 4000, eta: "2 – 3 business days" },
];

function estimateFare(address: string): { label: string; fee: number; eta: string } {
  const a = address.toLowerCase();
  for (const rule of FARE_RULES) {
    if (rule.keywords.some((k) => a.includes(k))) return { label: rule.label, fee: rule.fee, eta: rule.eta };
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

  // Customer details collected before payment (so emails have somewhere to go)
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ADDRESS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { address: string; label: string; fee: number; eta: string };
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
    } catch { /* ignore */ }
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
      localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify({ address: trimmed, label: est.label, fee: est.fee, eta: est.eta }));
      setSavedAddress(true);
    } catch { /* ignore */ }
  };

  const forgetAddress = () => {
    try { localStorage.removeItem(ADDRESS_STORAGE_KEY); } catch { /* ignore */ }
    setSavedAddress(false);
    setCustomAddress("");
    setUsingCustom(false);
    const p = DELIVERY_PRESETS[0];
    setDeliveryLabel(p.label); setDeliveryFee(p.fee); setDeliveryEta(p.eta);
  };

  const message =
    `*New Cart Order — E Style Collection* 🛍️\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🧾 *Items*\n` +
    items
      .map((it, i) => `${i + 1}. ${it.name} — Size ${it.size} × ${it.qty}\n   ${formatNaira(it.price)} × ${it.qty} = ${formatNaira(it.price * it.qty)}`)
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

  const canPay = items.length > 0 && customerName.trim() && /\S+@\S+\.\S+/.test(customerEmail);

  const handlePayNow = () => {
    if (!canPay) return;
    // Persist a snapshot so /thank-you can build the receipt after Paystack returns
    const orderRef = `ESC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const snapshot = {
      orderRef,
      createdAt: Date.now(),
      customer: { name: customerName.trim(), email: customerEmail.trim(), phone: customerPhone.trim() },
      items: items.map((it) => ({ id: it.id, name: it.name, size: it.size, qty: it.qty, price: it.price, image: it.image })),
      delivery: { label: deliveryLabel, fee: deliveryFee, eta: deliveryEta },
      subtotal,
      total,
    };
    try {
      localStorage.setItem(PENDING_ORDER_KEY, JSON.stringify(snapshot));
      localStorage.setItem("esc:customer", JSON.stringify(snapshot.customer));
    } catch { /* ignore */ }
    // Open Paystack in a new tab. On return, customer comes back and visits /thank-you
    // (set this as the callback URL in your Paystack page settings: /thank-you)
    window.open(CONTACT.paystackUrl, "_blank", "noopener,noreferrer");
    // Also navigate this tab to thank-you so customer lands on the reference form
    window.location.href = `/thank-you?ref=${encodeURIComponent(orderRef)}`;
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label={`Open cart (${count} items)`}
          className="relative p-2 rounded-full hover:bg-secondary transition-colors"
        >
          <ShoppingCart size={20} />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Your cart ({count})</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground">
            <ShoppingCart size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Your cart is empty.</p>
          </div>
        ) : (
          <>
            {/* Summary at top */}
            <div className="rounded-2xl bg-secondary/40 border border-border/60 p-4 space-y-1.5 text-sm">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Order summary</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatNaira(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground truncate pr-2">Delivery <span className="text-[10px]">({deliveryLabel})</span></span>
                <span className="font-semibold whitespace-nowrap">{deliveryFee === 0 ? "FREE" : formatNaira(deliveryFee)}</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-primary/5 border border-primary/15 px-2.5 py-1.5 mt-1.5">
                <Truck size={12} className="text-primary shrink-0" />
                <Clock size={11} className="text-muted-foreground shrink-0" />
                <span className="text-[11px] text-muted-foreground">Arrives in</span>
                <span className="text-[11px] font-bold text-primary">{deliveryEta}</span>
              </div>
              <div className="flex justify-between pt-2 mt-1 border-t border-border/60">
                <span className="font-display text-base">Grand total</span>
                <span className="font-display text-xl text-primary">{formatNaira(total)}</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto -mx-6 px-6 divide-y divide-border/60">
              {items.map((it) => {
                const key = cartItemKey(it.id, it.size);
                return (
                  <div key={key} className="py-4 flex gap-3">
                    <img src={it.image} alt={it.name} className="h-20 w-16 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{it.name}</p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Size</span>
                        <span className="inline-flex items-center justify-center min-w-[28px] h-5 px-1.5 rounded-md bg-primary/10 text-primary text-[11px] font-bold">
                          {it.size}
                        </span>
                      </div>
                      <p className="text-sm text-primary font-semibold mt-1">{formatNaira(it.price)}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center border border-border rounded-full">
                          <button onClick={() => updateQty(key, it.qty - 1)} className="p-1.5 hover:text-primary" aria-label="Decrease">
                            <Minus size={12} />
                          </button>
                          <span className="text-xs font-semibold w-6 text-center">{it.qty}</span>
                          <button onClick={() => updateQty(key, it.qty + 1)} className="p-1.5 hover:text-primary" aria-label="Increase">
                            <Plus size={12} />
                          </button>
                        </div>
                        <button onClick={() => removeItem(key)} className="ml-auto text-muted-foreground hover:text-destructive" aria-label="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Delivery + customer + checkout */}
            <div className="border-t border-border/60 pt-3 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Delivery zone</p>
                <div className="flex flex-wrap gap-1.5">
                  {DELIVERY_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setDeliveryLabel(p.label); setDeliveryFee(p.fee); setDeliveryEta(p.eta); setUsingCustom(false); }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        !usingCustom && deliveryLabel === p.label ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                      }`}
                      title={p.eta}
                    >
                      {p.label}{p.fee > 0 && ` · ${formatNaira(p.fee)}`}
                    </button>
                  ))}
                </div>

                {/* Custom address */}
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Or enter your address</p>
                    {savedAddress && (
                      <button type="button" onClick={forgetAddress} className="text-[10px] text-muted-foreground hover:text-destructive underline">
                        Forget
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={customAddress}
                      onChange={(e) => setCustomAddress(e.target.value)}
                      placeholder="e.g. 12 Admiralty Way, Lekki Phase 1"
                      className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
                    />
                    <button
                      type="button"
                      onClick={applyCustomAddress}
                      className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90"
                    >
                      Estimate
                    </button>
                  </div>
                  {usingCustom && (
                    <div className="mt-1 text-[11px] text-primary font-semibold space-y-0.5">
                      <p>✓ Estimated fare: {formatNaira(deliveryFee)} ({deliveryLabel.split(" — ")[0]})</p>
                      <p className="flex items-center gap-1 text-muted-foreground font-normal">
                        <Clock size={10} /> Arrives in <span className="font-semibold text-foreground">{deliveryEta}</span>
                        {savedAddress && <span className="ml-auto text-[10px] text-primary">· saved</span>}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer details required for receipts */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Your details (for receipt)</p>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name *"
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                  />
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Phone"
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <input
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  type="email"
                  placeholder="Email * (receipt will be sent here)"
                  className="mt-1.5 w-full rounded-lg border border-border px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <button
                type="button"
                onClick={handlePayNow}
                disabled={!canPay}
                className="btn-primary w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard size={16} /> Pay now · {formatNaira(total)}
              </button>
              {!canPay && items.length > 0 && (
                <p className="text-[11px] text-muted-foreground text-center">Add your name and email to enable payment.</p>
              )}

              <a
                href={whatsappLink(message)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 rounded-full border border-border text-xs font-semibold hover:bg-secondary"
              >
                <MessageCircle size={14} /> Or checkout on WhatsApp
              </a>
              <button
                type="button"
                onClick={clear}
                className="w-full text-xs text-muted-foreground hover:text-destructive"
              >
                Clear cart
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

import { ShoppingCart, MessageCircle, Trash2, Minus, Plus, Sparkles, Copy, Check, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart, cartItemKey } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { whatsappLink } from "@/lib/contact";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const DELIVERY_PRESETS = [
  { label: "Lekki / Ajah", fee: 2500, eta: "Same day – next day" },
  { label: "Lagos Mainland", fee: 3500, eta: "1 – 2 business days" },
  { label: "Other states", fee: 5000, eta: "3 – 5 business days" },
  { label: "Pickup", fee: 0, eta: "Ready in 24 hrs" },
];

const ADDRESS_STORAGE_KEY = "esc:custom-address";

type PromoType = "percent" | "amount" | "freeship";
type Promo = { code: string; type: PromoType; value: number; label: string; minSubtotal?: number; expiresAt?: number };

const PROMO_CODES: Record<string, Omit<Promo, "code">> = {
  WELCOME10: { type: "percent", value: 10, label: "10% off your order" },
  ESTYLE5:   { type: "percent", value: 5,  label: "5% off your order" },
  SAVE2K:    { type: "amount",  value: 2000, label: "₦2,000 off your order", minSubtotal: 10000 },
  FREESHIP:  { type: "freeship", value: 0, label: "Free delivery", minSubtotal: 15000 },
};

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

function generateRandomPromo(): Promo {
  const rolls: Promo[] = [
    { code: `ESC${Math.floor(1000 + Math.random() * 9000)}`, type: "percent", value: 7, label: "7% off your order" },
    { code: `ESC${Math.floor(1000 + Math.random() * 9000)}`, type: "percent", value: 12, label: "12% off your order" },
    { code: `ESC${Math.floor(1000 + Math.random() * 9000)}`, type: "amount", value: 1500, label: "₦1,500 off your order" },
    { code: `ESC${Math.floor(1000 + Math.random() * 9000)}`, type: "amount", value: 3000, label: "₦3,000 off your order" },
    { code: `SHIP${Math.floor(100 + Math.random() * 900)}`, type: "freeship", value: 0, label: "Free delivery" },
  ];
  return rolls[Math.floor(Math.random() * rolls.length)];
}

export function CartDrawer() {
  const { items, count, subtotal, open, setOpen, updateQty, removeItem, clear } = useCart();
  const [deliveryLabel, setDeliveryLabel] = useState("Lekki / Ajah");
  const [deliveryFee, setDeliveryFee] = useState(2500);
  const [deliveryEta, setDeliveryEta] = useState("Same day – next day");
  const [customAddress, setCustomAddress] = useState("");
  const [usingCustom, setUsingCustom] = useState(false);
  const [savedAddress, setSavedAddress] = useState(false);

  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<Promo | null>(null);
  const [promoError, setPromoError] = useState("");
  const [copied, setCopied] = useState(false);

  // Restore saved custom address on mount
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
    } catch { /* ignore */ }
  }, []);

  const { discount, effectiveDelivery, total } = useMemo(() => {
    const d = !promo ? 0
      : promo.type === "percent" ? Math.round((subtotal * promo.value) / 100)
      : promo.type === "amount"  ? Math.min(subtotal, promo.value)
      : 0;
    const ed = promo?.type === "freeship" ? 0 : deliveryFee;
    return { discount: d, effectiveDelivery: ed, total: Math.max(0, subtotal - d) + ed };
  }, [promo, subtotal, deliveryFee]);

  const promoDescriptor = (p: Promo) =>
    p.type === "percent"  ? `${p.value}% off`
  : p.type === "amount"   ? `${formatNaira(p.value)} flat off`
  :                         `Free delivery`;

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) { setPromo(null); setPromoError("Enter a promo code"); return; }
    if (!/^[A-Z0-9]{3,12}$/.test(code)) { setPromo(null); setPromoError("Codes are 3–12 letters/numbers"); return; }
    if (subtotal <= 0) { setPromo(null); setPromoError("Add items to your cart first"); return; }
    const found = PROMO_CODES[code];
    if (!found) { setPromo(null); setPromoError("This code doesn't exist or has expired"); return; }
    if (found.minSubtotal && subtotal < found.minSubtotal) {
      setPromo(null);
      setPromoError(`Spend at least ${formatNaira(found.minSubtotal)} to use ${code}`);
      return;
    }
    if (found.expiresAt && Date.now() > found.expiresAt) {
      setPromo(null); setPromoError("This promo code has expired"); return;
    }
    setPromo({ code, ...found });
    setPromoError("");
  };
  const clearPromo = () => { setPromo(null); setPromoInput(""); setPromoError(""); };

  const handleGenerate = () => {
    const p = generateRandomPromo();
    setPromo(p);
    setPromoInput(p.code);
    setPromoError("");
    setCopied(false);
  };

  const copyPromo = async () => {
    if (!promo) return;
    try { await navigator.clipboard.writeText(promo.code); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  };

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
    (promo
      ? `• Promo code     : ${promo.code} (${promoDescriptor(promo)})\n` +
        `• Discount       : -${formatNaira(discount)}${promo.type === "freeship" ? "  +  free delivery" : ""}\n`
      : "") +
    `• Delivery zone  : ${deliveryLabel}\n` +
    `• ETA            : ${deliveryEta}\n` +
    `• Delivery fee   : ${effectiveDelivery === 0 ? "FREE" : formatNaira(effectiveDelivery)}${promo?.type === "freeship" ? "  (free shipping promo)" : ""}\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*TOTAL: ${formatNaira(total)}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Please confirm availability and final total. Thank you! 💕`;

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

              {promo ? (
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-2.5 py-2 my-1">
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-primary truncate">Promo · {promo.code}</p>
                      <p className="text-[10px] text-muted-foreground">{promo.label} ({promoDescriptor(promo)})</p>
                    </div>
                    <span className="font-semibold text-primary whitespace-nowrap">
                      {discount > 0 ? `−${formatNaira(discount)}` : promo.type === "freeship" ? "Free ship" : "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-muted-foreground">—</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-muted-foreground truncate pr-2">Delivery <span className="text-[10px]">({deliveryLabel})</span></span>
                <span className="font-semibold whitespace-nowrap">{effectiveDelivery === 0 ? "FREE" : formatNaira(effectiveDelivery)}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground -mt-0.5">
                <Clock size={10} /> ETA: <span className="font-semibold text-foreground">{deliveryEta}</span>
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

            {/* Delivery + promo controls */}
            <div className="border-t border-border/60 pt-3 space-y-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Delivery zone</p>
                <div className="flex flex-wrap gap-1.5">
                  {DELIVERY_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setDeliveryLabel(p.label); setDeliveryFee(p.fee); setUsingCustom(false); }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        !usingCustom && deliveryLabel === p.label ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                      }`}
                    >
                      {p.label}{p.fee > 0 && ` · ${formatNaira(p.fee)}`}
                    </button>
                  ))}
                </div>

                {/* Custom address */}
                <div className="mt-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Or enter your address</p>
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
                    <p className="mt-1 text-[11px] text-primary font-semibold">
                      ✓ Estimated fare: {formatNaira(deliveryFee)} ({deliveryLabel.split(" — ")[0]})
                    </p>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Promo code</p>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-primary font-semibold hover:underline"
                  >
                    <Sparkles size={11} /> Generate
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    value={promoInput}
                    onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(""); }}
                    placeholder="e.g. WELCOME10"
                    className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs uppercase tracking-wider focus:outline-none focus:border-primary"
                  />
                  {promo ? (
                    <button type="button" onClick={clearPromo} className="px-3 py-1.5 rounded-lg border border-border text-[11px] font-semibold hover:bg-secondary">
                      Remove
                    </button>
                  ) : (
                    <button type="button" onClick={applyPromo} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:bg-primary/90">
                      Apply
                    </button>
                  )}
                </div>
                {promoError && <p className="mt-1 text-[11px] text-destructive">{promoError}</p>}
                {promo && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="text-primary font-semibold">✓ {promo.code} · {promoDescriptor(promo)}</span>
                    <button type="button" onClick={copyPromo} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                      {copied ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                )}
              </div>

              <a
                href={whatsappLink(message)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full justify-center"
              >
                <MessageCircle size={16} /> Checkout on WhatsApp · {formatNaira(total)}
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

import { ShoppingCart, MessageCircle, Trash2, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useCart, cartItemKey } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { whatsappLink } from "@/lib/contact";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const DELIVERY_PRESETS = [
  { label: "Lekki / Ajah", fee: 2500 },
  { label: "Lagos Mainland", fee: 3500 },
  { label: "Other states", fee: 5000 },
  { label: "Pickup", fee: 0 },
];

const PROMO_CODES: Record<string, { type: "percent" | "amount" | "freeship"; value: number; label: string }> = {
  WELCOME10: { type: "percent", value: 10, label: "10% off" },
  ESTYLE5: { type: "percent", value: 5, label: "5% off" },
  SAVE2K: { type: "amount", value: 2000, label: "₦2,000 off" },
  FREESHIP: { type: "freeship", value: 0, label: "Free delivery" },
};

export function CartDrawer() {
  const { items, count, subtotal, open, setOpen, updateQty, removeItem, clear } = useCart();
  const [deliveryLabel, setDeliveryLabel] = useState("Lekki / Ajah");
  const [deliveryFee, setDeliveryFee] = useState(2500);
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; type: "percent" | "amount" | "freeship"; value: number } | null>(null);
  const [promoError, setPromoError] = useState("");

  const { discount, effectiveDelivery, total } = useMemo(() => {
    const d = !promo ? 0
      : promo.type === "percent" ? Math.round((subtotal * promo.value) / 100)
      : promo.type === "amount" ? Math.min(subtotal, promo.value)
      : 0;
    const ed = promo?.type === "freeship" ? 0 : deliveryFee;
    return { discount: d, effectiveDelivery: ed, total: Math.max(0, subtotal - d) + ed };
  }, [promo, subtotal, deliveryFee]);

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (!code) { setPromo(null); setPromoError(""); return; }
    const found = PROMO_CODES[code];
    if (!found) { setPromo(null); setPromoError("Invalid promo code"); return; }
    setPromo({ code, type: found.type, value: found.value });
    setPromoError("");
  };
  const clearPromo = () => { setPromo(null); setPromoInput(""); setPromoError(""); };

  const message =
    `*New Cart Order — E Style Collection* 🛍️\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🧾 *Items*\n` +
    items
      .map((it, i) => `${i + 1}. ${it.name} — Size ${it.size} × ${it.qty}\n   ${formatNaira(it.price)} × ${it.qty} = ${formatNaira(it.price * it.qty)}`)
      .join("\n") +
    `\n\n💰 *Price Breakdown*\n` +
    `• Subtotal      : ${formatNaira(subtotal)}\n` +
    (promo ? `• Promo (${promo.code}) : -${formatNaira(discount)}${promo.type === "freeship" ? " (free delivery)" : ""}\n` : "") +
    `• Delivery zone : ${deliveryLabel}${promo?.type === "freeship" ? " (free shipping promo)" : ""}\n` +
    `• Delivery fee  : ${effectiveDelivery === 0 ? "FREE" : formatNaira(effectiveDelivery)}\n` +
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount {promo ? `(${promo.code})` : ""}</span>
                <span className={`font-semibold ${discount > 0 ? "text-primary" : ""}`}>
                  {discount > 0 ? `−${formatNaira(discount)}` : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery <span className="text-[10px]">({deliveryLabel})</span></span>
                <span className="font-semibold">{effectiveDelivery === 0 ? "FREE" : formatNaira(effectiveDelivery)}</span>
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
                      onClick={() => { setDeliveryLabel(p.label); setDeliveryFee(p.fee); }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${
                        deliveryLabel === p.label ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                      }`}
                    >
                      {p.label}{p.fee > 0 && ` · ${formatNaira(p.fee)}`}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Promo code</p>
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
                {promo && <p className="mt-1 text-[11px] text-primary font-semibold">✓ {promo.code} applied</p>}
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

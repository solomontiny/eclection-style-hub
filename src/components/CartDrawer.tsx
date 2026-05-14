import { ShoppingCart, MessageCircle, Trash2, Minus, Plus } from "lucide-react";
import { useCart, cartItemKey } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { whatsappLink } from "@/lib/contact";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export function CartDrawer() {
  const { items, count, subtotal, open, setOpen, updateQty, removeItem, clear } = useCart();

  const message =
    `*New Cart Order — E Style Collection* 🛍️\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `🧾 *Items*\n` +
    items
      .map(
        (it, i) =>
          `${i + 1}. ${it.name} — Size ${it.size} × ${it.qty}\n   ${formatNaira(it.price)} × ${it.qty} = ${formatNaira(it.price * it.qty)}`,
      )
      .join("\n") +
    `\n\n💰 *Subtotal:* ${formatNaira(subtotal)}\n` +
    `(Delivery fee will be confirmed based on your address)\n\n` +
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
            <div className="flex-1 overflow-y-auto -mx-6 px-6 divide-y divide-border/60">
              {items.map((it) => {
                const key = cartItemKey(it.id, it.size);
                return (
                  <div key={key} className="py-4 flex gap-3">
                    <img src={it.image} alt={it.name} className="h-20 w-16 object-cover rounded-lg" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{it.name}</p>
                      <p className="text-xs text-muted-foreground">Size {it.size}</p>
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

            <div className="border-t border-border/60 pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-display text-xl text-primary">{formatNaira(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">Delivery confirmed on WhatsApp.</p>
              <a
                href={whatsappLink(message)}
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full justify-center"
              >
                <MessageCircle size={16} /> Checkout on WhatsApp
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

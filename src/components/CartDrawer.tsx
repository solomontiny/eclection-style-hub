import { ShoppingCart } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Minus, Plus, Trash2 } from "lucide-react";
import { cartItemKey } from "@/lib/cart";

export function CartDrawer() {
  const { items, count, subtotal, open, setOpen, updateQty, removeItem } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    setOpen(false);
    navigate({ to: "/checkout" });
  };

  // Group items by bundleId if present
  const groupedItems = items.reduce((acc, item) => {
    if (item.bundleId) {
        if (!acc.bundles[item.bundleId]) acc.bundles[item.bundleId] = [];
        acc.bundles[item.bundleId].push(item);
    } else {
        acc.others.push(item);
    }
    return acc;
  }, { bundles: {} as Record<string, typeof items>, others: [] as typeof items });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button type="button" className="relative p-2 rounded-full text-primary">
          <ShoppingCart size={20} />
          {count > 0 && (
            <span className="absolute top-0 right-0 h-4 w-4 bg-accent text-accent-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
              {count}
            </span>
          )}
        </button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary font-display">Your cart ({count})</SheetTitle>
        </SheetHeader>

        <div className="p-4 space-y-4 pb-10">
          {items.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</div>
          ) : (
            <div className="space-y-6">
              {/* Grouped Bundles */}
              {Object.entries(groupedItems.bundles).map(([bundleId, bundleItems]) => (
                <div key={bundleId} className="border p-3 rounded-lg bg-secondary/20">
                    <p className="text-xs font-bold text-primary mb-2">BUNDLE: {bundleId.slice(-6)}</p>
                    {bundleItems.map(item => (
                        <div key={cartItemKey(item.id, item.size, item.color, item.bundleId)} className="flex gap-2 py-1 text-sm">
                            <span>{item.qty}x</span>
                            <span className="flex-1 truncate">{item.name} ({item.color})</span>
                            <button type="button" onClick={() => removeItem(cartItemKey(item.id, item.size, item.color, item.bundleId))} className="text-destructive"><Trash2 size={14}/></button>
                        </div>
                    ))}
                    <div className="mt-2 text-sm font-semibold text-primary pt-2 border-t border-primary/10 flex justify-between">
                        <span>Bundle Total</span>
                        <span>{formatNaira(bundleItems.reduce((s, i) => s + i.price * i.qty, 0))}</span>
                    </div>
                </div>
              ))}

              {/* Individual Items */}
              {groupedItems.others.map((item) => (
                <div key={cartItemKey(item.id, item.size, item.color, item.bundleId)} className="flex gap-3 border-b pb-3">
                  <div className="h-16 w-14 rounded-lg bg-muted overflow-hidden">
                    {item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.color} · Size {item.size}</p>
                    <p className="text-sm font-semibold text-primary">{formatNaira(item.price)} x {item.qty} = {formatNaira(item.price * item.qty)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => updateQty(cartItemKey(item.id, item.size, item.color, item.bundleId), item.qty - 1)} className="rounded border p-1"><Minus size={12} /></button>
                      <span className="w-8 text-center text-xs">{item.qty}</span>
                      <button type="button" onClick={() => updateQty(cartItemKey(item.id, item.size, item.color, item.bundleId), item.qty + 1)} className="rounded border p-1"><Plus size={12} /></button>
                      <button type="button" onClick={() => removeItem(cartItemKey(item.id, item.size, item.color, item.bundleId))} className="ml-auto p-1 text-destructive"><Trash2 size={14} /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="pt-4 border-t border-primary/20">
            <div className="flex justify-between items-center font-semibold text-primary">
              <span>Subtotal</span>
              <span>{formatNaira(subtotal)}</span>
            </div>
            <button
              disabled={items.length === 0}
              onClick={handleCheckout}
              className="w-full mt-4 bg-primary text-primary-foreground py-3 rounded-full font-semibold hover:bg-primary/90 transition-colors"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
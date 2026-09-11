import {
  ShoppingCart,
} from "lucide-react";
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
          {items.length === 0 ? <div className="py-10 text-center text-sm text-muted-foreground">Your cart is empty.</div> : <div className="space-y-3">{items.map((item) => <div key={cartItemKey(item.id, item.size)} className="flex gap-3 border-b border-border pb-3"><div className="h-16 w-14 rounded-lg bg-muted overflow-hidden">{item.image && <img src={item.image} alt="" className="h-full w-full object-cover" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="text-xs text-muted-foreground">{formatNaira(item.price)} · Size {item.size}</p><div className="mt-2 flex items-center gap-2"><button type="button" onClick={() => updateQty(cartItemKey(item.id, item.size), item.qty - 1)} className="rounded border p-1"><Minus size={12} /></button><span className="w-5 text-center text-xs">{item.qty}</span><button type="button" onClick={() => updateQty(cartItemKey(item.id, item.size), item.qty + 1)} className="rounded border p-1"><Plus size={12} /></button><button type="button" onClick={() => removeItem(cartItemKey(item.id, item.size))} className="ml-auto p-1 text-destructive"><Trash2 size={14} /></button></div></div></div>)}</div>}
          <p className="text-sm text-muted-foreground">
            Subtotal: {formatNaira(subtotal)}
          </p>

          <button
            disabled={items.length === 0}
            onClick={handleCheckout}
            className="w-full bg-black text-white py-2 rounded-lg disabled:opacity-50"
          >
            Checkout
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
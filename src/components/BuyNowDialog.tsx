import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { type Product, formatNaira } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { colorToCss } from "@/lib/colors";

export function BuyNowDialog({ product, trigger, preselectedColor }: { product: Product; trigger: React.ReactNode; preselectedColor?: string }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("M");
  const [color, setColor] = useState<string>(preselectedColor ?? product.colors?.[0] ?? "");
  const { addItem } = useCart();
  const navigate = useNavigate();
  
  const unitPrice = product.sale_price ?? product.price;
  const total = unitPrice * qty;

  const handlePayNow = () => {
    addItem(product, size, color || undefined, qty);
    setOpen(false);
    navigate({ to: "/checkout" });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4">
          <img src={product.images?.[0] ?? ""} alt={product.name} className="h-28 w-24 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category ?? "Uncategorized"}</p>
            <p className="mt-1 font-semibold text-primary">{formatNaira(unitPrice)}</p>
            <div className="mt-3">
              <p className="text-xs font-medium mb-1.5">Size</p>
              <div className="flex gap-1.5">
                {["S", "M", "L", "XL"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    className={`h-8 w-8 rounded-full text-xs font-medium border transition-colors ${
                      size === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>
            <div className="mt-1 flex items-center gap-3">
              <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:border-primary"><Minus size={14} /></button>
              <span className="font-semibold w-6 text-center">{qty}</span>
              <button type="button" onClick={() => setQty(qty + 1)} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:border-primary"><Plus size={14} /></button>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-display text-2xl text-primary">{formatNaira(total)}</p>
          </div>
        </div>

        {product.colors && product.colors.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-medium mb-1.5">Colour</p>
            <div className="flex gap-1.5" role="radiogroup" aria-label="Select colour">
              {product.colors.map((c: string) => (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={color === c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    color === c
                      ? "ring-2 ring-primary ring-offset-1 ring-offset-background border-primary"
                      : "border-border hover:border-primary"
                  }`}
                  style={{ backgroundColor: colorToCss(c) }}
                  aria-label={`Select colour ${c}`}
                >
                  {color === c && <span className="w-2 h-2 rounded-full bg-white/70" />}
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <button type="button" onClick={handlePayNow} className="btn-primary w-full justify-center">
            <ShoppingBag size={16} /> Pay now
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

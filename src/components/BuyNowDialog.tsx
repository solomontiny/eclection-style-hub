import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { type Product, formatNaira } from "@/lib/products";
import { whatsappLink } from "@/lib/contact";

export function BuyNowDialog({ product, trigger }: { product: Product; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("M");
  const total = product.price * qty;

  const message =
    `*New Order — E Style Collection* 🛍️\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Hi E Style Collection 👋\n` +
    `I'd like to place the following order:\n\n` +
    `🧾 *Order Details*\n` +
    `• Product   : ${product.name}\n` +
    `• Category  : ${product.category ?? "Uncategorized"}\n` +
    `• Size      : ${size}\n` +
    `• Quantity  : ${qty}\n\n` +
    `💰 *Price Breakdown*\n` +
    `• Unit price : ${formatNaira(product.price)}\n` +
    `• Quantity   : x${qty}\n` +
    `• Subtotal   : ${formatNaira(total)}\n\n` +
    `━━━━━━━━━━━━━━━━━━\n` +
    `*TOTAL: ${formatNaira(total)}*\n` +
    `━━━━━━━━━━━━━━━━━━\n\n` +
    `Please confirm availability and delivery details. Thank you! 💕`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="flex gap-4">
          <img src={product.image ?? product.image_url ?? ""} alt={product.name} className="h-28 w-24 rounded-xl object-cover" />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category ?? "Uncategorized"}</p>
            <p className="mt-1 font-semibold text-primary">{formatNaira(product.price)}</p>
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
        <DialogFooter>
          <a
            href={whatsappLink(message)}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="btn-primary w-full justify-center"
          >
            <ShoppingBag size={16} /> Checkout on WhatsApp
          </a>
        </DialogFooter>
        <p className="text-xs text-muted-foreground text-center">You'll be redirected to WhatsApp to confirm and pay via bank transfer.</p>
      </DialogContent>
    </Dialog>
  );
}

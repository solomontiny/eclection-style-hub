import { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Minus, Plus, ShoppingBag, Eye } from "lucide-react";
import { type Product, formatNaira } from "@/lib/products";
import { useCart } from "@/lib/cart";
import { colorToCss } from "@/lib/colors";
import { SizeChartDialog } from "@/components/SizeChartDialog";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];

export function QuickViewModal({ product, isOpen, onClose }: { product: Product | null; isOpen: boolean; onClose: () => void }) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("M");
  const [color, setColor] = useState<string | undefined>();
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (product) {
      setQty(1);
      setSize(product.sizes?.[0] ?? "M");
      setColor(product.colors?.[0] ?? undefined);
      setSelectedImage(0);
    }
  }, [product]);

  if (!product) return null;

  const sizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const images = product.images && product.images.length ? product.images : [product.image_url, product.image].filter(Boolean) as string[];
  const colorImages = product.color_images ?? {};
  const colorSpecificImage = color ? colorImages[color] : null;
  const primaryImage = colorSpecificImage ?? images[selectedImage] ?? "";
  const unitPrice = product.sale_price ?? product.price;
  const total = unitPrice * qty;
  const isOutOfStock = product.stock <= 0;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(product, size, color, qty);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{product.name}</DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-6 mt-2">
          <div className="space-y-3">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-muted">
              {primaryImage ? (
                <img src={primaryImage} alt={product.name} className="h-full w-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="h-full w-full grid place-items-center text-xs text-muted-foreground">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button key={idx} type="button" onClick={() => setSelectedImage(idx)} className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 ${selectedImage === idx ? "border-primary" : "border-border"}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary font-bold">{product.category ?? "Collection"}</p>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="font-display text-3xl">{formatNaira(unitPrice)}</span>
                {product.sale_price != null && <span className="text-sm text-muted-foreground line-through">{formatNaira(product.price)}</span>}
              </div>
              <p className="mt-4 text-sm text-muted-foreground line-clamp-3">{product.description || "A wonderful curated piece from Supplier Affordable."}</p>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Size</p>
                  <SizeChartDialog
                    selectedSize={size}
                    onSelectSize={setSize}
                    closeOnSelect={true}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button key={s} type="button" onClick={() => setSize(s)} className={`w-10 h-10 rounded-lg text-xs font-bold border transition-all ${size === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {product.colors && product.colors.length > 0 && (
                <div className="mt-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Colour {color && `— ${color}`}</p>
                  <div className="flex gap-2 flex-wrap">
                    {product.colors.map((c) => (
                      <button key={c} type="button" onClick={() => setColor(c)} className={`w-9 h-9 rounded-full border-2 transition-all ${color === c ? "border-primary ring-2 ring-primary ring-offset-2" : "border-border"}`} style={{ backgroundColor: colorToCss(c) }} aria-label={c} />
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Quantity</p>
                  <div className="mt-1 flex items-center gap-2">
                    <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:border-primary"><Minus size={14} /></button>
                    <span className="font-semibold w-6 text-center">{qty}</span>
                    <button type="button" onClick={() => setQty(qty + 1)} className="h-8 w-8 rounded-full border border-border flex items-center justify-center hover:border-primary"><Plus size={14} /></button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-display text-xl text-primary font-bold">{formatNaira(total)}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-3 pt-4 border-t border-border">
              <button type="button" onClick={handleAddToCart} disabled={isOutOfStock} className="btn-primary w-full justify-center !py-3">
                <ShoppingBag size={16} /> {isOutOfStock ? "Out of stock" : "Add to cart"}
              </button>
              <Link to="/product/$slug" params={{ slug: product.slug }} onClick={onClose} className="btn-outline w-full justify-center !py-3 text-center block">
                View full product page
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

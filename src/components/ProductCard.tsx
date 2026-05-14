import { type Product, formatNaira } from "@/lib/products";
import { ShoppingBag, Plus, Check } from "lucide-react";
import { useState } from "react";
import { BuyNowDialog } from "./BuyNowDialog";
import { useCart } from "@/lib/cart";

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState<string>("M");
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    addItem(product, size, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  return (
    <div className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        <img
          src={product.image}
          alt={product.name}
          width={800}
          height={1000}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {product.tag && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-background/90 text-primary backdrop-blur">
            {product.tag}
          </span>
        )}
        <BuyNowDialog
          product={product}
          trigger={
            <button
              type="button"
              className="absolute bottom-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity btn-primary !py-2 !px-3 text-xs"
              aria-label={`Buy ${product.name}`}
            >
              <ShoppingBag size={14} /> Buy now
            </button>
          }
        />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category}</p>
          <h3 className="font-display text-lg mt-0.5">{product.name}</h3>
        </div>
        <p className="font-semibold text-primary whitespace-nowrap">{formatNaira(product.price)}</p>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-1" role="radiogroup" aria-label={`Select size for ${product.name}`}>
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              onClick={() => setSize(s)}
              className={`flex-1 text-[11px] font-semibold py-1.5 rounded-md border transition-colors ${
                size === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-foreground/70 hover:border-primary hover:text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-full border border-primary/30 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
          aria-label={`Add ${product.name} size ${size} to cart`}
        >
          {justAdded ? (
            <><Check size={14} /> Added · Size {size}</>
          ) : (
            <><Plus size={14} /> Add to cart · Size {size}</>
          )}
        </button>
      </div>
    </div>
  );
}

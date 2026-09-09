import { type Product, formatNaira } from "@/lib/products";
import { ShoppingBag, Plus, Check } from "lucide-react";
import { useState } from "react";
import { BuyNowDialog } from "./BuyNowDialog";
import { useCart } from "@/lib/cart";
import { Link } from "@tanstack/react-router";

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

  // Badge logic
  const isNew = new Date(product.created_at).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 7; // 7 days
  const isSale = product.sale_price && product.sale_price < product.price;
  const isBundle = product.product_type === 'bundle';
  const isFeatured = product.featured;

  const badges = [
    isNew && { label: "NEW", className: "bg-blue-600" },
    isBundle && { label: "BUNDLE", className: "bg-purple-600" },
    isSale && { label: "SALE", className: "bg-red-600" },
    isFeatured && { label: "FEATURED", className: "bg-amber-500" },
  ].filter(Boolean) as { label: string; className: string }[];

  return (
    <div className="group">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
        <Link to="/product/$slug" params={{ slug: product.slug }} aria-label={`View ${product.name}`}>
          <img
          src={product.image ?? product.image_url ?? undefined}
          alt={product.name}
          width={800}
          height={1000}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
          {!product.image && !product.image_url && <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">No image</div>}
        </Link>
        {product.stock <= 0 && (
          <span className="absolute top-3 left-3 px-3 py-1 text-xs font-semibold rounded-full bg-red-500/90 text-white backdrop-blur">OUT OF STOCK</span>
        )}
        
        {/* Intelligent Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {badges.slice(0, 2).map((b, i) => (
             <span key={i} className={`px-3 py-1 text-[10px] font-bold rounded-full text-white backdrop-blur ${b.className}`}>{b.label}</span>
          ))}
        </div>

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
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category ?? "Uncategorized"}</p>
          <Link to="/product/$slug" params={{ slug: product.slug }} className="font-display text-lg mt-0.5 hover:text-primary">{product.name}</Link>
        </div>
        <div className="text-right">
          <p className="font-semibold text-primary whitespace-nowrap">{formatNaira(product.sale_price ?? product.price)}</p>
          {isSale && (
            <p className="text-xs text-muted-foreground line-through">{formatNaira(product.price)}</p>
          )}
        </div>
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

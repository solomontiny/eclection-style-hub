import { type Product, formatNaira } from "@/lib/products";
import { colorToCss } from "@/lib/colors";
import { ShoppingBag, Plus, Check, Eye } from "lucide-react";
import { useState } from "react";
import { BuyNowDialog } from "./BuyNowDialog";
import { useCart } from "@/lib/cart";
import { Link } from "@tanstack/react-router";

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"] as const;

export function ProductCard({ product, onQuickPreview }: { product: Product; onQuickPreview?: (product: Product) => void }) {
  const { addItem } = useCart();
  const sizes = product.sizes?.length ? product.sizes : [...DEFAULT_SIZES];
  const [size, setSize] = useState<string>(sizes[1] ?? "M");
  const [color, setColor] = useState<string | undefined>(product.colors?.[0]);
  const [justAdded, setJustAdded] = useState(false);
  const isOutOfStock = product.stock <= 0;
  const lowStockThreshold = product.low_stock_threshold ?? 5;
  const isLowStock = !isOutOfStock && product.stock <= lowStockThreshold;
  const isNew = new Date(product.created_at).getTime() > Date.now() - 1000 * 60 * 60 * 24 * 7;
  const isSale = product.sale_price != null && product.sale_price < product.price;
  const isBundle = product.product_type === "bundle";
  const isFeatured = product.featured;
  const selectedImage = product.color_images?.[color ?? ""] ?? product.images?.[0] ?? product.image_url ?? product.image ?? null;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addItem(product, size, color, 1, false, undefined);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const badges = [
    isOutOfStock && { label: "OUT OF STOCK", className: "bg-muted text-muted-foreground" },
    isLowStock && { label: "LOW STOCK", className: "bg-amber-500" },
    isNew && { label: "NEW", className: "bg-blue-600" },
    isBundle && { label: "BUNDLE", className: "bg-purple-600" },
    isSale && { label: "SALE", className: "bg-red-600" },
    isFeatured && { label: "FEATURED", className: "bg-amber-500" },
  ].filter(Boolean) as { label: string; className: string }[];

  return (
    <div className="group transition-all duration-300 hover:-translate-y-1">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-muted shadow-sm group-hover:shadow-xl transition-shadow duration-300">
        <Link to="/product/$slug" params={{ slug: product.slug }} aria-label={`View ${product.name}`}>
          <img
          src={selectedImage ?? undefined}
          alt={product.name}
          width={800}
          height={1000}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
          {(!selectedImage) && <div className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">No image</div>}
        </Link>
        <div className="absolute top-3 left-3 flex flex-col gap-2">
          {badges.slice(0, 2).map((b, i) => (
             <span key={i} className={`px-3 py-1 text-[10px] font-bold rounded-full text-white backdrop-blur ${b.className}`}>{b.label}</span>
          ))}
        </div>
        {onQuickPreview && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onQuickPreview(product); }}
            className="absolute top-3 right-3 h-9 w-9 rounded-full bg-background/80 backdrop-blur border border-border/60 flex items-center justify-center text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm"
            aria-label={`Quick view ${product.name}`}
            title="Quick view"
          >
            <Eye size={15} />
          </button>
        )}

        <BuyNowDialog
          product={product}
          preselectedColor={color}
          trigger={
            <button
              type="button"
              className={`absolute bottom-3 right-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity btn-primary !py-2 !px-3 text-xs ${isOutOfStock ? "pointer-events-none opacity-60" : ""}`}
              aria-label={`Buy ${product.name}`}
              disabled={isOutOfStock}
            >
              <ShoppingBag size={14} /> Buy now
            </button>
          }
        />
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-xs uppercase tracking-widest text-muted-foreground truncate">{product.category ?? "Uncategorized"}</p>
          <Link to="/product/$slug" params={{ slug: product.slug }} className="font-display text-sm sm:text-base mt-0.5 hover:text-primary block leading-tight truncate">{product.name}</Link>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm sm:font-semibold text-primary whitespace-nowrap">{formatNaira(product.sale_price ?? product.price)}</p>
          {isSale && (
            <p className="text-[10px] sm:text-xs text-muted-foreground line-through whitespace-nowrap">{formatNaira(product.price)}</p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center gap-1" role="radiogroup" aria-label={`Select size for ${product.name}`}>
          {sizes.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              onClick={() => setSize(s)}
              disabled={isOutOfStock}
              className={`min-h-9 flex-1 text-[11px] font-semibold py-1.5 rounded-md border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                size === s
                  ? "bg-accent/10 text-accent border-accent/40"
                  : "border-border text-foreground/70 hover:border-primary/50 hover:text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1" role="radiogroup" aria-label={`Select colour for ${product.name}`}>
            {product.colors.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={color === c}
              onClick={() => setColor(c)}
              disabled={isOutOfStock}
              className={`w-6 h-6 rounded-full border transition-all relative disabled:cursor-not-allowed disabled:opacity-50 ${
                  color === c ? "ring-1 ring-accent ring-offset-1" : "border-border"
                }`}
                style={{ backgroundColor: colorToCss(c) }}
                aria-label={`Select colour ${c}`}
              >
                {color === c && <span className="absolute inset-0 rounded-full ring-1 ring-primary" />}
              </button>
            ))}
          </div>
        )}
        {color && (
          <p className="text-xs text-muted-foreground mt-1">Colour: {color}</p>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-full border text-xs font-semibold transition-colors ${
            isOutOfStock
              ? "cursor-not-allowed border-border bg-muted/40 text-muted-foreground"
              : "border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40"
          }`}
          aria-label={`Add ${product.name} size ${size} ${color ? `colour ${color}` : ""} to cart`}
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

import { type Product, formatNaira } from "@/lib/products";
import { ShoppingBag, Plus } from "lucide-react";
import { BuyNowDialog } from "./BuyNowDialog";
import { useCart } from "@/lib/cart";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
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
        <div className="absolute bottom-3 right-3 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => addItem(product, "M", 1)}
            className="rounded-full bg-background/95 text-foreground hover:bg-primary hover:text-primary-foreground p-2 shadow-sm transition-colors"
            aria-label={`Add ${product.name} to cart`}
            title="Add to cart"
          >
            <Plus size={14} />
          </button>
          <BuyNowDialog
            product={product}
            trigger={
              <button
                type="button"
                className="btn-primary !py-2 !px-3 text-xs"
                aria-label={`Buy ${product.name}`}
              >
                <ShoppingBag size={14} /> Buy now
              </button>
            }
          />
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{product.category}</p>
          <h3 className="font-display text-lg mt-0.5">{product.name}</h3>
        </div>
        <p className="font-semibold text-primary whitespace-nowrap">{formatNaira(product.price)}</p>
      </div>
    </div>
  );
}

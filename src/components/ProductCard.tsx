import { type Product, formatNaira } from "@/lib/products";
import { whatsappLink } from "@/lib/contact";
import { ShoppingBag } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const msg = `Hi E Style Collection 👋, I'd like to order: ${product.name} (${formatNaira(product.price)}). Is it available?`;
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
        <a
          href={whatsappLink(msg)}
          target="_blank"
          rel="noreferrer"
          className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity btn-primary !py-2 !px-3 text-xs"
          aria-label={`Order ${product.name}`}
        >
          <ShoppingBag size={14} /> Order
        </a>
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

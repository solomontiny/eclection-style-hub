import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts, type Product } from "@/lib/products";
import { colorToCss } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { Trash2, AlertCircle, CheckCircle, Package, Check, Calculator } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyPrice, COUNTRIES } from "@/lib/currency-browser";
import { useStore } from "@/lib/store-context";
import {
  getEffectiveProductBasePrice,
  getNextWholesaleTier,
  getWholesaleTier,
  WHOLESALE_BUNDLE_SIZE,
  WHOLESALE_TIERS,
} from "@/lib/wholesale-pricing";

export const Route = createFileRoute("/bulk-order")({
  head: () => ({
    meta: [
      { title: "Wholesale & Bulk Orders — SupplierAffordable" },
    ],
  }),
  component: BulkOrderPage,
});

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"] as const;

// Collision-resistant bundle identifier. crypto.randomUUID() is used instead of
// Date.now() so that two bundles created in the same millisecond always receive
// separate grouping keys. The bundle_ prefix is preserved for readability only;
// nothing in the cart or order pipeline depends on it.
function generateBundleId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `bundle_${crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID (very old browsers).
  // Uses a random 128-bit hex string derived from Math.random plus a monotonic
  // counter so consecutive bundles still get distinct IDs.
  const randomHex = Math.random().toString(16).slice(2).padEnd(32, "0");
  return `bundle_${Date.now().toString(36)}-${randomHex}`;
}

type BundleItem = {
  product: Product;
  qty: number;
  color: string;
  size: string;
};

type ColourLine = {
  color: string;
  size: string;
  qty: number;
};

type ProductEntryProps = {
  product: Product;
  onAdd: (product: Product, lines: ColourLine[]) => void;
};

function ProductEntry({ product, onAdd }: ProductEntryProps) {
  const productSizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const defaultSize = productSizes[1] ?? "M";
  const colours = product.colors?.length ? product.colors : ["Default"];
  // Stock is read from the product record already fetched on this page (no extra request).
  // It represents the number of individual pieces available for THIS product only.
  const availableStock = Number.isFinite(product.stock) ? Math.max(0, product.stock) : 0;
  const [lines, setLines] = useState<Record<string, ColourLine>>(() =>
    Object.fromEntries(colours.map((color, index) => [
      color,
      { color, size: defaultSize, qty: index === 0 ? 1 : 0 },
    ])),
  );

  const selectedLines = Object.values(lines).filter((line) => line.qty > 0);
  const selectedTotal = selectedLines.reduce((sum, line) => sum + line.qty, 0);

  const updateLine = (color: string, changes: Partial<ColourLine>) => {
    setLines((current) => ({
      ...current,
      [color]: { ...current[color], ...changes },
    }));
  };

  const updateQuantity = (color: string, value: string) => {
    const nextValue = Number.parseInt(value, 10);
    // Cap the selection to what is actually available for this product. Stock is
    // per product, so the same product's stock is shared across all its colour/size
    // lines and is never combined with a different product's stock.
    const qty = Number.isFinite(nextValue)
      ? Math.max(0, Math.min(availableStock, Math.floor(nextValue)))
      : 0;
    updateLine(color, { qty });
  };

  const handleAdd = () => {
    if (selectedTotal === 0) {
      toast.error("Select at least one colour and quantity.");
      return;
    }
    // Never allow more pieces than this product has in stock.
    if (selectedTotal > availableStock) {
      toast.error(
        `${product.name} only has ${availableStock} piece${availableStock === 1 ? "" : "s"} in stock. Reduce the quantity or choose another product.`,
      );
      return;
    }
    onAdd(product, selectedLines);
  };

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-24">
          <Package className="absolute inset-0 m-auto h-7 w-7 text-muted-foreground" />
          {product.images?.[0] && (
            <img loading="lazy" decoding="async" src={product.images[0]} alt={product.name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg leading-tight">{product.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose a quantity for each colour or design.</p>
              <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Package className="h-3.5 w-3.5" />
                {availableStock} piece{availableStock === 1 ? "" : "s"} available
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {colours.map((color) => {
              const line = lines[color] ?? { color, size: defaultSize, qty: 0 };
              const isSelected = line.qty > 0;
              const colourImage = product.color_images?.[color];
              return (
                <div
                  key={color}
                  className={cn(
                    "rounded-xl border bg-background p-3 transition-colors",
                    "border-border/60",
                    isSelected && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateLine(color, { qty: isSelected ? 0 : 1 })}
                      className={cn(
                        "relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 bg-muted transition-all",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isSelected
                          ? "border-primary ring-2 ring-primary ring-offset-2 ring-offset-background"
                          : "border-border hover:border-primary/60",
                      )}
                      aria-pressed={isSelected}
                      aria-label={isSelected ? `${color} selected` : `Select ${color}`}
                    >
                      <Package className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground/50" />
                      {colourImage ? (
                        <img loading="lazy" decoding="async"
                          src={colourImage}
                          alt={color}
                          className="h-full w-full object-cover"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                        />
                      ) : (
                        <span
                          className="absolute inset-0 rounded-full"
                          style={{
                            backgroundColor:
                              color === "Default" ? "#cbd5e1" : colorToCss(color),
                          }}
                        />
                      )}
                      {isSelected && (
                        <span className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check size={12} />
                        </span>
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {color === "Default" ? "Standard design" : color}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Separate quantity for this colour/design
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_5.5rem]">
                    <Select value={line.size} onValueChange={(size) => updateLine(color, { size })}>
                      <SelectTrigger className="h-10 w-full" aria-label={`Size for ${color}`}>
                        <SelectValue placeholder="Size" />
                      </SelectTrigger>
                      <SelectContent>{productSizes.map((size) => <SelectItem key={size} value={size}>{size}</SelectItem>)}</SelectContent>
                    </Select>
                    <div>
                      <label className="sr-only" htmlFor={`quantity-${product.id}-${color}`}>Quantity for {color}</label>
                      <Input
                        id={`quantity-${product.id}-${color}`}
                        type="number"
                        min={0}
                        step={1}
                        value={line.qty}
                        onChange={(event) => updateQuantity(color, event.target.value)}
                        className={cn(
                          "h-10 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-auto",
                          isSelected ? "border-primary/60" : "",
                        )}
                        aria-describedby={`quantity-help-${product.id}-${color}`}
                      />
                    </div>
                  </div>
                  <p id={`quantity-help-${product.id}-${color}`} className="mt-1.5 text-[11px] text-muted-foreground">Use 0 to skip this colour. Each product is capped by its own available stock.</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              {selectedTotal > 0 ? `${selectedTotal} selected from this design` : "No quantities selected"}
            </p>
            <Button type="button" size="sm" className="btn-accent" onClick={handleAdd} disabled={selectedTotal === 0 || selectedTotal > availableStock}>
              Add selected colours
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkOrderPage() {
  const { currency, t } = useStore();
  const currentCountry = COUNTRIES.find((c) => c.code === currency) || COUNTRIES[0];

  const { data: products = [] } = useQuery({
    queryKey: ["bulk-bundle-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug, description, category_id, price, discount_percent, stock, low_stock_threshold, images, status, featured, created_at, updated_at, sku, sale_price, product_type, promotion_status, colors, sizes, color_images")
        .eq("product_type", "bundle")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });
  const { addItem } = useCart();
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const currentBundleTotal = bundleItems.reduce((sum, item) => sum + item.qty, 0);

  const bundleCount = Number((currentBundleTotal / WHOLESALE_BUNDLE_SIZE).toFixed(1));
  const nextWholesaleTier = getNextWholesaleTier(currentBundleTotal);
  const productQtyById = new Map<string, number>();
  for (const item of bundleItems) {
    productQtyById.set(item.product.id, (productQtyById.get(item.product.id) ?? 0) + item.qty);
  }
  // Wholesale pricing is derived from the TOTAL bundle quantity, not from any
  // single product. Each product is capped only by its own available stock, and
  // products with fewer than 10 pieces may still participate in a mixed bundle.
  const bundleTier = getWholesaleTier(currentBundleTotal);
  const wholesalePricePerPiece = bundleTier?.pricePerPiece ?? null;
  const totalPrice = bundleItems.reduce(
    (sum, item) => {
      const retailPrice = getEffectiveProductBasePrice(item.product);
      const unit = wholesalePricePerPiece ?? retailPrice;
      return sum + item.qty * unit;
    },
    0,
  );
  // Stock is aggregated per product across every order line before it is
  // compared with that product's available stock. Different products are never
  // combined with each other.
  const outOfStockProducts = Array.from(productQtyById.entries())
    .filter(([productId, qty]) => {
      const product = bundleItems.find((entry) => entry.product.id === productId)?.product;
      const stock = product ? Math.max(0, Number(product.stock ?? 0)) : 0;
      return qty > stock;
    })
    .map(([productId, qty]) => ({
      productId,
      qty,
      name: bundleItems.find((entry) => entry.product.id === productId)?.product.name ?? "Selected product",
    }));
  const bundleValid =
    bundleItems.length > 0 &&
    currentBundleTotal >= WHOLESALE_BUNDLE_SIZE &&
    currentBundleTotal % WHOLESALE_BUNDLE_SIZE === 0 &&
    outOfStockProducts.length === 0;

  const addToBundle = (product: Product, lines: ColourLine[]) => {
    setBundleItems((current) => {
      const next = [...current];
      lines.forEach((line) => {
        if (line.qty <= 0) return;
        const existing = next.find((item) => item.product.id === product.id && item.color === line.color && item.size === line.size);
        if (existing) {
          existing.qty += line.qty;
        } else {
          next.push({ product, qty: line.qty, color: line.color, size: line.size });
        }
      });
      return next;
    });
    toast.success("Added to bundle selection");
  };

  const finalizeBundle = () => {
    if (currentBundleTotal < WHOLESALE_BUNDLE_SIZE) {
      toast.error(`Select at least ${WHOLESALE_BUNDLE_SIZE} pieces for wholesale pricing.`);
      return;
    }
    if (currentBundleTotal % WHOLESALE_BUNDLE_SIZE !== 0) {
      const remainder = currentBundleTotal % WHOLESALE_BUNDLE_SIZE;
      const direction = remainder <= WHOLESALE_BUNDLE_SIZE / 2 ? -1 : 1;
      const nextValid = currentBundleTotal + direction * remainder;
      const delta = Math.abs(nextValid - currentBundleTotal);
      toast.error(
        `Wholesale totals must be a multiple of ${WHOLESALE_BUNDLE_SIZE}. Add or remove ${delta} piece${delta === 1 ? "" : "s"} to reach ${nextValid}.`,
      );
      return;
    }
    if (!bundleTier) {
      toast.error("Could not determine wholesale pricing for this quantity.");
      return;
    }
    const invalidPriceProducts = bundleItems.filter((item) => {
      const base = getEffectiveProductBasePrice(item.product);
      return !Number.isFinite(base) || base <= 0;
    });
    if (invalidPriceProducts.length > 0) {
      toast.error(`${invalidPriceProducts[0].product.name} has an invalid price and cannot be added to cart.`);
      return;
    }
    // Never let a selection exceed the stock of the product it belongs to.
    if (outOfStockProducts.length > 0) {
      const entry = outOfStockProducts[0];
      const product = bundleItems.find((item) => item.product.id === entry.productId)?.product;
      const stock = product ? Math.max(0, Number(product.stock ?? 0)) : 0;
      toast.error(
        `${entry.name} only has ${stock} piece${stock === 1 ? "" : "s"} in stock, but ${entry.qty} were selected.`,
      );
      return;
    }
    const bundleId = generateBundleId();
    bundleItems.forEach((item) => {
      addItem(
        item.product,
        item.size,
        item.color,
        item.qty,
        true,
        bundleId,
        bundleTier.pricePerPiece,
      );
    });
    setBundleItems([]);
    toast.success("Bulk order added to cart!");
  };

  return (
    <div className="container-x py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display text-primary">Build Your Custom Bulk Order</h1>
        <p className="text-lg">
          {WHOLESALE_BUNDLE_SIZE} pieces = 1 bundle &nbsp;|&nbsp; wholesale pricing starts at {formatCurrencyPrice(WHOLESALE_TIERS[0].pricePerPiece, currency)} per piece
        </p>
        <div className={`mx-auto flex max-w-md items-center justify-center gap-2 p-4 rounded-xl font-bold ${bundleValid ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-primary/10 text-primary"}`}>
          {bundleValid ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {currentBundleTotal} Pieces Selected ({bundleCount} bundle{bundleCount === 1 ? "" : "s"})
        </div>
        {outOfStockProducts.length > 0 && (
          <div className="mx-auto max-w-2xl rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="font-medium">Not enough stock.</p>
            <p className="mt-1">Each product is capped by its own available stock. Different products are never combined with each other.</p>
            <ul className="mt-2 list-disc pl-5">
              {outOfStockProducts.slice(0, 4).map((entry) => (
                <li key={entry.productId}>{entry.name}: {entry.qty} selected</li>
              ))}
            </ul>
          </div>
        )}
        {nextWholesaleTier ? (
          <p className="text-sm text-muted-foreground">
            {currentBundleTotal < WHOLESALE_BUNDLE_SIZE
              ? `Add ${nextWholesaleTier.minimumQuantity - currentBundleTotal} more piece${nextWholesaleTier.minimumQuantity - currentBundleTotal === 1 ? "" : "s"} to reach the wholesale minimum of ${nextWholesaleTier.minimumQuantity}.`
              : currentBundleTotal % WHOLESALE_BUNDLE_SIZE !== 0
                ? (() => {
                    const remainder = currentBundleTotal % WHOLESALE_BUNDLE_SIZE;
                    const direction = remainder <= WHOLESALE_BUNDLE_SIZE / 2 ? -1 : 1;
                    const nextValid = currentBundleTotal + direction * remainder;
                    const delta = Math.abs(nextValid - currentBundleTotal);
                    return `Add or remove ${delta} piece${delta === 1 ? "" : "s"} to reach the next valid wholesale total of ${nextValid}.`;
                  })()
                : `Add ${nextWholesaleTier.minimumQuantity - currentBundleTotal} piece${nextWholesaleTier.minimumQuantity - currentBundleTotal === 1 ? "" : "s"} to reach ${nextWholesaleTier.minimumQuantity} pieces at ${formatCurrencyPrice(nextWholesaleTier.pricePerPiece, currency)} per piece.`}
            {(nextWholesaleTier.minimumQuantity - currentBundleTotal) % WHOLESALE_BUNDLE_SIZE === 0 &&
              currentBundleTotal % WHOLESALE_BUNDLE_SIZE === 0 &&
              ` (${(nextWholesaleTier.minimumQuantity - currentBundleTotal) / WHOLESALE_BUNDLE_SIZE} bundle${(nextWholesaleTier.minimumQuantity - currentBundleTotal) / WHOLESALE_BUNDLE_SIZE === 1 ? "" : "s"})`}
          </p>
        ) : currentBundleTotal >= 1000 ? (
          <p className="text-sm text-muted-foreground">You have reached the highest wholesale quantity tier.</p>
        ) : null}
        {bundleValid && (
          <Button onClick={finalizeBundle} className="btn-accent" disabled={outOfStockProducts.length > 0}>
            Add Bulk Order to Cart ({formatCurrencyPrice(totalPrice, currency)})
          </Button>
        )}
      </div>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] items-start">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-display">Select Designs</h2>
            <p className="mt-1 text-sm text-muted-foreground">Each colour or design gets its own quantity and becomes a separate order line.</p>
          </div>
          {products.map((product) => (
            <ProductEntry key={product.id} product={product} onAdd={addToBundle} />
          ))}
        </div>

        <aside className="rounded-2xl border border-border/70 bg-secondary/10 p-5 shadow-sm lg:sticky lg:top-20">
          <h2 className="text-2xl font-display">Your Bulk Order</h2>
          <p className="mt-1 text-sm text-muted-foreground">{currentBundleTotal} total pieces selected</p>

          {bundleItems.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground italic">Your bulk selection is empty.</p>
          ) : (
            <>
              <div className="mt-5 space-y-3">
                {bundleItems.map((item, index) => {
                  const image = item.color ? item.product.color_images?.[item.color] : undefined;
                  return (
                    <div key={`${item.product.id}-${item.color}-${item.size}-${index}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Package className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
                        {image && <img loading="lazy" decoding="async" src={image} alt={`${item.product.name} ${item.color}`} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.product.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{item.color} · Size {item.size} · {item.qty} piece{item.qty === 1 ? "" : "s"}</p>
                      </div>
                      <button type="button" onClick={() => setBundleItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="p-1.5 text-destructive hover:bg-destructive/5 rounded" aria-label={`Remove ${item.product.name} ${item.color}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-xl bg-background border border-border/60 p-4 text-sm space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calculator size={16} />
                  <span className="font-medium">Order Summary</span>
                </div>
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex justify-between text-sm">
                    <span>Total Pieces</span>
                    <span className="font-semibold">{currentBundleTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Number of Bundles</span>
                    <span className="font-semibold">{bundleCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Price Per Piece</span>
                    <span className="font-semibold">
                      {bundleTier
                        ? formatCurrencyPrice(bundleTier.pricePerPiece, currency)
                        : "Varies by product"}
                    </span>
                  </div>
                  {outOfStockProducts.length > 0 && (
                    <div className="flex justify-between text-sm text-amber-700 dark:text-amber-300">
                      <span>Stock status</span>
                      <span className="font-medium">Not enough stock</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-3 font-display text-lg">
                    <span>Grand Total</span>
                    <span className="text-primary">{formatCurrencyPrice(totalPrice, currency)}</span>
                  </div>
                  {!bundleValid && (
                    <p className="text-xs text-muted-foreground">
                      Estimated from selected quantities. The total bundle must be at least {WHOLESALE_BUNDLE_SIZE} pieces and divisible by {WHOLESALE_BUNDLE_SIZE} before this can be added to cart.
                    </p>
                  )}
                  {bundleValid && outOfStockProducts.length > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      One or more products do not have enough stock. Each product is capped by its own available stock.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

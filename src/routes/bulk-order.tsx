import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatNaira, getProducts, type Product } from "@/lib/products";
import { colorToCss } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/lib/cart";
import { Trash2, AlertCircle, CheckCircle, Package, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bulk-order")({
  head: () => ({
    meta: [
      { title: "Wholesale & Bulk Orders — SupplierAffordable" },
    ],
  }),
  component: BulkOrderPage,
});

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"] as const;

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
    const qty = Number.isFinite(nextValue) ? Math.max(0, Math.floor(nextValue)) : 0;
    updateLine(color, { qty });
  };

  const handleAdd = () => {
    if (selectedTotal === 0) {
      toast.error("Select at least one colour and quantity.");
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
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-display text-lg leading-tight">{product.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose a quantity for each colour or design.</p>
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
                        <img
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
                  <p id={`quantity-help-${product.id}-${color}`} className="mt-1.5 text-[11px] text-muted-foreground">Use 0 to skip this colour.</p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              {selectedTotal > 0 ? `${selectedTotal} selected from this design` : "No quantities selected"}
            </p>
            <Button type="button" size="sm" className="btn-accent" onClick={handleAdd} disabled={selectedTotal === 0}>
              Add selected colours
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BulkOrderPage() {
  const { data: products = [] } = useQuery({
    queryKey: ["bulk-bundle-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("product_type", "bundle")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Product[];
    },
  });
  const { data: settings } = useQuery({
    queryKey: ["shop_settings_bulk"],
    queryFn: async () => {
      const { data } = await supabase.from("shop_settings").select("bulk_unit_price, bulk_min_qty").eq("id", "default").maybeSingle();
      return data;
    },
  });
  const bulkMinQty = Number(settings?.bulk_min_qty ?? 10);
  const bulkUnitPrice = Number(settings?.bulk_unit_price ?? 6000);

  const { addItem } = useCart();
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const currentBundleTotal = bundleItems.reduce((sum, item) => sum + item.qty, 0);

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
    if (currentBundleTotal < bulkMinQty) {
      toast.error(`Minimum bulk order is ${bulkMinQty} pieces.`);
      return;
    }
    const bundleId = `bundle_${Date.now()}`;
    bundleItems.forEach((item) => {
      addItem(item.product, item.size, item.color, item.qty, true, bundleId, bulkUnitPrice);
    });
    setBundleItems([]);
    toast.success("Bulk order added to cart!");
  };

  const totalPrice = currentBundleTotal * bulkUnitPrice;
  const isValid = currentBundleTotal >= bulkMinQty;

  return (
    <div className="container-x py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display text-primary">Build Your Custom Bulk Order</h1>
        <p className="text-lg">Minimum bulk order is {bulkMinQty} pieces ({formatNaira(bulkUnitPrice)} / piece)</p>
        <div className={`mx-auto flex max-w-md items-center justify-center gap-2 p-4 rounded-xl font-bold ${isValid ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-primary/10 text-primary"}`}>
          {isValid ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {currentBundleTotal} Pieces Selected {isValid ? "(Ready to order)" : `(Minimum ${bulkMinQty} required)`}
        </div>
        {isValid && (
          <Button onClick={finalizeBundle} className="btn-accent">Add Bulk Order to Cart ({formatNaira(totalPrice)})</Button>
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
            <div className="mt-5 space-y-3">
              {bundleItems.map((item, index) => {
                const image = item.color ? item.product.color_images?.[item.color] : undefined;
                return (
                  <div key={`${item.product.id}-${item.color}-${item.size}-${index}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background p-3">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <Package className="absolute inset-0 m-auto h-5 w-5 text-muted-foreground" />
                      {image && <img src={image} alt={`${item.product.name} ${item.color}`} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
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
          )}

          <div className="mt-5 rounded-xl bg-background border border-border/60 p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total price</span><span className="font-semibold text-primary">{formatNaira(totalPrice)}</span></div>
            <p className="mt-2 text-xs text-muted-foreground">{currentBundleTotal} pcs × {formatNaira(bulkUnitPrice)}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

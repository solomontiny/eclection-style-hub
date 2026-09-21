import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatNaira, getProducts } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useCart } from "@/lib/cart";

export const Route = createFileRoute("/bulk-order")({
  head: () => ({
    meta: [
      { title: "Wholesale & Bulk Orders — SupplierAffordable" },
      { name: "description", content: "Build a SupplierAffordable wholesale order of 10 pieces or more." },
      { property: "og:title", content: "Wholesale & Bulk Orders — SupplierAffordable" },
      { property: "og:description", content: "Build a SupplierAffordable wholesale order of 10 pieces or more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BulkOrderPage,
});

function BulkOrderPage() {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { addItem } = useCart();
  const [bundleInputs, setBundleInputs] = useState<Record<string, number>>({});

  const handleAddBulk = (product: any) => {
    const bundles = bundleInputs[product.id] || 1;
    const qty = bundles * 10;
    addItem(product, "Bulk", qty, true, bundles);
  };

  return (
    <div className="container-x py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display">Build Your Wholesale Order</h1>
        <div className="max-w-md mx-auto">
          <Card className="p-4 bg-muted/50 border-muted">
            <h2 className="font-semibold text-lg mb-2">Wholesale Pricing</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                <p>₦6,000 per piece</p>
                <p>1 Bundle = 10 Pieces</p>
                <p className="font-semibold text-foreground sm:col-span-2">1 Bundle = ₦60,000</p>
            </div>
            <p className="text-sm mt-3 text-muted-foreground">Order 1 or more bundles.</p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {products.map(p => (
          <div key={p.id} className="p-4 bg-muted rounded-lg space-y-4">
            <img src={p.image ?? p.image_url ?? ""} alt={p.name} className="w-full h-48 object-cover rounded-lg" />
            <p className="font-medium text-lg">{p.name}</p>
            <div className="text-sm text-muted-foreground space-y-1">
                <p>1 Bundle = 10 Pieces</p>
                <p>Wholesale: <span className="font-semibold text-foreground">₦60,000 / bundle</span></p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
                <Input type="number" min="1" aria-label={`Bundles of ${p.name}`} value={bundleInputs[p.id] || 1} onChange={e => setBundleInputs({...bundleInputs, [p.id]: parseInt(e.target.value) || 1})} className="w-20" />
                <span className="text-sm font-medium">Bundles</span>
                <Button onClick={() => handleAddBulk(p)}>Add to Cart</Button>
            </div>
            <p className="text-lg font-bold">Total: {formatNaira((bundleInputs[p.id] || 1) * 60000)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

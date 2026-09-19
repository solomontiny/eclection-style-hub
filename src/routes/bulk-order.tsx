import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatNaira, getProducts } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-display">Build Your Wholesale Order</h1>
        <p className="text-muted-foreground mt-4">
          Wholesale price: ₦6,000 per piece (1 bundle = 10 pieces = ₦60,000).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {products.map(p => (
          <div key={p.id} className="p-4 bg-muted rounded-lg space-y-4">
            <img src={p.image ?? p.image_url ?? ""} alt={p.name} className="w-full h-48 object-cover rounded-lg" />
            <p className="font-medium">{p.name}</p>
            <div className="flex flex-wrap gap-2 items-center">
                <Input type="number" min="1" aria-label={`Bundles of ${p.name}`} value={bundleInputs[p.id] || 1} onChange={e => setBundleInputs({...bundleInputs, [p.id]: parseInt(e.target.value) || 1})} className="w-20" />
                <span>Bundles</span>
                <Button className="ml-auto" onClick={() => handleAddBulk(p)}>Add to cart</Button>
            </div>
            <p className="text-sm font-semibold">Total: {formatNaira((bundleInputs[p.id] || 1) * 60000)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

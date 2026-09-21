import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatNaira, getProducts, type Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/bulk-order")({
  head: () => ({
    meta: [
      { title: "Wholesale & Bulk Orders — SupplierAffordable" },
    ],
  }),
  component: BulkOrderPage,
});

type BundleItem = {
    product: Product;
    qty: number;
    color: string;
    size: string;
};

function ProductEntry({ product, onAdd, disabled }: { product: Product, onAdd: (p: Product, qty: number, color: string, size: string) => void, disabled: boolean }) {
    const productSizes = product.sizes?.length ? product.sizes : ["S", "M", "L", "XL", "XXL", "XXXL"];
    const [size, setSize] = useState(productSizes[1] ?? 'M');
    const [color, setColor] = useState(product.colors?.[0] ?? 'Default');
    const [qty, setQty] = useState(1);

    return (
        <div className="flex gap-4 p-4 border rounded-lg bg-card">
            <img src={product.images?.[0] ?? ""} alt={product.name} className="w-20 h-20 object-cover rounded" />
            <div className="flex-1 space-y-2">
                <p className="font-semibold">{product.name}</p>
                <div className="flex gap-2 flex-wrap">
                    <Select value={size} onValueChange={setSize}>
                        <SelectTrigger className="w-20"><SelectValue placeholder="Size" /></SelectTrigger>
                        <SelectContent>                    {productSizes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                    {product.colors && product.colors.length > 0 && (
                        <Select value={color} onValueChange={setColor}>
                            <SelectTrigger className="w-24"><SelectValue placeholder="Color" /></SelectTrigger>
                            <SelectContent>{product.colors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                    )}
                    <Select value={String(qty)} onValueChange={(v) => setQty(Number(v))}>
                        <SelectTrigger className="w-16"><SelectValue placeholder="Qty" /></SelectTrigger>
                        <SelectContent>{[1,2,3,4,5,6,7,8,9,10].map(q => <SelectItem key={q} value={String(q)}>{q}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button size="sm" className="btn-accent" onClick={() => onAdd(product, qty, color, size)} disabled={disabled}>Add to Bundle</Button>
            </div>
        </div>
    );
}

function BulkOrderPage() {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const { addItem } = useCart();
  
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const currentBundleTotal = bundleItems.reduce((s, i) => s + i.qty, 0);

  const addToBundle = (product: Product, qty: number, color: string, size: string) => {
    if (currentBundleTotal + qty > 10) {
        toast.error(`Cannot add ${qty} pieces. Total would exceed 10 pieces.`);
        return;
    }
    setBundleItems(prev => {
        const existing = prev.find(i => i.product.id === product.id && i.color === color && i.size === size);
        if (existing) return prev.map(i => i === existing ? {...i, qty: i.qty + qty} : i);
        return [...prev, { product, qty, color, size }];
    });
  };

  const finalizeBundle = () => {
      if (currentBundleTotal !== 10) {
          toast.error("Bundle must contain exactly 10 pieces.");
          return;
      }
      const bundleId = `bundle_${Date.now()}`;
      bundleItems.forEach(item => {
          addItem(item.product, item.size, item.color, item.qty, true, bundleId);
      });
      setBundleItems([]);
      toast.success("Bundle added to cart!");
  };

  return (
    <div className="container-x py-12 space-y-12">
        <div className="text-center space-y-4">
            <h1 className="text-4xl font-display text-primary">Build Your Custom Bundle</h1>
            <p className="text-lg">10 pieces for ₦60,000</p>
            <div className={`p-4 rounded-lg font-bold flex items-center justify-center gap-2 ${currentBundleTotal === 10 ? 'bg-green-100 text-green-800' : 'bg-primary/10 text-primary'}`}>
                {currentBundleTotal === 10 ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                {currentBundleTotal} / 10 Pieces Selected
            </div>
            {currentBundleTotal === 10 && <Button onClick={finalizeBundle} className="btn-accent">Add Bundle to Cart ({formatNaira(60000)})</Button>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
                <h2 className="text-2xl font-display">Select Designs</h2>
                {products.map(p => (
                    <ProductEntry key={p.id} product={p} onAdd={addToBundle} disabled={currentBundleTotal >= 10} />
                ))}
            </div>
            
            <div className="border p-6 rounded-lg bg-secondary/10 h-fit sticky top-20">
                <h2 className="text-2xl font-display mb-4">Your Bundle ({currentBundleTotal}/10)</h2>
                {bundleItems.length === 0 ? <p className="text-muted-foreground italic">Your bundle is empty.</p> : (
                    <div className="space-y-2">
                        {bundleItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 border-b">
                                <span className="text-sm">{item.qty}x {item.product.name} ({item.color} - {item.size})</span>
                                <Button variant="ghost" size="sm" onClick={() => setBundleItems(prev => prev.filter((_, i) => i !== idx))}><Trash2 size={16} className="text-destructive"/></Button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
}

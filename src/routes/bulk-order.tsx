import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatNaira, getProducts, type Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/bulk-order")({
  head: () => ({
    meta: [
      { title: "Wholesale & Bulk Orders — Supplier Affordable" },
      { name: "description", content: "Build a Supplier Affordable wholesale order of 12 pieces or more." },
      { property: "og:title", content: "Wholesale & Bulk Orders — Supplier Affordable" },
      { property: "og:description", content: "Build a Supplier Affordable wholesale order of 12 pieces or more." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BulkOrderPage,
});

type BulkOrderItem = { id: string; name: string; quantity: number; price: number };

const bulkRequestsTable = () =>
  (supabase.from as unknown as (table: string) => any)("bulk_requests");

function BulkOrderPage() {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [items, setItems] = useState<BulkOrderItem[]>([]);
  const [formData, setFormData] = useState({ name: "", country: "", whatsapp: "", deliveryCountry: "", deliveryCity: "", notes: "" });

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const merchandiseTotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  const addItem = (product: Product) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, name: product.name, quantity: 1, price: product.sale_price ?? product.price }];
    });
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, q: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, q) } : i).filter(i => i.quantity > 0));

  const submit = async () => {
    if (totalQuantity < 12) { toast.error("Minimum 12 pieces required"); return; }
    
    const { error } = await bulkRequestsTable().insert({
      customer_name: formData.name, country: formData.country, whatsapp_number: formData.whatsapp,
      quantity: totalQuantity, products_requested: items, delivery_country: formData.deliveryCountry,
      delivery_city: formData.deliveryCity, notes: formData.notes
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Request submitted successfully! We will contact you soon.");
    setItems([]); setFormData({ name: "", country: "", whatsapp: "", deliveryCountry: "", deliveryCity: "", notes: "" });
  };

  return (
    <div className="container-x py-12 space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-display">Build Your Wholesale Order</h1>
        <p className="text-muted-foreground mt-4">Minimum order: 12 pieces</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <h2 className="text-2xl font-display">Select Products</h2>
          <div className="grid gap-4">
            {products.map(p => (
              <div key={p.id} className="flex justify-between items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{formatNaira(p.sale_price ?? p.price)} each</p>
                </div>
                <Button variant="outline" size="icon" onClick={() => addItem(p)} aria-label={`Add one ${p.name}`}><Plus /></Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-display">Your Order</h2>
              <p className="mt-1 text-sm text-muted-foreground">{totalQuantity} of 12 pieces selected</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase text-muted-foreground">Running total</p>
              <p className="font-semibold text-primary">{formatNaira(merchandiseTotal)}</p>
            </div>
          </div>
          
          {totalQuantity >= 500 ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
              <strong>Bulk / Corporate Order:</strong> Your order will be reviewed by our team to finalize pricing and delivery.
            </div>
          ) : totalQuantity >= 100 ? (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-900 text-sm">
              <strong>Wholesale Order:</strong> You qualify for wholesale pricing. Our team will review your order.
            </div>
          ) : totalQuantity >= 12 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-900 text-sm">
              <strong>Order Request:</strong> Please submit your request to our team.
            </div>
          )}
          
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Select products to begin your wholesale order.</p>
          ) : items.map(item => (
            <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-4 last:border-0">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-muted-foreground">{formatNaira(item.price * item.quantity)}</p>
              </div>
              <div className="flex items-center gap-1" aria-label={`Quantity for ${item.name}`}>
                <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label={`Reduce ${item.name} quantity`}><Minus /></Button>
                <span className="w-9 text-center font-semibold" aria-live="polite">{item.quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label={`Increase ${item.name} quantity`}><Plus /></Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(item.id)} aria-label={`Remove ${item.name}`}><Trash2 /></Button>
              </div>
            </div>
          ))}
          
          {totalQuantity >= 12 && (
            <div className="space-y-4 pt-6 border-t border-border">
              <Input placeholder="Full Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Country" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                <Input placeholder="WhatsApp Number" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Delivery Country" value={formData.deliveryCountry} onChange={e => setFormData({...formData, deliveryCountry: e.target.value})} />
                <Input placeholder="Delivery City" value={formData.deliveryCity} onChange={e => setFormData({...formData, deliveryCity: e.target.value})} />
              </div>
              <Input placeholder="Optional Notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
              <Button className="w-full" onClick={submit}>Submit Request</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

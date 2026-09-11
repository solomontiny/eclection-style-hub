import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getProducts } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Minus, Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/bulk-order")({ component: BulkOrderPage });

function BulkOrderPage() {
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: getProducts });
  const [items, setItems] = useState<{ id: string; name: string; quantity: number }[]>([]);
  const [formData, setFormData] = useState({ name: "", country: "", whatsapp: "", deliveryCountry: "", deliveryCity: "", notes: "" });

  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

  const addItem = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, name: product.name, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateQuantity = (id: string, q: number) => setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: Math.max(0, q) } : i).filter(i => i.quantity > 0));

  const submit = async () => {
    if (totalQuantity < 12) { toast.error("Minimum 12 pieces required"); return; }
    
    const { error } = await supabase.from("bulk_requests").insert({
      customer_name: formData.name, country: formData.country, whatsapp_number: formData.whatsapp,
      quantity: totalQuantity, products_requested: items, delivery_country: formData.deliveryCountry,
      delivery_city: formData.deliveryCity, notes: formData.notes
    });

    if (error) { toast.error(error.message); return; }
    toast.success("Request submitted successfully! We will contact you soon.");
    setItems([]); setFormData({ name: "", country: "", whatsapp: "", deliveryCountry: "", deliveryCity: "", notes: "" });
  };

  return (
    <div className="container py-12 space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-display">Build Your Wholesale Order</h1>
        <p className="text-muted-foreground mt-4">Min order: 12 pieces</p>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        <div className="space-y-4">
          <h2 className="text-2xl font-display">Select Products</h2>
          <div className="grid gap-4">
            {products.map(p => (
              <div key={p.id} className="flex justify-between items-center p-4 bg-muted rounded-lg">
                <span>{p.name}</span>
                <Button variant="outline" size="sm" onClick={() => addItem(p)}><Plus className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-display">Your Order ({totalQuantity} pieces)</h2>
          
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
          
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-4">
              <span className="flex-1">{item.name}</span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-4 w-4" /></Button>
                <span>{item.quantity}</span>
                <Button variant="ghost" size="sm" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="text-red-500" onClick={() => removeItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useCart, cartItemKey } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOrderServerFn, getTaxSettings } from "@/lib/orders.functions";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DELIVERY_INFO } from "@/lib/contact";

const CustomerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(5, "Delivery address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State/Region is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().optional(),
  deliveryInstructions: z.string().optional(),
});

type CustomerForm = z.infer<typeof CustomerSchema>;

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user } = useAuth();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const form = useForm<CustomerForm>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: { name: "", email: "", phone: "", address: "", city: "", state: "", country: "Nigeria", postalCode: "", deliveryInstructions: "" },
  });

  if (!user) {
    return (
      <section className="container-x py-16 text-center">
        <h1 className="text-3xl font-display">Sign in to checkout</h1>
        <p className="mt-4 text-muted-foreground">Please login or create an account to securely place your order.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Button onClick={() => navigate({ to: "/login", search: { redirect: "/checkout" } })}>Login / Signup</Button>
        </div>
      </section>
    );
  }

  const handleCheckout = async (data: CustomerForm) => {
    if (items.length === 0 || loading) return;
    setLoading(true);
    try {
      const order = await createOrderServerFn({
        data: {
          items: items.map((i) => ({ id: i.id, size: i.size, color: i.color, qty: i.qty, isBulk: !!i.isBulk, bundleId: i.bundleId })),
          customer: data,
          callbackUrl: `${window.location.origin}/thank-you`,
        },
      });

      if (!order.success || !("authorization_url" in order) || !order.authorization_url) {
        toast.error(("message" in order && order.message) || "Could not start the payment.");
        setLoading(false);
        return;
      }

      clear();
      window.location.href = order.authorization_url;
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Checkout failed. Please try again.");
      setLoading(false);
    }
  };


  const totalWithVat = subtotal;

  return (
    <section className="container-x py-10 md:py-12">
      <h1 className="text-2xl sm:text-3xl font-display">Checkout</h1>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12 mt-8">
        <form onSubmit={form.handleSubmit(handleCheckout)} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input {...form.register("name")} />
            {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <Label>Email</Label>
            <Input {...form.register("email")} />
            {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...form.register("phone")} />
            {form.formState.errors.phone && <p className="text-red-500 text-sm">{form.formState.errors.phone.message}</p>}
          </div>

          <div className="pt-2 border-t border-border">
            <h3 className="font-medium mb-3">Delivery address</h3>
          </div>
          <div>
            <Label>Full delivery address</Label>
            <Input {...form.register("address")} placeholder="Street, building, apartment" />
            {form.formState.errors.address && <p className="text-red-500 text-sm">{form.formState.errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input {...form.register("city")} />
              {form.formState.errors.city && <p className="text-red-500 text-sm">{form.formState.errors.city.message}</p>}
            </div>
            <div>
              <Label>State / Region</Label>
              <Input {...form.register("state")} />
              {form.formState.errors.state && <p className="text-red-500 text-sm">{form.formState.errors.state.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Input {...form.register("country")} />
              {form.formState.errors.country && <p className="text-red-500 text-sm">{form.formState.errors.country.message}</p>}
            </div>
            <div>
              <Label>Postal / ZIP code (optional)</Label>
              <Input {...form.register("postalCode")} />
            </div>
          </div>
          <div>
            <Label>Delivery instructions (optional)</Label>
            <Textarea {...form.register("deliveryInstructions")} placeholder="Gate code, floor, dispatch contact, etc." rows={2} />
          </div>
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? "Processing..." : "Pay with Paystack"}
          </Button>
        </form>
        <div className="border rounded-lg p-4 sm:p-6 bg-card h-fit">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Order Summary</h2>
          {items.map(item => (
            <div key={cartItemKey(item.id, item.size, item.color, item.bundleId)} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="min-w-0 text-sm break-words">
                {item.name}
                <span className="block text-xs text-muted-foreground">
                  {item.isBulk
                    ? `Bulk · ${item.qty} pieces ${item.color ? `· ${item.color}` : ""}`
                    : `Size ${item.size} · Qty ${item.qty} ${item.color ? `· ${item.color}` : ""}`}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{formatNaira(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 font-bold flex flex-col gap-2">
            <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatNaira(totalWithVat)}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-secondary/30 rounded text-sm text-muted-foreground space-y-2">
            <p><strong>Delivery Note:</strong> Delivery fees are separate from your order total and are paid directly to the dispatch rider upon delivery.</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(DELIVERY_INFO.regionalFees).map(([region, fee]) => (
                  <p key={region}><strong>{region}:</strong> {fee}</p>
                ))}
            </div>
            <p className="text-xs">{DELIVERY_INFO.note}</p>
            <p className="text-xs pt-1 border-t border-border/50"><strong>International Delivery:</strong> Orders are weighed by our logistics agent, and you'll be contacted with the delivery fee. Bus, Express & Cargo options are available. If you have your own logistics agent, provide their details and we'll send your package with a photo for confirmation.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

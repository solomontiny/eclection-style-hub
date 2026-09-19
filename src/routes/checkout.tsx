import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useCart, cartItemKey } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrderServerFn } from "@/lib/orders.functions";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const CustomerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone number is required"),
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
    defaultValues: { name: "", email: "", phone: "" },
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
          items: items.map((i) => ({ id: i.id, size: i.size, qty: i.qty, isBulk: !!i.isBulk })),
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
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? "Processing..." : "Pay with Paystack"}
          </Button>
        </form>
        <div className="border rounded-lg p-4 sm:p-6 bg-card h-fit">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Order Summary</h2>
          {items.map(item => (
            <div key={cartItemKey(item.id, item.size)} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="min-w-0 text-sm break-words">
                {item.name}
                <span className="block text-xs text-muted-foreground">
                  {item.isBulk
                    ? `Bulk · ${item.bundleQty ?? Math.round(item.qty / 10)} bundle(s) · ${item.qty} pieces`
                    : `Size ${item.size} · Qty ${item.qty}`}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{formatNaira(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 font-bold flex justify-between gap-3">
            <span>Total</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          <div className="mt-4 p-3 bg-secondary/30 rounded text-xs text-muted-foreground">
            <p><strong>Delivery Disclaimer:</strong> Delivery fees are separate from your order total and are paid directly to the dispatch rider upon delivery. SupplierAffordable currently uses third-party dispatch services, so delivery fees may vary depending on your location and dispatch provider.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOrderServerFn, sendOrderReceipt } from "@/lib/orders.functions";
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
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const form = useForm<CustomerForm>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const handleCheckout = async (data: CustomerForm) => {
    if (items.length === 0 || loading) return;
    setLoading(true);
    try {
      const order = await createOrderServerFn({
        data: {
          items: items.map((i) => ({ id: i.id, qty: i.qty })),
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
    <section className="container-x py-12">
      <h1 className="text-3xl font-display">Checkout</h1>
      <div className="grid md:grid-cols-2 gap-12 mt-8">
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
        <div className="border p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-4">Order Summary</h2>
          {items.map(item => (
            <div key={item.id} className="flex justify-between py-2">
              <span>{item.name} x {item.qty}</span>
              <span>{formatNaira(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 font-bold flex justify-between">
            <span>Total</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}

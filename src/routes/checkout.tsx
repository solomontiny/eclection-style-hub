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

function loadPaystackScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).PaystackPop) {
      resolve((window as any).PaystackPop);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v2/inline.js";
    script.onload = () => resolve((window as any).PaystackPop);
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

function CheckoutPage() {
  const { items, subtotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const form = useForm<CustomerForm>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: { name: "", email: "", phone: "" },
  });

  const handleCheckout = async (data: CustomerForm) => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      // 1. Create order server-side
      const order = await createOrderServerFn({
        data: {
          items: items.map(i => ({ id: i.id, qty: i.qty })),
          customer: data,
        },
      });

      // 2. Initiate Paystack
      const PaystackPop = await loadPaystackScript();
      const popup = new PaystackPop();
      popup.newTransaction({
        key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        amount: order.total * 100, // kobo
        email: data.email,
        currency: "NGN",
        ref: `REF-${order.orderId}`,
        onSuccess: async (transaction: any) => {
          // 3. Verify server-side
          const result = await sendOrderReceipt({
            data: {
              snapshot: {
                orderRef: order.orderId,
                createdAt: Date.now(),
                customer: data,
                items: items.map(i => ({
                  id: i.id,
                  name: i.name,
                  size: i.size || "N/A",
                  qty: i.qty,
                  price: i.price,
                })),
                delivery: { label: "Standard", fee: 0, eta: "3-5 days" },
                subtotal: order.total,
                total: order.total,
              },
              paystackRef: transaction.reference,
            },
          });

          if (result.status === "sent") {
            clearCart();
            navigate({ to: "/thank-you" });
          } else {
            toast.error(result.message);
          }
        },
        onCancel: () => {
          setLoading(false);
          toast.error("Payment cancelled.");
        },
      });
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Checkout failed. Please try again.");
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

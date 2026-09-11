import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { formatNaira } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { createOrderServerFn } from "@/lib/orders.functions"; // Need to create this

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { items, subtotal } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // 1. Create order server-side with authoritative pricing
      // 2. Initiate Paystack transaction
      // 3. Redirect to Paystack
      // ...
    } catch (e) {
      console.error(e);
      alert("Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="container-x py-12">
      <h1 className="text-3xl font-display">Checkout</h1>
      <div className="mt-8">
        {items.map(item => (
          <div key={item.id} className="flex justify-between py-2">
            <span>{item.name} x {item.qty}</span>
            <span>{formatNaira(item.price * item.qty)}</span>
          </div>
        ))}
        <div className="border-t mt-4 pt-4 font-bold">
          Total: {formatNaira(subtotal)}
        </div>
      </div>
      <Button onClick={handleCheckout} disabled={loading} className="mt-8">
        {loading ? "Processing..." : "Pay with Paystack"}
      </Button>
    </section>
  );
}

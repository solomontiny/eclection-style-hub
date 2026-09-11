import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/thank-you")({
  component: ThankYou,
});

function ThankYou() {
  return (
    <section className="container-x py-12">
      <div className="max-w-2xl mx-auto text-center">
        <CheckCircle2 className="mx-auto text-primary" size={40} />
        <h1 className="text-3xl mt-2">
          Thank you for your order!
        </h1>

        <p className="mt-6 text-sm text-muted-foreground">
          Your payment was successful and we are preparing your order.
        </p>

        <Link to="/shop" className="block mt-4 text-sm underline text-primary">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

export const Route = createFileRoute("/thank-you")({
  component: ThankYou,
});

function ThankYou() {
  return (
    <section className="container-x py-12">
      <div className="max-w-2xl mx-auto text-center">
        <Building2 className="mx-auto text-primary" size={40} />
        <h1 className="text-3xl mt-2">Payment is by bank transfer</h1>
        <p className="mt-4 text-sm text-muted-foreground">
          View your pending order in your account to see the Moniepoint transfer instructions.
        </p>
        <Link to="/account/orders" className="inline-block mt-4 text-sm underline text-primary">
          View my orders
        </Link>
        <Link to="/shop" className="block mt-4 text-sm underline text-primary">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}

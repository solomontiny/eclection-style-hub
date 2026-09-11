import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmPaystackPayment } from "@/lib/orders.functions";

export const Route = createFileRoute("/thank-you")({
  component: ThankYou,
  validateSearch: (search: Record<string, unknown>) => ({
    reference: typeof search.reference === "string" ? search.reference : undefined,
    trxref: typeof search.trxref === "string" ? search.trxref : undefined,
  }),
});

function ThankYou() {
  const { reference, trxref } = Route.useSearch();
  const ref = reference ?? trxref;
  const [state, setState] = useState<{ status: string; orderNumber?: string; message?: string }>({
    status: ref ? "loading" : "paid",
  });

  useEffect(() => {
    if (!ref) return;
    let active = true;
    confirmPaystackPayment({ data: { reference: ref } })
      .then((res: any) => {
        if (active) setState(res);
      })
      .catch(() => {
        if (active) setState({ status: "error", message: "Could not verify the payment right now." });
      });
    return () => {
      active = false;
    };
  }, [ref]);

  return (
    <section className="container-x py-12">
      <div className="max-w-2xl mx-auto text-center">
        {state.status === "loading" && (
          <>
            <Loader2 className="mx-auto animate-spin text-primary" size={40} />
            <h1 className="text-3xl mt-2">Confirming your payment…</h1>
          </>
        )}

        {state.status === "paid" && (
          <>
            <CheckCircle2 className="mx-auto text-primary" size={40} />
            <h1 className="text-3xl mt-2">Thank you for your order!</h1>
            {state.orderNumber && (
              <p className="mt-2 text-sm">
                Order number: <b>{state.orderNumber}</b>
              </p>
            )}
            <p className="mt-6 text-sm text-muted-foreground">
              Your payment was successful and we are preparing your order.
            </p>
          </>
        )}

        {(state.status === "pending" || state.status === "error") && (
          <>
            <AlertCircle className="mx-auto text-destructive" size={40} />
            <h1 className="text-3xl mt-2">Payment not confirmed</h1>
            <p className="mt-4 text-sm text-muted-foreground">
              {state.message ?? "We could not confirm this payment yet."}
              {ref ? ` Reference: ${ref}` : ""}
            </p>
          </>
        )}

        <Link to="/shop" className="block mt-4 text-sm underline text-primary">
          Continue shopping
        </Link>
      </div>
    </section>
  );
}

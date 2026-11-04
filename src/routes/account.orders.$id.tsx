import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtNGN } from "@/lib/admin-utils";
import { Package, Truck, CheckCircle2, Clock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/account/orders/$id")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: "/account/orders" } });
  },
  component: OrderDetailsPage,
});

function OrderDetailsPage() {
  const { user } = useAuth();
  const { id } = Route.useParams();
  const { data: order, isLoading } = useQuery({
    queryKey: ["account-order", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <section className="container-x py-12">Loading...</section>;
  if (!order) return <section className="container-x py-12">Order not found.</section>;

  const statuses = ["pending", "processing", "shipped", "out_for_delivery", "delivered"];
  const currentStatusIndex = statuses.indexOf(order.status);
  const isBankTransfer = order.payment_method === "bank_transfer";
  const isPaid = order.payment_status === "paid";
  const isPendingPayment = order.payment_status === "pending" && !isPaid;

  return (
    <section className="container-x py-12 max-w-3xl">
      <h1 className="font-display text-3xl">Order #{order.order_number}</h1>
      <p className="text-muted-foreground mt-1">Placed on {fmtDate(order.created_at)}</p>

      {/* Payment Status Banner */}
      <div className="mt-6 p-4 rounded-xl border border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isPaid ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          ) : (
            <Clock className="h-6 w-6 text-amber-500" />
          )}
          <div>
            {isPaid ? (
              <div>
                <p className="font-bold text-emerald-700 dark:text-emerald-300">Order Successful!</p>
                <p className="text-sm text-muted-foreground">Thank you for patronizing Supplier Affordable.</p>
              </div>
            ) : isPendingPayment && isBankTransfer ? (
              <div>
                <p className="font-bold">Payment pending verification</p>
                <p className="text-sm text-muted-foreground">
                  Your bank transfer is being reviewed. Check back soon.
                </p>
              </div>
            ) : (
              <div>
                <p className="font-bold capitalize">Payment: {order.payment_status}</p>
                <p className="text-sm text-muted-foreground capitalize">Status: {order.status.replace("_", " ")}</p>
              </div>
            )}
          </div>
        </div>
        <Badge className={isBankTransfer ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" : "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200"}>
          {isBankTransfer ? (
            <><Building2 className="h-3 w-3 mr-1" /> Bank Transfer</>
          ) : (
            <>Unavailable</>
          )}
        </Badge>
      </div>

      {/* Timeline */}
      <div className="mt-8 border rounded-2xl p-6">
        <h2 className="font-semibold mb-6">Order Status</h2>
        <div className="relative flex justify-between">
            {statuses.map((s, index) => {
                const isActive = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                return (
                    <div key={s} className="flex flex-col items-center flex-1 z-10">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${isActive ? 'bg-primary text-white' : 'bg-background'}`}>
                            {isActive ? <CheckCircle2 size={16} /> : <div className="w-2 h-2 rounded-full bg-border" />}
                        </div>
                        <p className={`text-xs mt-2 capitalize ${isCurrent ? 'font-bold' : 'text-muted-foreground'}`}>{s.replace('_', ' ')}</p>
                    </div>
                )
            })}
            <div className="absolute top-4 left-0 w-full h-0.5 bg-border -z-0"></div>
        </div>
      </div>

      {/* Items */}
      <div className="mt-8">
        <h2 className="font-semibold mb-4">Items</h2>
        <div className="divide-y border rounded-2xl">
            {order.order_items.map((item: any) => (
                <div key={item.id} className="p-4 flex justify-between">
                    <div>
                        <p className="font-medium">{item.product_name}</p>
                         <p className="text-sm text-muted-foreground">
                           Qty: {item.quantity}
                           {item.size && ` · Size ${item.size}`}
                           {item.color && ` · Color: ${item.color}`}
                         </p>
                    </div>
                    <p className="font-semibold">{fmtNGN(Number(item.unit_price) * item.quantity)}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Total */}
      <div className="mt-8 border-t pt-4">
        <div className="flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>{fmtNGN(Number(order.total))}</span>
        </div>
      </div>

      {/* Bank Transfer Instructions */}
      {isBankTransfer && isPendingPayment && (
        <div className="mt-8 p-6 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-3">Bank Transfer Instructions</h3>
          <p className="text-sm text-blue-800 dark:text-blue-300 mb-4">
            Please transfer the exact amount to one of our bank accounts and send proof of payment via WhatsApp.
          </p>
          <div className="flex justify-end">
            <Link to="/payment-instructions" search={{ orderId: order.id }} className="text-sm text-blue-700 dark:text-blue-300 underline">
              View Full Payment Instructions →
            </Link>
          </div>
        </div>
      )}

      {/* Back to Orders */}
      <Link to="/account/orders" className="mt-6 inline-flex items-center gap-2 text-sm text-primary underline">
        ← Back to My Orders
      </Link>
    </section>
  );
}

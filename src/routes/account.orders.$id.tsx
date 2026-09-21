import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtNGN } from "@/lib/admin-utils";
import { Package, Truck, CheckCircle2, Clock } from "lucide-react";

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

  return (
    <section className="container-x py-12 max-w-3xl">
      <h1 className="font-display text-3xl">Order #{order.order_number}</h1>
      <p className="text-muted-foreground mt-1">Placed on {fmtDate(order.created_at)}</p>

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
                        <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
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

    </section>
  );
}

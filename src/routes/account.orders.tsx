import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtNGN } from "@/lib/admin-utils";

export const Route = createFileRoute("/account/orders")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: "/account/orders" } });
  },
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["account-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, status, payment_status, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <section className="container-x py-12 md:py-16 max-w-4xl">
      <h1 className="font-display text-4xl">My Orders</h1>
      {isLoading ? (
        <p className="mt-5 text-muted-foreground">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-border p-8 text-center">
          <Package className="mx-auto text-muted-foreground" />
          <p className="mt-3 text-muted-foreground">You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="mt-5 divide-y divide-border rounded-2xl border border-border">
          {orders.map((order) => (
            <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{order.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {fmtDate(order.created_at)} ·{" "}
                  <span className="capitalize">{order.payment_status}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{fmtNGN(Number(order.total))}</p>
                <p className="text-xs capitalize text-muted-foreground">{order.status}</p>
                <Link to="/account/orders/$id" params={{ id: order.id }} className="text-xs text-primary underline mt-1 block">Track Order</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtDate, fmtNGN } from "@/lib/admin-utils";
import { Button } from "@/components/ui/button";
import {
  CUSTOMER_ORDER_PAGE_SIZE,
  customerOrderPageQueryKey,
  fetchCustomerOrderPage,
} from "@/lib/customer-account-queries.mjs";

export const Route = createFileRoute("/account/orders")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: "/account/orders" } });
  },
  component: OrdersPage,
});

function OrdersPage() {
  const { user } = useAuth();
  const [olderOrderCursors, setOlderOrderCursors] = useState<{ createdAt: string; id: string }[]>([]);
  const ordersQuery = useQuery({
    queryKey: customerOrderPageQueryKey(user?.id),
    enabled: !!user?.id,
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    queryFn: () => fetchCustomerOrderPage({ client: supabase, userId: user!.id }),
  });
  const olderOrderQueries = useQueries({
    queries: olderOrderCursors.map((cursor) => ({
      queryKey: customerOrderPageQueryKey(user?.id, cursor),
      enabled: !!user?.id,
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      queryFn: () => fetchCustomerOrderPage({ client: supabase, userId: user!.id, cursor }),
    })),
  });
  const orderPages = [ordersQuery.data, ...olderOrderQueries.map((query) => query.data)].filter(
    (page): page is NonNullable<typeof ordersQuery.data> => !!page,
  );
  const orders = orderPages.flatMap((page) => page.items);
  const lastOrderPage = orderPages.at(-1);
  const loadingOlderOrders = olderOrderQueries.some((query) => query.isLoading);

  return (
    <section className="container-x py-12 md:py-16 max-w-4xl">
      <h1 className="font-display text-4xl">My Orders</h1>
      {ordersQuery.isLoading ? (
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
                  {fmtDate(order.created_at)} · Payment:{" "}
                  <span className="capitalize">{order.payment_status}</span>
                  {" "}·{" "}
                  <span className="capitalize">
                    {order.payment_method === "bank_transfer" ? "Bank Transfer" : "Unavailable"}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{fmtNGN(Number(order.total))}</p>
                <p className="text-xs capitalize text-muted-foreground">Order status: {order.status}</p>
                <Link to="/account/orders/$id" params={{ id: order.id }} className="text-xs text-primary underline mt-1 block">Track Order</Link>
              </div>
            </div>
          ))}
        </div>
      )}
      {lastOrderPage?.nextCursor && (
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={loadingOlderOrders}
          onClick={() => {
            const failedQuery = olderOrderQueries.find((query) => query.isError);
            if (failedQuery) {
              void failedQuery.refetch();
              return;
            }
            const cursor = lastOrderPage.nextCursor;
            if (cursor && !olderOrderCursors.some((item) => item.id === cursor.id && item.createdAt === cursor.createdAt)) {
              setOlderOrderCursors((current) => [...current, cursor]);
            }
          }}
        >
          {loadingOlderOrders
            ? "Loading…"
            : olderOrderQueries.some((query) => query.isError)
              ? "Retry loading orders"
              : "Load older orders"}
        </Button>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Showing orders newest first, {CUSTOMER_ORDER_PAGE_SIZE} at a time.
      </p>
    </section>
  );
}

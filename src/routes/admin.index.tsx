import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

function fmtNGN(n: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
}

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const productsRes = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });

      const ordersRes = await supabase
        .from("orders")
        .select("id, order_number, customer_name, total_price, status, created_at");

      const customersRes = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true });

      const lowStockRes = await supabase
        .from("products")
        .select("id, name, stock")
        .lte("stock", 5)
        .order("stock", { ascending: true })
        .limit(5);

      // SAFE fallback (NO TS CASTING ERRORS)
      const orders = (ordersRes.data ?? []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number ?? null,
        customer_name: o.customer_name ?? null,
        total_price: Number(o.total_price ?? 0),
        status: o.status ?? "pending",
        created_at: o.created_at,
      }));

      const lowStock = (lowStockRes.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        stock: Number(p.stock ?? 0),
      }));

      const revenue = orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.total_price, 0);

      return {
        productCount: productsRes.count ?? 0,
        orderCount: orders.length,
        customerCount: customersRes.count ?? 0,
        revenue,
        lowStock,
        recent: orders.slice(0, 5),
      };
    },
  });

  const stats = [
    {
      label: "Revenue",
      value: data ? fmtNGN(data.revenue) : "—",
      icon: DollarSign,
    },
    {
      label: "Orders",
      value: data?.orderCount ?? "—",
      icon: ShoppingCart,
    },
    {
      label: "Products",
      value: data?.productCount ?? "—",
      icon: Package,
    },
    {
      label: "Customers",
      value: data?.customerCount ?? "—",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your store.
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-background rounded-2xl border border-border p-5"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {s.label}
              </p>
              <s.icon className="h-4 w-4 text-primary" />
            </div>

            <p className="font-display text-2xl mt-3">
              {isLoading ? "…" : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* LOWER SECTION */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* RECENT ORDERS */}
        <div className="bg-background rounded-2xl border border-border p-5">
          <h2 className="font-display text-lg mb-4">Recent orders</h2>

          {data?.recent.length ? (
            <div className="space-y-3">
              {data.recent.map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {o.order_number ?? "No order #"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {o.customer_name ?? "Unknown customer"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-medium">
                      {fmtNGN(o.total_price)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {o.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          )}
        </div>

        {/* LOW STOCK */}
        <div className="bg-background rounded-2xl border border-border p-5">
          <h2 className="font-display text-lg mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Low stock
          </h2>

          {data?.lowStock.length ? (
            <div className="space-y-3">
              {data.lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm"
                >
                  <p>{p.name}</p>
                  <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                    {p.stock} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              All products well stocked.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
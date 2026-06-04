import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, Users, DollarSign, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardPage,
});

function fmtNGN(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
}

function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [products, orders, customers, lowStock, recent] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, status", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id, name, stock").lte("stock", 5).limit(5),
        supabase.from("orders").select("id, order_number, total, status, created_at, customer_name").order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (orders.data ?? []).filter((o: any) => o.status !== "cancelled").reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);
      return {
        productCount: products.count ?? 0,
        orderCount: orders.count ?? 0,
        customerCount: customers.count ?? 0,
        revenue,
        lowStock: lowStock.data ?? [],
        recent: recent.data ?? [],
      };
    },
  });

  const stats = [
    { label: "Revenue", value: data ? fmtNGN(data.revenue) : "—", icon: DollarSign },
    { label: "Orders", value: data?.orderCount ?? "—", icon: ShoppingCart },
    { label: "Products", value: data?.productCount ?? "—", icon: Package },
    { label: "Customers", value: data?.customerCount ?? "—", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your store</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-background rounded-2xl border border-border p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4 text-primary" />
            </div>
            <p className="font-display text-2xl mt-2">{isLoading ? "…" : s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-background rounded-2xl border border-border p-6">
          <h2 className="font-display text-lg mb-4">Recent orders</h2>
          <div className="space-y-3">
            {(data?.recent ?? []).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                <div>
                  <p className="font-medium">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">{o.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{fmtNGN(Number(o.total))}</p>
                  <p className="text-xs text-muted-foreground capitalize">{o.status}</p>
                </div>
              </div>
            ))}
            {!isLoading && (data?.recent ?? []).length === 0 && <p className="text-sm text-muted-foreground">No orders yet</p>}
          </div>
        </div>

        <div className="bg-background rounded-2xl border border-border p-6">
          <h2 className="font-display text-lg mb-4 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Low stock</h2>
          <div className="space-y-3">
            {(data?.lowStock ?? []).map((p: any) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                <span>{p.name}</span>
                <span className="text-amber-600 font-medium">{p.stock} left</span>
              </div>
            ))}
            {!isLoading && (data?.lowStock ?? []).length === 0 && <p className="text-sm text-muted-foreground">All products well stocked</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Package, ShoppingCart, Users, DollarSign, AlertTriangle, Clock3, CheckCircle2, Truck, Activity, TrendingUp, Repeat } from "lucide-react";
import { loadPerfReport, resetPerfReport, type PerfReport, getBandwidthSummary } from "@/lib/perf-monitor";

export const Route = createFileRoute("/admin/dashboard")({
  component: DashboardPage,
});

function fmtNGN(n: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);
}

function DashboardPage() {
  const [perf, setPerf] = useState<PerfReport>(loadPerfReport());
  useEffect(() => { setPerf(loadPerfReport()); }, []);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => {
      const [products, orders, customers, lowStock, recent, recentProducts, unreadNotifications] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("total, status, payment_status, created_at", { count: "exact" }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id, name, stock, low_stock_threshold").order("stock", { ascending: true }).limit(5),
        supabase.from("orders").select("id, order_number, total, status, created_at, customer_name").order("created_at", { ascending: false }).limit(5),
        supabase.from("products").select("id, name, price, status, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
      ]);
      const validOrders = (orders.data ?? []).filter((o) => o.status !== "cancelled");
      const today = new Date().toISOString().slice(0, 10);
      const revenue = validOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
      const todayRevenue = validOrders.filter((o) => o.created_at.slice(0, 10) === today).reduce((s, o) => s + Number(o.total ?? 0), 0);
      return {
        productCount: products.count ?? 0,
        orderCount: orders.count ?? 0,
        customerCount: customers.count ?? 0,
        revenue,
        todayRevenue,
        pending: validOrders.filter((o) => o.status === "pending").length,
        processing: validOrders.filter((o) => o.status === "processing").length,
        delivered: validOrders.filter((o) => o.status === "delivered").length,
        lowStock: lowStock.data ?? [],
        recent: recent.data ?? [],
        recentProducts: recentProducts.data ?? [],
        unreadNotifications: unreadNotifications.count ?? 0,
      };
    },
  });

  const stats = [
    { label: "Revenue", value: data ? fmtNGN(data.revenue) : "—", icon: DollarSign },
    { label: "Orders", value: data?.orderCount ?? "—", icon: ShoppingCart },
    { label: "Products", value: data?.productCount ?? "—", icon: Package },
    { label: "Customers", value: data?.customerCount ?? "—", icon: Users },
    { label: "Today's sales", value: data ? fmtNGN(data.todayRevenue) : "—", icon: Clock3 },
    { label: "Pending orders", value: data?.pending ?? "—", icon: Clock3 },
    { label: "Processing", value: data?.processing ?? "—", icon: Truck },
    { label: "Delivered", value: data?.delivered ?? "—", icon: CheckCircle2 },
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
          <div className="flex items-center justify-between">
           <h2 className="font-display text-lg mb-4">Recent orders</h2>
           {(data?.unreadNotifications ?? 0) > 0 && (
             <span className="px-2 py-1 text-xs font-bold bg-primary text-primary-foreground rounded-full">
               {data?.unreadNotifications} new
             </span>
           )}
        </div>
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

        <div className="bg-background rounded-2xl border border-border p-6">
          <h2 className="font-display text-lg mb-4">Recent products</h2>
          <div className="space-y-3">
            {(data?.recentProducts ?? []).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                <div><p className="font-medium">{p.name}</p><p className="text-xs text-muted-foreground capitalize">{p.status}</p></div>
                <span>{fmtNGN(Number(p.price))}</span>
              </div>
            ))}
            {!isLoading && (data?.recentProducts ?? []).length === 0 && <p className="text-sm text-muted-foreground">No products yet</p>}
          </div>
        </div>
      </div>

      <div className="bg-background rounded-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Performance & bandwidth</h2>
          <button className="btn-ghost text-xs" onClick={() => { resetPerfReport(); setPerf(loadPerfReport()); }}>Reset</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
          <div><p className="text-xs text-muted-foreground">API requests</p><p className="font-display text-xl">{perf.apiRequests}</p></div>
          <div><p className="text-xs text-muted-foreground">Unique endpoints</p><p className="font-display text-xl">{perf.uniqueApiEndpoints}</p></div>
          <div><p className="text-xs text-muted-foreground">Image loads</p><p className="font-display text-xl">{perf.imageLoads}</p></div>
          <div><p className="text-xs text-muted-foreground">Image errors</p><p className="font-display text-xl">{perf.imageErrors}</p></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4 p-4 bg-muted/50 rounded-xl">
          <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /><p className="text-xs text-muted-foreground">Duplicate rate</p><p className="font-display text-xl font-bold text-primary">{getBandwidthSummary().duplicateRate}%</p></div>
          <div className="flex items-center gap-2"><Repeat className="h-4 w-4 text-amber-500" /><p className="text-xs text-muted-foreground">Repeated requests</p><p className="font-display text-xl font-bold text-amber-500">{perf.duplicateRequests}</p></div>
          <div className="flex items-center gap-2"><p className="text-xs text-muted-foreground">Session started</p><p className="font-display text-xl font-mono text-xs">{new Date(perf.sessionStart).toLocaleTimeString()}</p></div>
          <div className="flex items-center gap-2"><p className="text-xs text-muted-foreground">Total requests</p><p className="font-display text-xl">{getBandwidthSummary().totalRequests}</p></div>
        </div>
        {getBandwidthSummary().topDuplicates.length > 0 && (
          <div className="mt-4 space-y-1 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 flex items-center gap-1"><Repeat className="h-3 w-3" /> Top repeated endpoints</p>
            {getBandwidthSummary().topDuplicates.map((d: { endpoint: string; count: number }, i: number) => (
              <p key={i} className="text-xs text-amber-800 truncate font-mono">{d.endpoint} ×{d.count}</p>
            ))}
          </div>
        )}
        {perf.recentImageErrors.length > 0 && (
          <div className="mt-4 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Recent image errors</p>
            {perf.recentImageErrors.slice(0, 5).map((e: { url: string; at: string }, i: number) => (
              <p key={i} className="text-xs text-destructive truncate">{e.url}</p>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">Counts are stored locally in this browser. Reset after investigating.</p>
      </div>
    </div>
  );
}

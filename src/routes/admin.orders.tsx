import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtNGN, fmtDate } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/orders")({ component: OrdersPage });

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
type Status = typeof STATUSES[number];
const statusClass: Record<Status, string> = {
  pending: "bg-amber-100 text-amber-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

type Order = {
  id: string;
  user_id: string | null;
  order_number: string | null;
  customer_name: string | null;
  customer_email: string | null;
  total: number;
  status: Status;
  created_at: string;
  customer_phone?: string | null;
  shipping_address?: unknown;
  subtotal?: number | null;
  discount?: number | null;
  shipping?: number | null;
};

function OrdersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("id, user_id, order_number, customer_name, customer_email, total, status, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const filtered = useMemo(() => orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (!q) return true;
    const query = q.toLowerCase();
    return [o.order_number, o.customer_name, o.customer_email]
      .some((value) => typeof value === "string" && value.toLowerCase().includes(query));
  }), [orders, q, filter]);

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-orders"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl">Orders</h1><p className="text-sm text-muted-foreground mt-1">{filtered.length} of {orders.length}</p></div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by # or customer…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Order</th><th className="p-3">Customer</th><th className="p-3">Total</th>
                <th className="p-3">Date</th><th className="p-3">Status</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
               filtered.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No orders.</td></tr> :
               filtered.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="p-3 font-medium">{o.order_number ?? o.id}</td>
                  <td className="p-3">
                    <p>{o.customer_name ?? "Guest"}</p>
                    <p className="text-xs text-muted-foreground">{o.customer_email ?? "—"}</p>
                  </td>
                  <td className="p-3">{fmtNGN(o.total ?? 0)}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(o.created_at)}</td>
                  <td className="p-3">
                    <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v as Status })}>
                      <SelectTrigger className={`h-7 w-32 text-xs capitalize ${statusClass[o.status]}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    <button onClick={() => setViewing(o.id)} className="p-2 hover:bg-muted rounded"><Eye className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailDialog orderId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function OrderDetailDialog({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data } = useQuery({
    queryKey: ["admin-order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [orderRes, itemsRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, customer_name, customer_email, customer_phone, total, status, created_at, shipping_address, subtotal, discount, shipping").eq("id", orderId!).single(),
        supabase.from("order_items").select("id, product_name, unit_price, quantity, subtotal").eq("order_id", orderId!),
      ]);

      if (orderRes.error) throw orderRes.error;
      if (itemsRes.error) throw itemsRes.error;

      return { order: orderRes.data, items: itemsRes.data ?? [] };
    },
  });

  return (
    <Dialog open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{data?.order?.order_number ?? "Order"}</DialogTitle></DialogHeader>
        {data?.order && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Customer</p>
                <p>{data.order.customer_name ?? "Guest"}</p>
                <p className="text-xs">{data.order.customer_email ?? "—"}</p>
                {data.order.customer_phone && <p className="text-xs">{data.order.customer_phone}</p>}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p>{fmtDate(data.order.created_at)}</p>
              </div>
            </div>
            {data.order.shipping_address && (
              <div>
                <p className="text-xs text-muted-foreground">Shipping address</p>
                <pre className="text-xs bg-muted p-2 rounded">{JSON.stringify(data.order.shipping_address, null, 2)}</pre>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Items</p>
              <div className="space-y-1">
                {data.items.map((it) => (
                  <div key={it.id} className="flex justify-between border-b border-border py-1">
                    <span>{it.product_name} × {it.quantity}</span>
                    <span>{fmtNGN(it.subtotal ?? 0)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-1 pt-2 border-t border-border">
              <div className="flex justify-between text-xs"><span>Subtotal</span><span>{fmtNGN(data.order.subtotal ?? 0)}</span></div>
              {Number(data.order.discount ?? 0) > 0 && (
                <div className="flex justify-between text-xs"><span>Discount</span><span>-{fmtNGN(data.order.discount ?? 0)}</span></div>
              )}
              <div className="flex justify-between text-xs"><span>Shipping</span><span>{fmtNGN(data.order.shipping ?? 0)}</span></div>
              <div className="flex justify-between font-display text-lg pt-1"><span>Total</span><span>{fmtNGN(data.order.total ?? 0)}</span></div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { fmtNGN, fmtDate } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/customers")({ component: CustomersPage });

function CustomersPage() {
  const [q, setQ] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      const { data: orders } = await supabase.from("orders").select("user_id, total, customer_email");
      const map = new Map<string, { count: number; total: number }>();
      (orders ?? []).forEach((o) => {
        const key = o.user_id ?? o.customer_email;
        if (!key) return;
        const cur = map.get(key) ?? { count: 0, total: 0 };
        cur.count += 1; cur.total += Number(o.total || 0);
        map.set(key, cur);
      });
      return (profiles ?? []).map((p) => ({ ...p, email: orders?.find((o) => o.user_id === p.user_id)?.customer_email ?? "", stats: map.get(p.user_id) ?? { count: 0, total: 0 } }));
    },
  });

  const filtered = useMemo(() => data.filter((c) => !q || (c.display_name?.toLowerCase().includes(q.toLowerCase()) || c.phone?.includes(q))), [data, q]);

  return (
    <div className="space-y-6">
      <div><h1 className="font-display text-3xl">Customers</h1><p className="text-sm text-muted-foreground mt-1">{filtered.length} of {data.length}</p></div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th>
                <th className="p-3">Orders</th><th className="p-3">Spent</th><th className="p-3">Joined</th><th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
               filtered.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No customers.</td></tr> :
               filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-medium">{c.display_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.email || "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="p-3">{c.stats.count}</td>
                  <td className="p-3">{fmtNGN(c.stats.total)}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                  <td className="p-3 text-right"><button onClick={() => setViewing(c.user_id)} className="p-2 hover:bg-muted rounded" title="View order history"><Eye className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <CustomerOrdersDialog userId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function CustomerOrdersDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-customer-orders", userId], enabled: !!userId, queryFn: async () => { const { data, error } = await supabase.from("orders").select("order_number, total, status, created_at").eq("user_id", userId!).order("created_at", { ascending: false }); if (error) throw error; return data ?? []; } });
  return <Dialog open={!!userId} onOpenChange={(open) => !open && onClose()}><DialogContent><DialogHeader><DialogTitle>Customer order history</DialogTitle></DialogHeader>{isLoading ? <p>Loading…</p> : data.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet.</p> : <div className="space-y-2">{data.map((order) => <div key={order.order_number} className="flex justify-between border-b border-border py-2 text-sm"><span>{order.order_number}<span className="ml-2 text-muted-foreground capitalize">{order.status}</span></span><span>{fmtNGN(Number(order.total))}</span></div>)}</div>}</DialogContent></Dialog>;
}

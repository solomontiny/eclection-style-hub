import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { fmtNGN, fmtDate } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/customers")({ component: CustomersPage });

function CustomersPage() {
  const [q, setQ] = useState("");

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
      return (profiles ?? []).map((p) => ({ ...p, stats: map.get(p.user_id) ?? { count: 0, total: 0 } }));
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
                <th className="p-3">Name</th><th className="p-3">Phone</th>
                <th className="p-3">Orders</th><th className="p-3">Spent</th><th className="p-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
               filtered.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No customers.</td></tr> :
               filtered.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-medium">{c.display_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.phone ?? "—"}</td>
                  <td className="p-3">{c.stats.count}</td>
                  <td className="p-3">{fmtNGN(c.stats.total)}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Minus, Plus, Search } from "lucide-react";

export const Route = createFileRoute("/admin/inventory")({ component: InventoryPage });

type Row = { id: string; name: string; stock: number; low_stock_threshold: number | null; status: string };

function InventoryPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "out">("all");

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock, low_stock_threshold, status")
        .order("stock", { ascending: true });
      if (error) throw error;
      return data as Row[];
    },
  });

  const mutate = useMutation({
    mutationFn: async (patch: { id: string; stock?: number; low_stock_threshold?: number }) => {
      const { id, ...fields } = patch;
      const { error } = await supabase.from("products").update(fields).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Updated");
      qc.invalidateQueries({ queryKey: ["admin-inventory"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = useMemo(() => {
    return data.filter((p) => {
      const threshold = p.low_stock_threshold ?? 5;
      if (filter === "low" && !(p.stock > 0 && p.stock <= threshold)) return false;
      if (filter === "out" && p.stock !== 0) return false;
      if (q && !p.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [data, q, filter]);

  const lowCount = data.filter((p) => p.stock > 0 && p.stock <= (p.low_stock_threshold ?? 5)).length;
  const outCount = data.filter((p) => p.stock === 0).length;
  const totalUnits = data.reduce((s, p) => s + (p.stock || 0), 0);

  const stats = [
    { label: "Products", value: data.length, tone: "" },
    { label: "Units in stock", value: totalUnits, tone: "" },
    { label: "Low stock", value: lowCount, tone: lowCount ? "text-amber-600" : "" },
    { label: "Out of stock", value: outCount, tone: outCount ? "text-red-600" : "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl">Inventory</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage stock levels and thresholds</p>
        </div>
        {lowCount + outCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertTriangle className="h-4 w-4" /> {lowCount + outCount} item{lowCount + outCount > 1 ? "s" : ""} need attention
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-background rounded-2xl border border-border p-5">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</p>
            <p className={`font-display text-2xl mt-2 ${s.tone}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="pl-9" />
        </div>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(["all", "low", "out"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded-md capitalize ${filter === f ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
            >
              {f === "all" ? "All" : f === "low" ? "Low stock" : "Out of stock"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Product</th>
                <th className="p-3">Status</th>
                <th className="p-3">Low-stock threshold</th>
                <th className="p-3 w-64">Stock</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No products match</td></tr>
              ) : (
                rows.map((p) => {
                  const threshold = p.low_stock_threshold ?? 5;
                  const out = p.stock === 0;
                  const low = !out && p.stock <= threshold;
                  return (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-3">
                        <p className="font-medium">{p.name}</p>
                        {out && <span className="text-[10px] uppercase tracking-wider text-red-600 font-semibold">Out of stock</span>}
                        {low && <span className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">Low stock</span>}
                      </td>
                      <td className="p-3 capitalize text-muted-foreground">{p.status}</td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min={0}
                          defaultValue={threshold}
                          className="h-8 w-20"
                          onBlur={(e) => {
                            const v = Math.max(0, Number(e.target.value));
                            if (v !== threshold) mutate.mutate({ id: p.id, low_stock_threshold: v });
                          }}
                        />
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => mutate.mutate({ id: p.id, stock: Math.max(0, p.stock - 1) })}
                            className="h-8 w-8 rounded-md border border-border hover:bg-muted flex items-center justify-center"
                            aria-label="Decrease"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <Input
                            key={p.stock}
                            type="number"
                            min={0}
                            defaultValue={p.stock}
                            className={`h-8 w-20 text-center ${out ? "border-red-500" : low ? "border-amber-500" : ""}`}
                            onBlur={(e) => {
                              const v = Math.max(0, Number(e.target.value));
                              if (v !== p.stock) mutate.mutate({ id: p.id, stock: v });
                            }}
                          />
                          <button
                            onClick={() => mutate.mutate({ id: p.id, stock: p.stock + 1 })}
                            className="h-8 w-8 rounded-md border border-border hover:bg-muted flex items-center justify-center"
                            aria-label="Increase"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              const v = window.prompt("Add units to stock", "10");
                              if (v === null) return;
                              const n = Number(v);
                              if (!Number.isFinite(n)) return;
                              mutate.mutate({ id: p.id, stock: Math.max(0, p.stock + n) });
                            }}
                            className="h-8 px-2 rounded-md border border-border text-xs hover:bg-muted ml-1"
                          >
                            + Restock
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

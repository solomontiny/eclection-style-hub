import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/inventory")({ component: InventoryPage });

function InventoryPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-inventory"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, stock, low_stock_threshold, status").order("stock", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const updateStock = useMutation({
    mutationFn: async ({ id, stock }: { id: string; stock: number }) => {
      const { error } = await supabase.from("products").update({ stock }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Stock updated"); qc.invalidateQueries({ queryKey: ["admin-inventory"] }); qc.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const lowCount = data.filter((p) => p.stock <= (p.low_stock_threshold ?? 5)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div><h1 className="font-display text-3xl">Inventory</h1><p className="text-sm text-muted-foreground mt-1">{data.length} products</p></div>
        {lowCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            <AlertTriangle className="h-4 w-4" /> {lowCount} low-stock item{lowCount > 1 ? "s" : ""}
          </div>
        )}
      </div>

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="text-left">
              <th className="p-3">Product</th><th className="p-3">Status</th>
              <th className="p-3">Threshold</th><th className="p-3 w-40">Stock</th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
               data.map((p) => {
                const low = p.stock <= (p.low_stock_threshold ?? 5);
                return (
                  <tr key={p.id} className="border-t border-border">
                    <td className="p-3 font-medium">{p.name}</td>
                    <td className="p-3 capitalize text-muted-foreground">{p.status}</td>
                    <td className="p-3 text-muted-foreground">{p.low_stock_threshold}</td>
                    <td className="p-3">
                      <Input
                        type="number"
                        defaultValue={p.stock}
                        className={`h-8 w-24 ${low ? "border-amber-500" : ""}`}
                        onBlur={(e) => { const v = Number(e.target.value); if (v !== p.stock) updateStock.mutate({ id: p.id, stock: v }); }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

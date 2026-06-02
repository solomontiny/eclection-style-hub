import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export const Route = createFileRoute("/admin/coupons")({ component: CouponsPage });

type Coupon = {
  id: string; code: string; description: string | null;
  discount_type: "percent" | "fixed"; discount_value: number;
  min_order_amount: number | null; usage_limit: number | null; used_count: number;
  active: boolean; expires_at: string | null;
};

function CouponsPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Coupon[];
    },
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Coupon>) => {
      const payload = {
        code: c.code!.toUpperCase(),
        description: c.description ?? null,
        discount_type: c.discount_type ?? "percent",
        discount_value: Number(c.discount_value ?? 0),
        min_order_amount: c.min_order_amount ? Number(c.min_order_amount) : 0,
        usage_limit: c.usage_limit ? Number(c.usage_limit) : null,
        active: c.active ?? true,
        expires_at: c.expires_at || null,
      };
      if (c.id) { const { error } = await supabase.from("coupons").update(payload).eq("id", c.id); if (error) throw error; }
      else { const { error } = await supabase.from("coupons").insert(payload); if (error) throw error; }
    },
    onSuccess: () => { toast.success("Saved"); setOpen(false); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("coupons").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-coupons"] }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div><h1 className="font-display text-3xl">Coupons</h1><p className="text-sm text-muted-foreground mt-1">{data.length} total</p></div>
        <button onClick={() => { setEditing({ discount_type: "percent", active: true }); setOpen(true); }} className="btn-primary flex items-center gap-2"><Plus className="h-4 w-4" /> New</button>
      </div>

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="text-left">
              <th className="p-3">Code</th><th className="p-3">Discount</th>
              <th className="p-3">Used</th><th className="p-3">Status</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
               data.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No coupons yet.</td></tr> :
               data.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-mono font-medium">{c.code}</td>
                  <td className="p-3">{c.discount_type === "percent" ? `${c.discount_value}%` : `₦${c.discount_value}`}</td>
                  <td className="p-3">{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ""}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${c.active ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                      {c.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1">
                      <button onClick={() => { setEditing(c); setOpen(true); }} className="p-2 hover:bg-muted rounded"><Pencil className="h-4 w-4" /></button>
                      <ConfirmDialog trigger={<button className="p-2 hover:bg-muted rounded text-destructive"><Trash2 className="h-4 w-4" /></button>} title={`Delete ${c.code}?`} onConfirm={() => del.mutateAsync(c.id)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.id ? "Edit" : "New"} coupon</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Code</Label><Input value={editing?.code ?? ""} onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })} placeholder="SAVE10" /></div>
            <div><Label>Description</Label><Input value={editing?.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select value={editing?.discount_type ?? "percent"} onValueChange={(v) => setEditing({ ...editing, discount_type: v as "percent" | "fixed" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percent">Percent (%)</SelectItem><SelectItem value="fixed">Fixed (₦)</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Value</Label><Input type="number" value={editing?.discount_value ?? 0} onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Min order (₦)</Label><Input type="number" value={editing?.min_order_amount ?? 0} onChange={(e) => setEditing({ ...editing, min_order_amount: Number(e.target.value) })} /></div>
              <div><Label>Usage limit</Label><Input type="number" value={editing?.usage_limit ?? ""} placeholder="∞" onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
            <div><Label>Expires at</Label><Input type="datetime-local" value={editing?.expires_at?.slice(0,16) ?? ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value || null })} /></div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing?.active ?? true} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} /> Active</label>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="btn-ghost">Cancel</button>
              <button onClick={() => editing?.code && save.mutate(editing)} className="btn-primary">Save</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

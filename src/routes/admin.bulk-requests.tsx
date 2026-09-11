import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/bulk-requests")({ component: BulkRequestsPage });

const STATUSES = ["New", "Contacted", "In Discussion", "Confirmed", "Completed", "Cancelled"] as const;
type Status = typeof STATUSES[number];

function BulkRequestsPage() {
  const qc = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["admin-bulk-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bulk_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await supabase.from("bulk_requests").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["admin-bulk-requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl">Bulk/Wholesale Requests</h1>
      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Customer</th><th className="p-3">Quantity</th><th className="p-3">Date</th><th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Loading…</td></tr> :
               requests.length === 0 ? <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No requests.</td></tr> :
               requests.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-3"><p className="font-medium">{r.customer_name}</p><p className="text-xs text-muted-foreground">{r.whatsapp_number} | {r.country}</p></td>
                  <td className="p-3">{r.quantity}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(r.created_at)}</td>
                  <td className="p-3">
                    <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v as Status })}>
                      <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

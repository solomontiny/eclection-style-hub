import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmtDate } from "@/lib/admin-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, Phone, Mail, Package, MessageSquare, UserRound } from "lucide-react";

export const Route = createFileRoute("/admin/bulk-requests")({ component: BulkRequestsPage });

const STATUSES = ["New", "Contacted", "In Discussion", "Confirmed", "Completed", "Cancelled"] as const;
type Status = typeof STATUSES[number];

type BulkRequest = {
  id: string;
  customer_name: string;
  whatsapp_number: string;
  country: string;
  delivery_country: string;
  delivery_city: string;
  quantity: number;
  products_requested: unknown;
  notes: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
};

type ProductRequest = {
  name: string;
  quantity: string;
  size: string;
  colour: string;
  notes: string;
};

const STATUS_CLASSES: Record<Status, string> = {
  New: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  Contacted: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  "In Discussion": "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  Confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  Completed: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
  Cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const bulkRequestsTable = () =>
  (supabase.from as unknown as (table: string) => any)("bulk_requests");

function valueOrUnavailable(value: unknown) {
  return value === null || value === undefined || value === "" ? "Not provided" : String(value);
}

function getStatusClass(status: Status) {
  return STATUS_CLASSES[status] || "bg-muted text-muted-foreground";
}

function parseProductRequests(value: unknown): ProductRequest[] {
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item !== "object" || item === null) {
        return { name: String(item), quantity: "Not specified", size: "Not specified", colour: "Not specified", notes: "Not specified" };
      }
      const record = item as Record<string, unknown>;
      return {
        name: valueOrUnavailable(record.name ?? record.product_name ?? record.design ?? record.title),
        quantity: valueOrUnavailable(record.quantity ?? record.qty ?? record.count),
        size: valueOrUnavailable(record.size ?? record.sizes),
        colour: valueOrUnavailable(record.colour ?? record.color ?? record.colours ?? record.colors),
        notes: valueOrUnavailable(record.notes ?? record.note ?? record.details),
      };
    });
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.products)) return parseProductRequests(record.products);
    if (Array.isArray(record.items)) return parseProductRequests(record.items);
    if (record.name || record.product_name || record.design || record.title) {
      return parseProductRequests([record]);
    }
  }

  return [];
}

function BulkRequestsPage() {
  const qc = useQueryClient();
  const [viewing, setViewing] = useState<string | null>(null);
  const { data: requests = [], isLoading, isError } = useQuery({
    queryKey: ["admin-bulk-requests"],
    queryFn: async () => {
      const { data, error } = await bulkRequestsTable().select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as BulkRequest[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Status }) => {
      const { error } = await bulkRequestsTable().update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-bulk-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-bulk-request", viewing] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Bulk/Wholesale Requests</h1>
        <p className="text-sm text-muted-foreground mt-1">Review customer requirements and move each request through the existing workflow.</p>
      </div>

      {isError && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">Could not load bulk requests. Please refresh and try again.</div>}

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm" aria-label="Bulk and wholesale requests">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Customer</th>
                <th className="p-3">Quantity</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading requests…</td></tr> :
               requests.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No requests yet.</td></tr> :
               requests.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3 min-w-[210px]">
                    <p className="font-medium">{valueOrUnavailable(r.customer_name)}</p>
                    <p className="text-xs text-muted-foreground">{valueOrUnavailable(r.whatsapp_number)} · {valueOrUnavailable(r.country)}</p>
                  </td>
                  <td className="p-3 font-medium whitespace-nowrap">{r.quantity} pieces</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{fmtDate(r.created_at)}</td>
                  <td className="p-3">
                    <Select value={r.status} onValueChange={(v) => updateStatus.mutate({ id: r.id, status: v as Status })}>
                      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label={`Status for request from ${r.customer_name || "customer"}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
                    <button type="button" onClick={() => setViewing(r.id)} className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg px-3 text-sm text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <BulkRequestDetailDialog requestId={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}

function BulkRequestDetailDialog({ requestId, onClose }: { requestId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: request, isLoading, isError } = useQuery({
    queryKey: ["admin-bulk-request", requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await bulkRequestsTable().select("*").eq("id", requestId!).single();
      if (error) throw error;
      return data as BulkRequest;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: Status) => {
      const { error } = await bulkRequestsTable().update({ status, updated_at: new Date().toISOString() }).eq("id", requestId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status updated");
      qc.invalidateQueries({ queryKey: ["admin-bulk-requests"] });
      qc.invalidateQueries({ queryKey: ["admin-bulk-request", requestId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const productRequests = parseProductRequests(request?.products_requested);
  const hasStructuredProducts = productRequests.length > 0;

  return (
    <Dialog open={!!requestId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Bulk Request Details</DialogTitle>
        </DialogHeader>

        {isLoading && <div className="py-10 text-center text-sm text-muted-foreground">Loading request…</div>}
        {isError && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">Could not load this request.</div>}
        {!isLoading && !isError && !request && <div className="py-10 text-center text-sm text-muted-foreground">Request not found.</div>}

        {request && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Badge className={getStatusClass(request.status)}>{request.status}</Badge>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Select value={request.status} onValueChange={(v) => updateStatus.mutate(v as Status)}>
                  <SelectTrigger className="w-[160px]" aria-label="Update request status"><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <section className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground" /> Customer details</h4>
              <div className="space-y-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Name</span><span className="font-medium text-right">{valueOrUnavailable(request.customer_name)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">WhatsApp</span><span className="font-medium text-right break-all">{valueOrUnavailable(request.whatsapp_number)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Country</span><span className="font-medium text-right">{valueOrUnavailable(request.country)}</span></div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> Delivery information</h4>
              <div className="space-y-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Delivery country</span><span className="font-medium text-right">{valueOrUnavailable(request.delivery_country)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Delivery city</span><span className="font-medium text-right">{valueOrUnavailable(request.delivery_city)}</span></div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Request details</h4>
              <div className="space-y-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Requested quantity</span><span className="font-medium text-right">{request.quantity} pieces</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Submitted</span><span className="font-medium text-right">{fmtDate(request.created_at)}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Last updated</span><span className="font-medium text-right">{fmtDate(request.updated_at)}</span></div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Products and preferences</h4>
              {!hasStructuredProducts && (
                <div className="rounded-lg border border-border/50 bg-muted/20 p-4 text-center text-muted-foreground">
                  {request.products_requested ? "Product details are stored in the original request data." : "No product preferences were provided."}
                </div>
              )}
              {hasStructuredProducts && (
                <div className="space-y-2.5">
                  {productRequests.map((product, index) => (
                    <div key={`${product.name}-${index}`} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-snug">{product.name}</p>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className="rounded border border-border/60 bg-background px-2 py-0.5 text-xs">Qty: {product.quantity}</span>
                            <span className="rounded border border-border/60 bg-background px-2 py-0.5 text-xs">Size: {product.size}</span>
                            <span className="rounded border border-border/60 bg-background px-2 py-0.5 text-xs">Colour: {product.colour}</span>
                          </div>
                        </div>
                        {product.notes !== "Not specified" && <p className="text-xs text-muted-foreground sm:text-right">{product.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h4 className="font-medium text-foreground flex items-center gap-2"><MessageSquare className="h-4 w-4 text-muted-foreground" /> Notes</h4>
              <p className="whitespace-pre-wrap rounded-lg border border-border/50 bg-muted/20 p-3">{valueOrUnavailable(request.notes)}</p>
            </section>

            <section className="space-y-2">
              <h4 className="font-medium text-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Contact</h4>
              <div className="flex flex-col gap-1.5 rounded-lg border border-border/50 bg-muted/20 p-3">
                <span className="text-muted-foreground">WhatsApp</span>
                <a className="text-primary underline-offset-4 hover:underline break-all" href={`https://wa.me/${String(request.whatsapp_number || "").replace(/\D/g, "")}`}>{valueOrUnavailable(request.whatsapp_number)}</a>
              </div>
            </section>

            <Separator />

            <div className="grid gap-3 text-xs text-muted-foreground rounded-lg border border-border/50 bg-muted/20 p-3 sm:grid-cols-2">
              <div><span>Created</span><br /><span className="font-medium text-foreground">{fmtDate(request.created_at)}</span></div>
              <div><span>Updated</span><br /><span className="font-medium text-foreground">{fmtDate(request.updated_at)}</span></div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Eye, CreditCard, Package, MapPin, Mail, Phone, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { fmtNGN, fmtDate } from "@/lib/admin-utils";
import { sendDeliveryNotification } from "@/lib/orders.functions";
import { cancelOrder } from "@/lib/cancel-order.functions";
import { sendCustomerStatusChangeEmail } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin/orders")({ component: OrdersPage });

type OrderStatus = "pending" | "processing" | "shipped" | "out_for_delivery" | "delivered" | "cancelled";
type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

type ShippingAddress = {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  delivery_instructions?: string | null;
};

/** Open the customer's delivery address in an external map service. */
function buildDirectionsUrl(addr: ShippingAddress | null): string {
  if (!addr || !addr.address) return "#";
  const parts = [addr.address, addr.city, addr.state, addr.country, addr.postal_code]
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  const query = parts.join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type Order = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: string;
  shipping_address?: ShippingAddress | null;
  tracking_number?: string | null;
  paystack_reference?: string | null;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  subtotal: number;
  size?: string;
  color?: string;
  is_bulk?: boolean;
  product?: { name: string; images?: string[] } | null;
};

const STATUS_CLASSES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  shipped: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200",
  out_for_delivery: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const PAYMENT_CLASSES: Record<PaymentStatus, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

function valueOrUnavailable(val?: string | null) {
  if (!val || !val.trim()) return "—";
  return val;
}

function OrdersPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const urlOrderId = search.orderId as string | undefined;
  const [q, setQ] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Auto-open order detail dialog from URL query parameter
  useEffect(() => {
    if (urlOrderId && urlOrderId !== viewing) {
      setViewing(urlOrderId);
    } else if (!urlOrderId && viewing) {
      setViewing(null);
    }
  }, [urlOrderId, viewing]);

  // Sync URL when dialog opens/closes via UI
  useEffect(() => {
    if (viewing) {
      navigate({ search: { ...search, orderId: viewing } }, { replace: true });
    } else if (urlOrderId) {
      navigate({ search: { ...search, orderId: undefined } }, { replace: true });
    }
  }, [viewing, urlOrderId, search, navigate]);

  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
    refetchInterval: 30000,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await sendCustomerStatusChangeEmail({ data: { orderId: id } });
    },
    onSuccess: () => {
      toast.success("Status updated and customer notified");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-order", viewing] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await cancelOrder({ data: { orderId: id } });
      return result;
    },
    onSuccess: (result) => {
      toast.success(result.stockRestored ? "Order cancelled and stock restored" : "Order cancelled");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-order", viewing] });
      qc.invalidateQueries({ queryKey: ["unread-notifications"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: ord } = await supabase.from("orders").select("status, payment_status").eq("id", id).single();
      if (ord && ord.status !== "cancelled" && ord.payment_status !== "refunded") {
        const { data: items } = await supabase.from("order_items").select("product_id, quantity").eq("order_id", id);
        if (items && items.length > 0) {
          for (const item of items) {
            if (item.product_id) {
              await supabase.rpc("restore_stock", { p_product_id: item.product_id, p_qty: Number(item.quantity) });
            }
          }
        }
      }
      const { error } = await supabase.from("orders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Order deleted successfully.");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-customers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesQuery = !query || [o.order_number, o.customer_name, o.customer_email, o.customer_phone]
        .some((value) => String(value ?? "").toLowerCase().includes(query));
      const matchesPayment = paymentFilter === "all" || o.payment_status === paymentFilter;
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesQuery && matchesPayment && matchesStatus;
    });
  }, [orders, q, paymentFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Orders</h1>
        <p className="text-sm text-muted-foreground mt-1">Review payments, fulfilment, and delivery details.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search orders or customers..." className="pl-9" />
        </label>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Payment status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All payments</SelectItem>
            {Object.keys(PAYMENT_CLASSES).map((status) => <SelectItem key={status} value={status}>{status}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Order status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.keys(STATUS_CLASSES).map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError && <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">Could not load orders. Please refresh and try again.</div>}

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm" aria-label="Orders">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Order</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Total</th>
                <th className="p-3">Date</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Loading orders…</td></tr> :
               filtered.length === 0 ? <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No orders match these filters.</td></tr> :
               filtered.map((o) => (
                <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                  <td className="p-3 font-medium whitespace-nowrap">{o.order_number}</td>
                  <td className="p-3 min-w-[180px]"><p className="font-medium">{valueOrUnavailable(o.customer_name)}</p><p className="text-xs text-muted-foreground truncate max-w-[180px]">{valueOrUnavailable(o.customer_email)}</p></td>
                  <td className="p-3 font-display text-primary whitespace-nowrap">{fmtNGN(o.total)}</td>
                  <td className="p-3 text-muted-foreground whitespace-nowrap">{fmtDate(o.created_at)}</td>
                  <td className="p-3"><Badge className={getPaymentClass(o.payment_status)}>{o.payment_status}</Badge></td>
                  <td className="p-3">
                    <Select
                      value={o.status}
                      onValueChange={(v) => {
                        if (v === "__delete__") {
                          setConfirmDeleteId(o.id);
                        } else {
                          updateStatus.mutate({ id: o.id, status: v as OrderStatus });
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label={`Status for order ${o.order_number}`}><SelectValue /></SelectTrigger>
                      <SelectContent className="z-[100]">
                        {Object.keys(STATUS_CLASSES).map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}
                        <div className="my-1 border-t border-border" />
                        <SelectItem value="__delete__" className="text-destructive font-medium focus:text-destructive focus:bg-destructive/10">Delete Order</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right space-x-1 whitespace-nowrap">
                    <button type="button" onClick={() => setViewing(o.id)} className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm text-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`View order ${o.order_number}`}>
                      <Eye className="h-4 w-4" /> View
                    </button>
                    {o.status !== "cancelled" && (
                      <button type="button" onClick={() => cancelOrderMutation.mutate(o.id)} disabled={cancelOrderMutation.isPending} className="inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50" aria-label={`Cancel order ${o.order_number}`}>
                        <XCircle className="h-4 w-4" /> Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <OrderDetailDialog orderId={viewing} onClose={() => setViewing(null)} />

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this order from the Orders list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deletingBusy}
              onClick={async (e) => {
                e.preventDefault();
                if (!confirmDeleteId) return;
                setDeletingBusy(true);
                try {
                  await deleteOrderMutation.mutateAsync(confirmDeleteId);
                  setConfirmDeleteId(null);
                } finally {
                  setDeletingBusy(false);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBusy ? "Deleting…" : "Delete Order"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function OrderDetailDialog({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [tracking, setTracking] = useState("");
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-order", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const [orderResult, itemsResult] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId!).single(),
        supabase.from("order_items").select("*, product:products(name, images)").eq("order_id", orderId!),
      ]);
      if (orderResult.error) throw orderResult.error;
      if (itemsResult.error) throw itemsResult.error;
      return { order: orderResult.data as Order | null, items: (itemsResult.data ?? []) as OrderItem[] };
    },
  });

  useEffect(() => {
    if (orderId) {
      void supabase.from("notifications").update({ is_read: true }).eq("order_id", orderId).is("is_read", false);
      qc.invalidateQueries({ queryKey: ["unread-notifications"] });
    }
  }, [orderId, qc]);

  useEffect(() => { if (data?.order) setTracking(data.order.tracking_number ?? ""); }, [data]);

  const updateTracking = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("orders").update({ tracking_number: tracking, updated_at: new Date().toISOString() }).eq("id", orderId!);
      if (error) throw error;
      await sendDeliveryNotification({ data: { orderId: orderId! } });
    },
    onSuccess: () => {
      toast.success("Tracking updated and notification sent");
      qc.invalidateQueries({ queryKey: ["admin-order", orderId] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.items ?? [];
  const order = data?.order;

  return (
    <Dialog open={!!orderId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order {order?.order_number}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading order details…</p>
        ) : isError || !order ? (
          <p className="text-sm text-destructive py-6 text-center">Failed to load order details.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Customer</p>
                <p className="font-semibold mt-1">{valueOrUnavailable(order.customer_name)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{valueOrUnavailable(order.customer_email)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{valueOrUnavailable(order.customer_phone)}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Payment</p>
                <p className="font-semibold mt-1 capitalize">{order.payment_status}</p>
                {order.paystack_reference && <p className="text-xs text-muted-foreground mt-0.5 truncate">Ref: {order.paystack_reference}</p>}
                <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(order.created_at)}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Total Amount</p>
                <p className="font-display text-lg text-primary mt-1">{fmtNGN(order.total)}</p>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize status-badge">Status: {order.status.replace("_", " ")}</p>
              </div>
            </div>

            {order.shipping_address && (
              <div className="p-4 rounded-xl border border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Shipping Address</p>
                <p className="text-sm mt-1">{order.shipping_address.address || "—"}</p>
                <p className="text-sm text-muted-foreground">{[order.shipping_address.city, order.shipping_address.state, order.shipping_address.country].filter(Boolean).join(", ")} {order.shipping_address.postal_code}</p>
                {order.shipping_address.delivery_instructions && <p className="text-xs text-muted-foreground mt-2 italic">Note: "{order.shipping_address.delivery_instructions}"</p>}
                {order.shipping_address.address && (
                  <a href={buildDirectionsUrl(order.shipping_address)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-3 text-xs text-primary font-medium hover:underline">
                    <MapPin className="h-3.5 w-3.5" /> Open in Google Maps
                  </a>
                )}
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-display text-lg">Order Items ({items.length})</h3>
              <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                {items.map((item) => (
                  <div key={item.id} className="p-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {item.product?.images?.[0] ? (
                        <img src={item.product.images[0]} alt={item.product_name} className="h-12 w-12 rounded object-cover border border-border" />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{item.product_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} {item.size ? `· Size ${item.size}` : ""} {item.color ? `· Color ${item.color}` : ""}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{fmtNGN(item.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border space-y-3">
              <h3 className="font-display text-base">Fulfillment & Tracking</h3>
              <div className="flex gap-3">
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter tracking number or courier info..." className="flex-1" />
                <Button onClick={() => updateTracking.mutate()} disabled={updateTracking.isPending}>
                  {updateTracking.isPending ? "Saving..." : "Save & Notify Customer"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function getPaymentClass(status: PaymentStatus) {
  return PAYMENT_CLASSES[status] ?? "bg-muted text-muted-foreground";
}

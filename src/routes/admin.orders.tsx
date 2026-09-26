import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Eye, CreditCard, Package, MapPin, Mail, Phone, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  created_at: string;
  updated_at: string;
  payment_status: PaymentStatus;
  paystack_reference: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  currency: string;
  coupon_code: string | null;
  notes: string | null;
  shipping_address: unknown;
  tracking_number: string | null;
  user_id: string | null;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  size: string;
  color: string;
  bundle_id: string | null;
  product?: {
    name?: string;
    images?: string[];
  } | null;
};

const STATUS_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  processing: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  shipped: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  out_for_delivery: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
  delivered: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

const PAYMENT_CLASSES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  refunded: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
};

function getStatusClass(status: string) {
  return STATUS_CLASSES[status] || "bg-muted text-muted-foreground";
}

function getPaymentClass(status: string) {
  return PAYMENT_CLASSES[status] || "bg-muted text-muted-foreground";
}

function valueOrUnavailable(value: unknown) {
  return value === null || value === undefined || value === "" ? "Not provided" : String(value);
}

function OrdersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewing, setViewing] = useState<string | null>(null);
  const { data: orders = [], isLoading, isError } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("is_read", false);
      return count ?? 0;
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
                    <Select value={o.status} onValueChange={(v) => updateStatus.mutate({ id: o.id, status: v as OrderStatus })}>
                      <SelectTrigger className="h-8 w-[140px] text-xs" aria-label={`Status for order ${o.order_number}`}><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.keys(STATUS_CLASSES).map((status) => <SelectItem key={status} value={status}>{status.replace("_", " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </td>
                  <td className="p-3 text-right">
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
    <Dialog open={!!orderId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{order?.order_number ?? "Order details"}</DialogTitle>
        </DialogHeader>

        {isLoading && <div className="py-10 text-center text-sm text-muted-foreground">Loading order…</div>}
        {isError && <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-center text-sm text-destructive">Could not load this order.</div>}
        {!isLoading && !isError && !order && <div className="py-10 text-center text-sm text-muted-foreground">Order not found.</div>}

        {order && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl bg-mutated/30 bg-muted/30 border border-border/60">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                <Badge className={getStatusClass(order.status)}>{order.status.replace(/_/g, " ")}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Payment:</span>
                <Badge className={getPaymentClass(order.payment_status)}>{order.payment_status}</Badge>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-muted-foreground">Total:</span>
                <span className="font-display text-xl text-primary">{fmtNGN(order.total)}</span>
              </div>
            </div>

            <Separator />

            <div className="grid gap-5 md:grid-cols-2">
              <section className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /> Customer details</h4>
                <div className="space-y-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Name</span><span className="font-medium text-right">{valueOrUnavailable(order.customer_name)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Email</span><span className="font-medium text-right break-all">{valueOrUnavailable(order.customer_email)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Phone</span><span className="font-medium text-right">{valueOrUnavailable(order.customer_phone)}</span></div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="font-medium text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Order information</h4>
                <div className="space-y-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Order date</span><span className="font-medium text-right">{fmtDate(order.created_at)}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Order number</span><span className="font-medium font-mono text-xs text-right">{order.order_number}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Currency</span><span className="font-medium text-right">{valueOrUnavailable(order.currency)}</span></div>
                  {order.coupon_code && <div className="flex justify-between gap-3"><span className="text-muted-foreground">Coupon</span><span className="font-medium text-right">{order.coupon_code}</span></div>}
                </div>
              </section>
            </div>

            <section className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /> Payment details</h4>
              <div className="grid gap-2.5 p-3 rounded-lg bg-muted/30 border border-border/50 sm:grid-cols-2">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Payment status</span><Badge className={getPaymentClass(order.payment_status)}>{order.payment_status}</Badge></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Paystack reference</span><span className="font-medium text-right break-all">{valueOrUnavailable(order.paystack_reference)}</span></div>
              </div>
            </section>

            <section className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> Delivery location</h4>
              <div className="space-y-2.5 p-3 rounded-lg bg-muted/30 border border-border/50">
                {order.shipping_address ? (
                  <>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Address</span><span className="font-medium text-right">{valueOrUnavailable((order.shipping_address as any)?.address)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">City</span><span className="font-medium text-right">{valueOrUnavailable((order.shipping_address as any)?.city)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">State / Region</span><span className="font-medium text-right">{valueOrUnavailable((order.shipping_address as any)?.state)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Country</span><span className="font-medium text-right">{valueOrUnavailable((order.shipping_address as any)?.country)}</span></div>
                    <div className="flex justify-between gap-3"><span className="text-muted-foreground">Postal / ZIP</span><span className="font-medium text-right">{valueOrUnavailable((order.shipping_address as any)?.postal_code)}</span></div>
                    {(order.shipping_address as any)?.delivery_instructions && (
                      <div className="pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">Delivery instructions</span>
                        <p className="mt-1 text-xs whitespace-pre-wrap">{(order.shipping_address as any).delivery_instructions}</p>
                      </div>
                    )}
                    <div className="pt-2">
                      <a
                        href={buildDirectionsUrl(order.shipping_address as any)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" /> Get directions
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">No delivery address was provided for this order.</p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row pt-2 border-t border-border/50">
                  <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter tracking number" aria-label="Tracking number" />
                  <Button type="button" onClick={() => updateTracking.mutate()} disabled={updateTracking.isPending || !tracking.trim()}>
                    {updateTracking.isPending ? "Saving…" : "Save tracking"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Tracking number: {valueOrUnavailable(order.tracking_number)}</p>
              </div>
            </section>

            {order.notes && (
              <section className="space-y-2">
                <h4 className="font-medium text-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /> Order notes</h4>
                <p className="whitespace-pre-wrap rounded-lg border border-border/50 bg-muted/20 p-3 text-sm">{order.notes}</p>
              </section>
            )}

            <Separator />

            <section className="space-y-3">
              <h4 className="font-medium text-foreground flex items-center gap-2"><Package className="h-4 w-4 text-muted-foreground" /> Order items ({items.length})</h4>
              <div className="space-y-2.5">
                {items.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground">No items are attached to this order.</p>}
                {items.map((it) => {
                  const productImage = it.product?.images?.[0];
                  return (
                    <div key={it.id} className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-3 flex-1">
                          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Package className="absolute inset-0 m-auto h-6 w-6 text-muted-foreground" />
                            {productImage && <img src={productImage} alt={it.product?.name ?? it.product_name} className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug">{it.product_name}</p>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              {it.size && <span className="rounded border border-border/60 bg-background px-2 py-0.5 text-xs">Size: {it.size}</span>}
                              {it.color && <span className="rounded border border-border/60 bg-background px-2 py-0.5 text-xs">Colour: {it.color}</span>}
                              {it.bundle_id && <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-xs text-primary">Bundle: {it.bundle_id}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-border/50 pt-2 text-right sm:w-36 sm:flex-col sm:justify-start sm:border-t-0 sm:pt-0">
                          <span className="text-xs text-muted-foreground">Qty: {it.quantity}</span>
                          <span>{fmtNGN(it.unit_price)} each</span>
                          <span className="font-semibold text-primary">{fmtNGN(it.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <Separator />

            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/20 p-3">
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Subtotal</span><span>{fmtNGN(order.subtotal)}</span></div>
              {Number(order.discount) > 0 && <div className="flex justify-between gap-3 text-green-700 dark:text-green-400"><span>Discount</span><span>-{fmtNGN(order.discount)}</span></div>}
              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Shipping</span><span>{fmtNGN(order.shipping)}</span></div>
              <div className="flex justify-between gap-3 border-t border-border/60 pt-2 font-display text-lg"><span>Total</span><span className="text-primary">{fmtNGN(order.total)}</span></div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

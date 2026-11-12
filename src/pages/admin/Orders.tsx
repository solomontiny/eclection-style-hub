import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, RefreshCw } from "lucide-react";
import {
  verifyBankTransferPayment,
  sendBankTransferReceipt,
  retryPaymentReceipt,
} from "@/lib/orders.functions";
import { cancelOrder } from "@/lib/cancel-order.functions";
import { arrayToCsv, downloadCsv } from "@/lib/csv-export";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getOrderIdFromSearch, setOrderIdInSearch } from "@/lib/admin-order-view.mjs";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
  payment_receipt_status?: string | null;
  customer_phone?: string | null;
  subtotal?: number | null;
  shipping?: number | null;
  discount?: number | null;
  currency?: string | null;
  paystack_reference?: string | null;
  shipping_address?: unknown;
  notes?: string | null;
  tracking_number?: string | null;
};

export function OrdersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(() => getOrderIdFromSearch(window.location.search));

  useEffect(() => {
    const syncOrderFromUrl = () => setViewingId(getOrderIdFromSearch(window.location.search));
    window.addEventListener("popstate", syncOrderFromUrl);
    return () => window.removeEventListener("popstate", syncOrderFromUrl);
  }, []);

  const setOrderUrl = (id: string | null) => {
    const search = setOrderIdInSearch(window.location.search, id);
    window.history.pushState({}, "", `${window.location.pathname}${search}${window.location.hash}`);
    setViewingId(id);
  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", q, statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_email, customer_phone, total, subtotal, shipping, discount, currency, status, payment_method, payment_status, paystack_reference, shipping_address, notes, tracking_number, created_at",
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as OrderRow[];
    },
  });

  const verifyPayment = async (orderId: string) => {
    if (verifyingId) return;
    setVerifyingId(orderId);
    try {
      const result = await verifyBankTransferPayment({ data: { orderId } });
      if (result.status === "error") {
        toast.error(result.message || "Verification failed");
        return;
      }

      if (result.status === "paid") {
        toast.success(((result as unknown) as { message?: string })?.message || "Payment verified");
        try {
          const receipt = await sendBankTransferReceipt({ data: { orderId } });
          if (!receipt.sent) {
            toast.warning("Payment verified, but receipt email was not sent.");
          }
        } catch (receiptError: unknown) {
          toast.warning(
            receiptError instanceof Error
              ? receiptError.message
              : "Payment verified, but receipt email failed.",
          );
        }
      } else {
        toast.success("Payment verified");
      }

      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const retryReceipt = async (orderId: string) => {
    if (retryingId) return;
    setRetryingId(orderId);
    try {
      const result = await retryPaymentReceipt({ data: { orderId } });
      if (result.status === "error") {
        toast.error(result.message || "Receipt retry failed");
        return;
      }
      toast.success(result.sent ? "Receipt sent" : "Receipt retry completed");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Receipt retry failed");
    } finally {
      setRetryingId(null);
    }
  };

  const cancelPendingOrder = async (orderId: string) => {
    if (cancellingId) return;
    setCancellingId(orderId);
    try {
      await cancelOrder({ data: { orderId } });
      toast.success("Order cancelled and reserved stock restored.");
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Order cancellation failed");
    } finally {
      setCancellingId(null);
    }
  };

  const filtered = orders.filter((o) => {
    if (
      q &&
      !o.order_number.toLowerCase().includes(q.toLowerCase()) &&
      !o.customer_name.toLowerCase().includes(q.toLowerCase()) &&
      !o.customer_email.toLowerCase().includes(q.toLowerCase())
    ) {
      return false;
    }
    if (statusFilter !== "all" && o.payment_status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-6 pt-6">
        <div>
          <h1 className="text-2xl font-display">Orders</h1>
          <p className="text-sm text-muted-foreground">{orders.length} orders</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const { data, error } = await supabase.from("orders").select("id, order_number, customer_name, customer_email, customer_phone, total, status, payment_status, payment_method, currency, created_at").order("created_at", { ascending: false });
                if (error) throw error;
                const headers = ["order_number", "customer_name", "customer_email", "customer_phone", "total", "status", "payment_status", "payment_method", "currency", "created_at"];
                const rows = (data || []).map((o: any) => [
                  o.order_number, o.customer_name, o.customer_email, o.customer_phone, o.total, o.status, o.payment_status, o.payment_method, o.currency, o.created_at
                ]);
                const csv = arrayToCsv(headers, rows);
                downloadCsv(`supplieraffordable-orders-${new Date().toISOString().split('T')[0]}.csv`, csv);
                toast.success("Orders exported");
              } catch (e: any) {
                toast.error(e.message || "Export failed");
              }
            }}
          >
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-orders"] })}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <p className="mx-6 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        Orders with stock reservation history cannot be deleted. Cancel an eligible unpaid pending order to restore its stock; reservation history is retained.
      </p>

      <div className="px-6 pb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Input
              placeholder="Search orders, customer name, email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as "all" | "pending" | "paid");
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-6 pb-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Order #</TableHead>
                <TableHead className="w-32">Customer</TableHead>
                <TableHead className="text-right w-20">Total</TableHead>
                <TableHead className="w-24">Method</TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead className="text-right w-28">Created</TableHead>
                <TableHead className="w-40">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-6 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-6 text-center text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono font-medium text-sm">
                      {o.order_number}
                    </TableCell>
                    <TableCell>{o.customer_name}<div className="text-xs text-muted-foreground">{o.customer_email}</div></TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtNGN(Number(o.total))}
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.payment_method === "bank_transfer" ? "outline" : "secondary"}>
                        {o.payment_method?.replace("_", " ") || "Not provided"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.payment_status === "paid" ? "default" : o.payment_status === "pending" ? "outline" : "destructive"}>{o.payment_status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(o.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => setOrderUrl(o.id)}>View Details</Button>
                      {o.status === "pending" && o.payment_status === "pending" ? (
                        <div className="flex flex-wrap gap-2">
                          {o.payment_method === "bank_transfer" && (
                            <Button
                              size="sm"
                              onClick={() => verifyPayment(o.id)}
                              disabled={verifyingId === o.id}
                            >
                              {verifyingId === o.id ? "Verifying..." : "Verify Payment"}
                            </Button>
                          )}
                          <ConfirmDialog
                            trigger={
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={cancellingId === o.id}
                              >
                                {cancellingId === o.id ? "Cancelling..." : "Cancel Order"}
                              </Button>
                            }
                            title={`Cancel order ${o.order_number}?`}
                            description="This will cancel the unpaid order and restore its reserved product stock."
                            confirmLabel="Cancel Order"
                            onConfirm={() => cancelPendingOrder(o.id)}
                          />
                        </div>
                      ) : o.payment_method === "bank_transfer" && o.payment_status === "paid" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryReceipt(o.id)}
                          disabled={retryingId === o.id}
                        >
                          {retryingId === o.id ? "Sending..." : "Retry Receipt"}
                        </Button>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          {o.status === "cancelled" ? "cancelled" : o.payment_status}
                        </Badge>
                      )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      <OrderDetailsDialog orderId={viewingId} onClose={() => setOrderUrl(null)} />
    </div>
  );
}

function OrderDetailsDialog({ orderId, onClose }: { orderId: string | null; onClose: () => void }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-order-detail", orderId], enabled: !!orderId,
    queryFn: async () => {
      const [orderResult, itemResult] = await Promise.all([
        supabase.from("orders").select("*").eq("id", orderId!).maybeSingle(),
        supabase.from("order_items").select("id, product_name, quantity, unit_price, subtotal, size, color, product:products(images)").eq("order_id", orderId!),
      ]);
      if (orderResult.error) throw orderResult.error;
      if (itemResult.error) throw itemResult.error;
      return { order: orderResult.data, items: itemResult.data ?? [] };
    },
  });
  const order = data?.order as (OrderRow & Record<string, unknown>) | null | undefined;
  return <Dialog open={!!orderId} onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
      <DialogHeader><DialogTitle>Order details {order?.order_number ? `— ${order.order_number}` : ""}</DialogTitle></DialogHeader>
      {isLoading && <p className="py-8 text-center">Loading order…</p>}
      {isError && <p role="alert" className="py-8 text-center text-destructive">Could not load this order. Check that the ID is valid and try again.</p>}
      {!isLoading && !isError && !order && <p className="py-8 text-center text-muted-foreground">Order not found.</p>}
      {order && <div className="space-y-5 text-sm">
        <section className="grid gap-3 sm:grid-cols-2">
          <p><b>Order ID:</b> {order.id}</p><p><b>Reference:</b> {order.order_number}</p>
          <p><b>Created:</b> {new Date(order.created_at).toLocaleString()}</p><p><b>Status:</b> {order.status}</p>
          <p><b>Payment status:</b> {order.payment_status}</p><p><b>Method:</b> {order.payment_method || "Not provided"}</p>
          <p><b>Customer:</b> {order.customer_name}</p><p><b>Email:</b> {order.customer_email}</p><p><b>Phone:</b> {order.customer_phone || "Not provided"}</p>
        </section>
        <section><h3 className="mb-2 font-semibold">Delivery</h3><p>Address: {order.shipping_address ? (typeof order.shipping_address === "string" ? order.shipping_address : JSON.stringify(order.shipping_address, null, 2)) : "Not provided"}</p><p>Instructions / notes: {String(order.notes || "Not provided")}</p><p>Tracking: {String(order.tracking_number || "Not provided")}</p></section>
        <section><h3 className="mb-2 font-semibold">Payment</h3><p>Reference: {String(order.paystack_reference || "Not provided")}</p><p>Verification: {String(order.payment_receipt_status || order.payment_status)}</p><p>Bank transfer account and verification history are not stored on the order record.</p></section>
        <section><h3 className="mb-2 font-semibold">Products ({data?.items.length ?? 0})</h3><div className="space-y-2">{data?.items.map((item: any) => <div key={item.id} className="flex items-center gap-3 rounded border p-3">{item.product?.images?.[0] && <img src={item.product.images[0]} alt={item.product_name} loading="lazy" className="h-14 w-14 rounded object-cover" />}<div className="min-w-0 flex-1"><p className="font-medium">{item.product_name}</p><p className="text-muted-foreground">Size: {item.size || "—"} · Colour: {item.color || "—"} · Qty: {item.quantity}</p></div><div className="text-right">{fmtNGN(Number(item.unit_price))} each<p className="font-semibold">{fmtNGN(Number(item.subtotal))}</p></div></div>)}</div></section>
        <section className="space-y-1 border-t pt-3"><p>Subtotal: {fmtNGN(Number(order.subtotal ?? 0))}</p><p>Delivery: {fmtNGN(Number(order.shipping ?? 0))}</p><p>Discount: {fmtNGN(Number(order.discount ?? 0))}</p><p className="font-semibold">Final total: {fmtNGN(Number(order.total))}</p></section>
      </div>}
    </DialogContent>
  </Dialog>;
}

function fmtNGN(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

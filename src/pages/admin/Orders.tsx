import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RefreshCw } from "lucide-react";
import {
  verifyBankTransferPayment,
  sendBankTransferReceipt,
  retryPaymentReceipt,
} from "@/lib/orders.functions";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
  payment_receipt_status?: string | null;
};

export function OrdersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid">("all");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders", q, statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, order_number, customer_name, customer_email, total, payment_method, payment_status, created_at",
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
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ["admin-orders"] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

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
                <TableHead className="w-28">Actions</TableHead>
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
                    <TableCell className="font-medium">{o.customer_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {o.customer_email}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtNGN(Number(o.total))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={o.payment_method === "bank_transfer" ? "outline" : "secondary"}
                      >
                        {o.payment_method.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          o.payment_status === "paid"
                            ? "default"
                            : o.payment_status === "pending"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {o.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(o.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {o.payment_method === "bank_transfer" && o.payment_status === "pending" ? (
                        <Button
                          size="sm"
                          onClick={() => verifyPayment(o.id)}
                          disabled={verifyingId === o.id}
                        >
                          {verifyingId === o.id ? "Verifying..." : "Verify Payment"}
                        </Button>
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
                          {o.payment_status}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function fmtNGN(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { fmtNGN, fmtDate } from "@/lib/admin-utils";

export const Route = createFileRoute("/admin/customers")({ component: CustomersPage });

type CustomerRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  created_at: string;
  role: string;
  email: string | null;
  order_count: number;
  total_spent: number;
};

type CustomerOrder = {
  id: string;
  order_number: string | null;
  total_price: number;
  status: string;
  created_at: string;
};

type CustomerDetail = {
  profile: {
    id: string;
    user_id: string;
    display_name: string | null;
    phone: string | null;
    created_at: string;
  };
  email: string | null;
  role: string;
  orders: CustomerOrder[];
};

function CustomersPage() {
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: customers = [], isLoading } = useQuery<CustomerRow[]>({
    queryKey: ["admin-customers"],
    queryFn: async () => {
      const authClient = supabase as any;
      const [profilesRes, rolesRes, usersRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("id, user_id, display_name, phone, created_at").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
        authClient.from("auth.users").select("id, email") as Promise<{ data: { id: string; email: string }[] | null; error: any }>,
        supabase.from("orders").select("user_id, total"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (usersRes.error) throw usersRes.error;
      if (ordersRes.error) throw ordersRes.error;

      const roleByUser = new Map<string, string>();
      (rolesRes.data ?? []).forEach((item) => {
        if (!item || typeof item.user_id !== "string" || typeof item.role !== "string") return;
        if (!roleByUser.has(item.user_id)) roleByUser.set(item.user_id, item.role);
      });

      const emailByUser = new Map<string, string>();
      (usersRes.data ?? []).forEach((item) => {
        if (!item || typeof item.id !== "string" || typeof item.email !== "string") return;
        emailByUser.set(item.id, item.email);
      });

      const orderStats = new Map<string, { count: number; total: number }>();
      (ordersRes.data ?? []).forEach((order) => {
        if (!order || typeof order.user_id !== "string") return;
        const stats = orderStats.get(order.user_id) ?? { count: 0, total: 0 };
        stats.count += 1;
        stats.total += Number(order.total ?? 0);
        orderStats.set(order.user_id, stats);
      });

      return (profilesRes.data ?? []).map((profile) => {
        const stats = orderStats.get(profile.user_id) ?? { count: 0, total: 0 };
        return {
          id: profile.id,
          user_id: profile.user_id,
          display_name: profile.display_name,
          phone: profile.phone,
          created_at: profile.created_at,
          role: roleByUser.get(profile.user_id) ?? "customer",
          email: emailByUser.get(profile.user_id) ?? null,
          order_count: stats.count,
          total_spent: stats.total,
        };
      });
    },
  });

  const filtered = useMemo(() => {
    const search = q.trim().toLowerCase();
    if (!search) return customers;
    return customers.filter((customer) => {
      return [customer.display_name, customer.email, customer.phone]
        .some((value) => typeof value === "string" && value.toLowerCase().includes(search));
    });
  }, [customers, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Customers</h1>
        <p className="text-sm text-muted-foreground mt-1">{filtered.length} of {customers.length}</p>
      </div>

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search customers…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="bg-background rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="p-3">Full name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Phone</th>
                <th className="p-3">Role</th>
                <th className="p-3">Joined</th>
                <th className="p-3 text-right">Orders</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No customers.</td></tr>
              ) : filtered.map((customer) => (
                <tr key={customer.id} className="border-t border-border hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedId(customer.id)}>
                  <td className="p-3 font-medium">{customer.display_name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{customer.email ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{customer.phone ?? "—"}</td>
                  <td className="p-3 capitalize">{customer.role}</td>
                  <td className="p-3 text-muted-foreground">{fmtDate(customer.created_at)}</td>
                  <td className="p-3 text-right">
                    <div className="text-right">
                      <p className="font-medium">{customer.order_count}</p>
                      <p className="text-xs text-muted-foreground">{fmtNGN(customer.total_spent)}</p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CustomerDetailDialog customerId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

function CustomerDetailDialog({ customerId, onClose }: { customerId: string | null; onClose: () => void }) {
  const { data, isLoading } = useQuery<CustomerDetail>({
    queryKey: ["admin-customer-detail", customerId],
    enabled: !!customerId,
    queryFn: async () => {
      const customerRes = await supabase.from("profiles").select("id, user_id, display_name, phone, created_at").eq("id", customerId!).single();
      if (customerRes.error) throw customerRes.error;
      if (!customerRes.data) throw new Error("Customer profile not found");
      const userId = customerRes.data.user_id;

      const authClient = supabase as any;
      const [ordersRes, rolesRes, userRes] = await Promise.all([
        supabase.from("orders").select("id, order_number, total, status, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role").eq("user_id", userId),
        authClient.from("auth.users").select("id, email").eq("id", userId).single() as Promise<{ data: { id: string; email: string } | null; error: any }>,
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (rolesRes.error) throw rolesRes.error;
      if (userRes.error) throw userRes.error;

      const role = (rolesRes.data ?? []).find((item) => item?.user_id === customerRes.data?.user_id)?.role ?? "customer";
      const email = userRes.data && typeof userRes.data.email === "string" ? userRes.data.email : null;

      return {
        profile: customerRes.data,
        email,
        role,
        orders: (ordersRes.data ?? []).map((order) => ({
          id: order.id,
          order_number: order.order_number ?? null,
          total_price: Number(order.total ?? 0),
          status: order.status ?? "pending",
          created_at: order.created_at,
        })),
      };
    },
  });

  const totalSpent = data?.orders.reduce((sum, order) => sum + order.total_price, 0) ?? 0;

  return (
    <Dialog open={!!customerId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{data?.profile.display_name ?? "Customer details"}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">Loading…</div>
        ) : data ? (
          <div className="space-y-6 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Full name</p>
                <p>{data.profile.display_name ?? "—"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Email</p>
                <p>{data.email ?? "—"}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Phone</p>
                <p>{data.profile.phone ?? "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Role</p>
                <p className="capitalize">{data.role}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Joined</p>
                <p>{fmtDate(data.profile.created_at)}</p>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground uppercase">Total spent</p>
                <p>{fmtNGN(totalSpent)}</p>
              </div>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4">
              <h3 className="font-medium">Order history</h3>
              {data.orders.length === 0 ? (
                <p className="text-sm text-muted-foreground mt-3">No orders for this customer.</p>
              ) : (
                <div className="mt-3 space-y-2 text-sm">
                  {data.orders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-border p-3">
                      <div>
                        <p className="font-medium">{order.order_number ?? order.id}</p>
                        <p className="text-xs text-muted-foreground">{fmtDate(order.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p>{fmtNGN(order.total_price)}</p>
                        <p className="text-xs capitalize text-muted-foreground">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">Customer not found.</div>
        )}
      </DialogContent>
    </Dialog>
  );
}

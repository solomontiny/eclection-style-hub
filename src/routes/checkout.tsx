import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useCart, cartItemKey } from "@/lib/cart";
import { useStore } from "@/lib/store-context";
import { formatNaira } from "@/lib/products";
import { formatCurrencyPrice } from "@/lib/currency-browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createOrderServerFn } from "@/lib/orders.functions";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { DELIVERY_INFO } from "@/lib/contact";
import { Building2 } from "lucide-react";

const CustomerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().min(10, "Phone number is required"),
  address: z.string().min(5, "Delivery address is required"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State/Region is required"),
  country: z.string().min(2, "Country is required"),
  postalCode: z.string().optional(),
  deliveryInstructions: z.string().optional(),
  paymentMethod: z.enum(["bank_transfer"]),
});

type CustomerForm = z.infer<typeof CustomerSchema>;

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const { currency } = useStore();
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);
  const form = useForm<CustomerForm>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: { name: "", email: "", phone: "", address: "", city: "", state: "", country: "Nigeria", postalCode: "", deliveryInstructions: "", paymentMethod: "bank_transfer" },
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["shop-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("public_shop_settings")
        .select("bank_transfer_enabled")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Auth is still resolving: render a lightweight placeholder instead of the
  // "sign in" screen, so the checkout form appears as soon as the session is
  // known. Protection is unchanged — an unauthenticated visitor still gets the
  // sign-in screen once loading finishes.
  if (authLoading) {
    return (
      <section className="container-x py-16 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading checkout…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container-x py-16 text-center">
        <h1 className="text-3xl font-display">Sign in to checkout</h1>
        <p className="mt-4 text-muted-foreground">Please login or create an account to securely place your order.</p>
        <div className="mt-8 flex justify-center gap-4">
          <Button onClick={() => navigate({ to: "/login", search: { redirect: "/checkout" } })}>Login / Signup</Button>
        </div>
      </section>
    );
  }

  if (settingsLoading) {
    return (
      <section className="container-x py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
        <p className="mt-4 text-muted-foreground">Loading checkout settings…</p>
      </section>
    );
  }

  if (!settings?.bank_transfer_enabled) {
    return (
      <section className="container-x py-16 text-center">
        <h1 className="text-3xl font-display">Payments Temporarily Unavailable</h1>
        <p className="mt-4 text-muted-foreground">Bank transfer payments are currently disabled. Please contact support.</p>
      </section>
    );
  }

  const handleCheckout = async (data: CustomerForm) => {
    if (submittingRef.current) {
      if (import.meta.env.DEV) console.warn("[checkout] duplicate submit ignored");
      return;
    }
    if (items.length === 0) {
      if (import.meta.env.DEV) console.warn("[checkout] submit blocked: cart is empty");
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    if (import.meta.env.DEV) {
      console.log("[checkout] submit start", { paymentMethod: data.paymentMethod, items: items.length });
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.getSession();
      const currentSession = authData.session;
      if (authError || !currentSession?.access_token || currentSession.user.id !== user.id) {
        if (import.meta.env.DEV) {
          console.warn("[checkout] session unavailable or changed", {
            hasSession: !!currentSession,
            matchesCheckoutUser: currentSession?.user.id === user.id,
          });
        }
        toast.error("Your sign-in session has expired. Please sign in again.");
        await navigate({ to: "/login", search: { redirect: "/checkout" } });
        return;
      }

      const order = await createOrderServerFn({
        data: {
          items: items.map((i) => ({ id: i.id, size: i.size, color: i.color, qty: i.qty, isBulk: !!i.isBulk, bundleId: i.bundleId })),
          customer: data,
          currency,
        },
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });

      if (import.meta.env.DEV) {
        console.log("[checkout] createOrderServerFn returned", {
          success: order.success,
          paymentMethod: "paymentMethod" in order ? order.paymentMethod : undefined,
          orderId: "orderId" in order ? order.orderId : undefined,
        });
      }

      if (!order.success) {
        toast.error(("message" in order && order.message) || "Could not start the payment.");
        return;
      }

      clear();
      qc.invalidateQueries({ queryKey: ["account-orders"] });
      if (import.meta.env.DEV) console.log("[checkout] navigating to /payment-instructions", order.orderId);
      await navigate({
        to: "/payment-instructions",
        search: { orderId: order.orderId },
      });
      return;
    } catch (e: any) {
      if (import.meta.env.DEV) console.error("[checkout] failed", e);
      toast.error(e?.message || "Checkout failed. Please try again.");
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };


  const totalWithVat = subtotal;

  return (
    <section className="container-x py-10 md:py-12">
      <h1 className="text-2xl sm:text-3xl font-display">Checkout</h1>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12 mt-8">
        <form onSubmit={form.handleSubmit(handleCheckout)} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input {...form.register("name")} />
            {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <Label>Email</Label>
            <Input {...form.register("email")} />
            {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...form.register("phone")} />
            {form.formState.errors.phone && <p className="text-red-500 text-sm">{form.formState.errors.phone.message}</p>}
          </div>

          <div className="pt-2 border-t border-border">
            <h3 className="font-medium mb-3">Delivery address</h3>
          </div>
          <div>
            <Label>Full delivery address</Label>
            <Input {...form.register("address")} placeholder="Street, building, apartment" />
            {form.formState.errors.address && <p className="text-red-500 text-sm">{form.formState.errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input {...form.register("city")} />
              {form.formState.errors.city && <p className="text-red-500 text-sm">{form.formState.errors.city.message}</p>}
            </div>
            <div>
              <Label>State / Region</Label>
              <Input {...form.register("state")} />
              {form.formState.errors.state && <p className="text-red-500 text-sm">{form.formState.errors.state.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Input {...form.register("country")} />
              {form.formState.errors.country && <p className="text-red-500 text-sm">{form.formState.errors.country.message}</p>}
            </div>
            <div>
              <Label>Postal / ZIP code (optional)</Label>
              <Input {...form.register("postalCode")} />
            </div>
          </div>
          <div>
            <Label>Delivery instructions (optional)</Label>
            <Textarea {...form.register("deliveryInstructions")} placeholder="Gate code, floor, dispatch contact, etc." rows={2} />
          </div>
          <div className="pt-4 border-t border-border">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Payment: Direct Bank Transfer (manual verification required)</span>
            </div>
          </div>
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? "Processing..." : "Continue to Payment"}
          </Button>
        </form>
        <div className="border rounded-lg p-4 sm:p-6 bg-card h-fit">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Order Summary</h2>
          {items.map(item => (
            <div key={cartItemKey(item.id, item.size, item.color, item.bundleId)} className="flex items-start justify-between gap-3 py-2 border-b border-border/50 last:border-0">
              <span className="min-w-0 text-sm break-words">
                {item.name}
                <span className="block text-xs text-muted-foreground">
                  {item.isBulk
                    ? `Bulk · ${item.qty} pieces ${item.color ? `· ${item.color}` : ""}`
                    : `Size ${item.size} · Qty ${item.qty} ${item.color ? `· ${item.color}` : ""}`}
                </span>
              </span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{formatNaira(item.price * item.qty)}</span>
            </div>
          ))}
          <div className="border-t mt-4 pt-4 font-bold flex flex-col gap-2">
            <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg pt-2 border-t">
                <span>Total</span>
                <span>{formatNaira(totalWithVat)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t text-primary">
              <span>Amount to pay</span>
              <span className="font-bold">{formatNaira(totalWithVat)}</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-secondary/30 rounded text-sm text-muted-foreground space-y-2">
            <p><strong>Delivery Note:</strong> Delivery fees are separate from your order total and are paid directly to the dispatch rider upon delivery.</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(DELIVERY_INFO.regionalFees).map(([region, fee]) => (
                  <p key={region}><strong>{region}:</strong> {fee}</p>
                ))}
            </div>
            <p className="text-xs">{DELIVERY_INFO.note}</p>
            <p className="text-xs pt-1 border-t border-border/50"><strong>International Delivery:</strong> Orders are weighed by our logistics agent, and you'll be contacted with the delivery fee. Bus, Express & Cargo options are available. If you have your own logistics agent, provide their details and we'll send your package with a photo for confirmation.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

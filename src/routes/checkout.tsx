import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CreditCard, Building2, AlertCircle, Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [serverFnError, setServerFnError] = useState<string | null>(null);
  const submittingRef = useRef(false);
  const formSubmittedRef = useRef(false);
  
  // Idempotency: generate/reuse attempt key for this checkout session
  const [attemptKey, setAttemptKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem("checkout_attempt_key");
      if (stored) return stored;
      const newKey = `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
      sessionStorage.setItem("checkout_attempt_key", newKey);
      return newKey;
    }
    return `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  });

  const form = useForm<CustomerForm>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: { name: "", email: "", phone: "", address: "", city: "", state: "", country: "Nigeria", postalCode: "", deliveryInstructions: "", paymentMethod: "bank_transfer" },
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["shop-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("bank_transfer_enabled")
        .eq("id", "default")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Pre-fill form with user data if available
  useEffect(() => {
    if (user && !formSubmittedRef.current) {
      form.reset({
        name: user.user_metadata?.display_name || user.user_metadata?.full_name || "",
        email: user.email || "",
        phone: user.user_metadata?.phone || "",
        address: "",
        city: "",
        state: "",
        country: "Nigeria",
        postalCode: "",
        deliveryInstructions: "",
        paymentMethod: "bank_transfer",
      });
    }
  }, [user, form]);

  // Auth is still resolving: render a lightweight placeholder instead of the
  // "sign in" screen, so the checkout form appears as soon as the session is
  // known. Protection is unchanged — an unauthenticated visitor still gets the
  // sign-in screen once loading finishes.
  if (authLoading) {
    return (
      <section className="container-x py-16 text-center">
        <Loader2 className="mx-auto animate-spin text-primary" size={40} />
        <p className="mt-4 text-muted-foreground">Loading checkout…</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container-x py-16 text-center">
        <AlertCircle className="mx-auto text-destructive" size={48} />
        <h1 className="text-3xl mt-4 font-display">Sign in to checkout</h1>
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
        <Loader2 className="mx-auto animate-spin text-primary" size={48} />
        <p className="mt-4 text-muted-foreground">Loading checkout settings…</p>
      </section>
    );
  }

  if (!settings?.bank_transfer_enabled) {
    return (
      <section className="container-x py-16 text-center">
        <AlertCircle className="mx-auto text-amber-500" size={48} />
        <h1 className="text-3xl font-display">Payments Temporarily Unavailable</h1>
        <p className="mt-4 text-muted-foreground">Bank transfer payments are currently disabled. Please contact support.</p>
      </section>
    );
  }

  const handleCheckout = async (data: CustomerForm) => {
    if (submittingRef.current || formSubmittedRef.current) {
      if (import.meta.env.DEV) console.warn("[checkout] duplicate submit ignored");
      return;
    }
    if (items.length === 0) {
      if (import.meta.env.DEV) console.warn("[checkout] submit blocked: cart is empty");
      toast.error("Your cart is empty");
      return;
    }

    // Build canonical payload for fingerprint (must match server)
    const fingerprintPayload = JSON.stringify({
      user_id: user.id,
      customer_name: data.name,
      customer_email: data.email,
      customer_phone: data.phone && data.phone.trim() !== "" ? data.phone : null,
      shipping_address: data.address || data.city || data.state
        ? {
            address: data.address ?? null,
            city: data.city ?? null,
            state: data.state ?? null,
            country: data.country ?? null,
            postal_code: data.postalCode ?? null,
            delivery_instructions: data.deliveryInstructions ?? null,
          }
        : null,
      subtotal,
      total: subtotal,
      currency: currency.toUpperCase(),
      payment_currency: "NGN",
      payment_amount: subtotal,
      items: items.map((item) => ({
        product_id: item.id,
        unit_price: item.price,
        quantity: item.qty,
        size: item.size,
        color: item.color,
        bundle_id: item.bundleId,
      })),
    });

    // Generate fingerprint using Web Crypto API
    const fingerprint = await (async () => {
      const encoder = new TextEncoder();
      const data = encoder.encode(fingerprintPayload);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    })();

    submittingRef.current = true;
    formSubmittedRef.current = true;
    setLoading(true);
    setServerFnError(null);
    if (import.meta.env.DEV) {
      console.log("[checkout] submit start", { paymentMethod: data.paymentMethod, items: items.length, attemptKey });
    }

    try {
      const order = await createOrderServerFn({
        data: {
          items: items.map((i) => ({ id: i.id, size: i.size, color: i.color, qty: i.qty, isBulk: !!i.isBulk, bundleId: i.bundleId })),
          customer: data,
          callbackUrl: `${window.location.origin}/thank-you`,
          currency,
          checkoutAttemptKey: attemptKey,
          checkoutRequestFingerprint: fingerprint,
        },
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
        formSubmittedRef.current = false;
        submittingRef.current = false;
        setLoading(false);
        return;
      }

      // Success - clear attempt key for next checkout
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("checkout_attempt_key");
      }

      clear();
      if (import.meta.env.DEV) console.log("[checkout] navigating to /payment-instructions", order.orderId);
      await navigate({
        to: "/payment-instructions",
        search: { orderId: order.orderId },
      });
      return;
    } catch (e: any) {
      if (import.meta.env.DEV) console.error("[checkout] failed", e);
      // Keep attempt key for retry - do not clear on error
      const errorMessage = e?.message || "Checkout failed. Please try again.";
      toast.error(errorMessage);
      setServerFnError(errorMessage);
      formSubmittedRef.current = false;
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };


  const totalWithVat = subtotal;

  return (
    <section className="container-x py-10 md:py-12">
      <h1 className="text-2xl sm:text-3xl font-display">Checkout</h1>
      {serverFnError && (
        <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive" role="alert">
          {serverFnError}
        </div>
      )}
      <div className="grid gap-8 md:grid-cols-2 md:gap-12 mt-8">
        <form onSubmit={form.handleSubmit(handleCheckout)} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <Input {...form.register("name")} disabled={loading} />
            {form.formState.errors.name && <p className="text-red-500 text-sm">{form.formState.errors.name.message}</p>}
          </div>
          <div>
            <Label>Email</Label>
            <Input {...form.register("email")} disabled={loading} />
            {form.formState.errors.email && <p className="text-red-500 text-sm">{form.formState.errors.email.message}</p>}
          </div>
          <div>
            <Label>Phone</Label>
            <Input {...form.register("phone")} disabled={loading} />
            {form.formState.errors.phone && <p className="text-red-500 text-sm">{form.formState.errors.phone.message}</p>}
          </div>

          <div className="pt-2 border-t border-border">
            <h3 className="font-medium mb-3">Delivery address</h3>
          </div>
          <div>
            <Label>Full delivery address</Label>
            <Input {...form.register("address")} placeholder="Street, building, apartment" disabled={loading} />
            {form.formState.errors.address && <p className="text-red-500 text-sm">{form.formState.errors.address.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>City</Label>
              <Input {...form.register("city")} disabled={loading} />
              {form.formState.errors.city && <p className="text-red-500 text-sm">{form.formState.errors.city.message}</p>}
            </div>
            <div>
              <Label>State / Region</Label>
              <Input {...form.register("state")} disabled={loading} />
              {form.formState.errors.state && <p className="text-red-500 text-sm">{form.formState.errors.state.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Country</Label>
              <Input {...form.register("country")} disabled={loading} />
              {form.formState.errors.country && <p className="text-red-500 text-sm">{form.formState.errors.country.message}</p>}
            </div>
            <div>
              <Label>Postal / ZIP code (optional)</Label>
              <Input {...form.register("postalCode")} disabled={loading} />
            </div>
          </div>
          <div>
            <Label>Delivery instructions (optional)</Label>
            <Textarea {...form.register("deliveryInstructions")} placeholder="Gate code, floor, dispatch contact, etc." rows={2} disabled={loading} />
          </div>
          <div className="pt-4 border-t border-border">
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>Payment: Direct Bank Transfer (manual verification required)</span>
            </div>
          </div>
          <Button type="submit" disabled={loading || items.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Continue to Payment"
            )}
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

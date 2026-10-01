import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Info,
  Landmark,
  Loader2,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getOrderSummaryServerFn, getPaymentSettingsServerFn } from "@/lib/payment.functions";
import {
  buildReceiptMessage,
  buildWhatsappLink,
  copyToClipboard,
  type BankAccount,
} from "@/lib/payment-config";
import { Button } from "@/components/ui/button";
import { CONTACT } from "@/lib/contact";
import { formatNaira } from "@/lib/products";

export const Route = createFileRoute("/payment-instructions")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: "/payment-instructions" } });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: typeof search.orderId === "string" ? search.orderId : "",
    reference: typeof search.reference === "string" ? search.reference : "",
  }),
  component: PaymentInstructionsPage,
});

const WA_BRAND = "#25D366";

function BankAccountCard({ account, index }: { account: BankAccount; index: number }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    const ok = await copyToClipboard(account.accountNumber);
    setCopied(ok);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Bank Account {index + 1}
          </p>
          <p className="font-display text-lg leading-tight mt-0.5">{account.bankName}</p>
        </div>
        <Landmark className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
      </div>

      <dl className="grid gap-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Account Name</dt>
          <dd className="font-medium text-right break-words">{account.accountName}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Account Number</dt>
          <dd className="font-mono font-semibold text-base sm:text-lg tracking-wider text-right tabular-nums">
            {account.accountNumber}
          </dd>
        </div>
      </dl>

      <Button type="button" variant="outline" className="w-full" onClick={handleCopy}>
        {copied ? (
          <>
            <ClipboardCheck className="text-primary" /> Copied
          </>
        ) : (
          <>
            <Copy /> Copy Account Number
          </>
        )}
      </Button>
    </div>
  );
}

function LoadingBlock() {
  return (
    <section className="container-x py-16">
      <div className="max-w-xl mx-auto flex flex-col items-center gap-3 text-center">
        <Loader2 className="animate-spin text-primary" size={28} />
        <p className="text-sm text-muted-foreground">Loading your order…</p>
      </div>
    </section>
  );
}

function PaymentInstructionsPage() {
  const { orderId, reference } = Route.useSearch();

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["payment-settings"],
    queryFn: () => getPaymentSettingsServerFn(),
    staleTime: 60_000,
  });

  const { data: order, isLoading } = useQuery({
    queryKey: ["payment-order-summary", orderId],
    enabled: !!orderId,
    queryFn: async () => getOrderSummaryServerFn({ data: { orderId } }),
    // Keeps the page honest about the admin's decision without any client-side
    // transition of the order itself.
    refetchInterval: (query) => (query.state.data?.paymentStatus === "paid" ? false : 15_000),
  });

  const orderNumber = order?.orderNumber || reference;
  const customerName = order?.customerName || "";
  const amountToPay = Number(order?.paymentAmount ?? order?.total ?? 0);
  const amountLabel = formatNaira(amountToPay);
  const isConfirmed = order?.paymentStatus === "paid";
  const isCancelled = order?.status === "cancelled";
  const bankAccounts = settings?.bankAccounts ?? [];
  const whatsappNumber = settings?.whatsappNumber ?? null;

  const whatsappHref = whatsappNumber
    ? buildWhatsappLink(
        whatsappNumber,
        buildReceiptMessage({ orderNumber, customerName, amountLabel }),
      )
    : null;

  if (!orderId) {
    return (
      <section className="container-x py-16 text-center">
        <h1 className="text-2xl font-display">No order selected</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not find an order to show payment instructions for.
        </p>
        <Link to="/shop" className="inline-block mt-6 text-sm underline text-primary">
          Continue shopping
        </Link>
      </section>
    );
  }

  if (isLoading) return <LoadingBlock />;

  if (!order) {
    return (
      <section className="container-x py-16 text-center">
        <h1 className="text-2xl font-display">Order not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not load order {orderNumber || ""}. Please contact support.
        </p>
        <Link to="/account/orders" className="inline-block mt-6 text-sm underline text-primary">
          View your orders
        </Link>
      </section>
    );
  }

  return (
    <section className="container-x py-10 md:py-14">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Order confirmation */}
        <div className="text-center space-y-3">
          {isConfirmed ? (
            <CheckCircle2 className="mx-auto text-primary" size={40} aria-hidden="true" />
          ) : (
            <ClipboardCheck className="mx-auto text-primary" size={40} aria-hidden="true" />
          )}
          <h1 className="text-2xl sm:text-3xl font-display">
            {isConfirmed ? "Order Successful!" : "Order Confirmed"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isConfirmed
              ? "Thank you for patronizing Supplier Affordable."
              : "Your order has been received."}
          </p>
          <p className="text-sm">
            Order <span className="font-semibold">#{orderNumber}</span>
          </p>
        </div>

        {isConfirmed ? (
          <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 sm:p-6 space-y-2 text-center">
            <p className="font-medium">Your payment has been confirmed.</p>
            <p className="text-sm text-muted-foreground">
              We are preparing your order now. Thank you for shopping with {CONTACT.brand}.
            </p>
            <Link to="/account/orders" className="inline-block pt-2 text-sm underline text-primary">
              View order details
            </Link>
          </div>
        ) : (
          <>
            {/* Amount to pay */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 text-center">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Amount to Pay</p>
              <p className="font-display text-3xl sm:text-4xl text-primary mt-1">{amountLabel}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please pay the exact amount so our team can verify your transfer quickly.
              </p>
            </div>

            {isCancelled && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
                This order has been cancelled. Please contact support before making any payment.
              </div>
            )}

            {/* Payment status */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm flex gap-3 dark:border-amber-900/60 dark:bg-amber-950/30">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" aria-hidden="true" />
              <p>
                Your order will remain <strong>pending</strong> until your payment has been
                verified by our team. Delivery is only arranged after payment is confirmed.
              </p>
            </div>

            {/* Bank accounts */}
            <div className="space-y-4">
              <div>
                <h2 className="font-display text-xl">Complete your payment</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Complete your payment using any of the bank accounts below. After payment, send
                  your payment receipt to us on WhatsApp.
                </p>
              </div>

              {settingsLoading ? (
                <div className="rounded-2xl border border-border bg-card p-5 flex items-center gap-3 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading our bank accounts…
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
                  Our bank details are being updated. Please contact us on{" "}
                  <a href={`mailto:${CONTACT.email}`} className="text-primary underline">
                    {CONTACT.email}
                  </a>{" "}
                  and we will send them to you.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {bankAccounts.map((account, index) => (
                    <BankAccountCard key={account.id} account={account} index={index} />
                  ))}
                </div>
              )}

              <ol className="text-sm text-muted-foreground space-y-1 list-decimal pl-5">
                <li>Transfer the exact amount to any one of the accounts above.</li>
                <li>Use your full name as the transfer reference/narration.</li>
                <li>Send your payment receipt to us on WhatsApp for confirmation.</li>
              </ol>
            </div>

            {/* WhatsApp */}
            <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" style={{ color: WA_BRAND }} aria-hidden="true" />
                <h2 className="font-display text-lg">Already made your payment?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Send your payment receipt to us on WhatsApp. Our team will verify it and confirm
                your order.
              </p>
              {whatsappHref ? (
                <Button asChild size="lg" className="w-full bg-[#25D366] text-white shadow hover:bg-[#25D366]/90">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle aria-hidden="true" />
                    Send Payment Receipt on WhatsApp
                  </a>
                </Button>
              ) : (
                <p className="text-sm">
                  WhatsApp payments are not configured yet. Please email{" "}
                  <a href={`mailto:${CONTACT.email}`} className="text-primary underline">
                    {CONTACT.email}
                  </a>{" "}
                  with your receipt instead.
                </p>
              )}
              <p className="flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                Your message opens WhatsApp with your order details filled in — you still need to
                attach your payment screenshot before sending. Payment is confirmed by our team
                only.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-sm">
          <Link to="/account/orders" className="underline text-primary">
            View my orders
          </Link>
          <Link to="/shop" className="underline text-primary">
            Continue shopping
          </Link>
        </div>
      </div>
    </section>
  );
}

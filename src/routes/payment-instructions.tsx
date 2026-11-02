import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fmtNGN } from "@/lib/admin-utils";
import { Copy, AlertCircle, ArrowLeft, MessageSquare, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/payment-instructions")({
  beforeLoad: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/login", search: { redirect: "/payment-instructions" } });
  },
  validateSearch: (search: Record<string, unknown>) => ({
    orderId: typeof search.orderId === "string" ? search.orderId : undefined,
  }),
  component: PaymentInstructionsPage,
});

type BankAccount = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  sortCode?: string;
};

type OrderData = {
  id: string;
  order_number: string;
  total: number;
  payment_status: string;
  payment_method: string;
  bank_accounts: BankAccount[];
  whatsapp_number: string | null;
  bank_transfer_instructions: string | null;
};

function normalizeWhatsApp(number: string): string {
  const digits = number.replace(/\D/g, "");
  return digits.startsWith("0") ? `234${digits.slice(1)}` : digits;
}

function PaymentInstructionsPage() {
  const { user } = useAuth();
  const { orderId } = Route.useSearch();
  const [copiedAccount, setCopiedAccount] = useState<string | null>(null);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payment-instructions", orderId, user?.id],
    enabled: !!user && !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, total, payment_status, payment_method")
        .eq("id", orderId!)
        .eq("user_id", user!.id)
        .single();

      if (error || !data) throw new Error("Order not found");

      const { data: settings } = await supabase
        .from("shop_settings")
        .select("bank_accounts, whatsapp_number, bank_transfer_instructions")
        .eq("id", "default")
        .maybeSingle();

      return {
        ...data,
        bank_accounts: settings?.bank_accounts ?? [],
        whatsapp_number: settings?.whatsapp_number ?? null,
        bank_transfer_instructions: settings?.bank_transfer_instructions ?? null,
      } as OrderData;
    },
  });

  const handleCopy = async (accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccount(accountNumber);
      toast.success("Account number copied!");
      setTimeout(() => setCopiedAccount(null), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleWhatsApp = (account: BankAccount, orderNumber: string, total: number) => {
    const whatsapp = order?.whatsapp_number;
    if (!whatsapp) {
      toast.error("WhatsApp contact not configured.");
      return;
    }
    const message = `Hi, I've made payment for order ${orderNumber} (${fmtNGN(total)}) to ${account.bankName} - ${account.accountName} (${account.accountNumber}). Please verify.`;
    const url = `https://wa.me/${normalizeWhatsApp(whatsapp)}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  if (isLoading) {
    return (
      <section className="container-x py-12">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading payment instructions…</p>
        </div>
      </section>
    );
  }

  if (isError || !order) {
    return (
      <section className="container-x py-12">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="mx-auto text-destructive" size={48} />
          <h1 className="text-2xl mt-4 font-display">Order Not Found</h1>
          <p className="mt-2 text-muted-foreground">
            This order doesn't exist or you don't have permission to view it.
          </p>
          <Link to="/account/orders" className="mt-6 inline-block text-primary underline">
            View My Orders
          </Link>
        </div>
      </section>
    );
  }

  if (order.payment_method !== "bank_transfer") {
    return (
      <section className="container-x py-12">
        <div className="max-w-2xl mx-auto text-center">
          <AlertCircle className="mx-auto text-amber-500" size={48} />
          <h1 className="text-2xl mt-4 font-display">Not a Bank Transfer Order</h1>
          <p className="mt-2 text-muted-foreground">
            This order was placed with a different payment method.
          </p>
          <Link to="/account/orders" className="mt-6 inline-block text-primary underline">
            View My Orders
          </Link>
        </div>
      </section>
    );
  }

  const isPaid = order.payment_status === "paid";
  const accounts = order.bank_accounts ?? [];
  const whatsappNumber = order.whatsapp_number ?? null;
  const instructions = order.bank_transfer_instructions ?? null;

  return (
    <section className="container-x py-10 md:py-16">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl">Payment Instructions</h1>
            <p className="mt-1 text-muted-foreground">
              Order <span className="font-mono font-medium">{order.order_number}</span>
            </p>
          </div>
          {isPaid && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full">
              <Check className="h-4 w-4" />
              <span className="font-medium">Payment Verified</span>
            </div>
          )}
        </div>

        {/* Bank Accounts */}
        {accounts.length > 0 ? (
          <div className="space-y-4 mb-6">
            <h2 className="font-display text-xl">Bank Account Details</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Transfer the exact amount to any of the accounts below. Include your order number (
              {order.order_number}) in the transfer reference.
            </p>
            {accounts.map((account, index) => (
              <Card key={index} className="border-primary/20">
                <CardContent className="p-6 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Bank Name
                      </label>
                      <p className="font-medium mt-1">{account.bankName}</p>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Account Name
                      </label>
                      <p className="font-medium mt-1">{account.accountName}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Account Number
                      </label>
                      <div className="flex items-center gap-3 mt-1">
                        <code className="flex-1 font-mono text-lg bg-muted px-4 py-3 rounded-lg border">
                          {account.accountNumber}
                        </code>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleCopy(account.accountNumber)}
                          aria-label={
                            copiedAccount === account.accountNumber
                              ? "Copied"
                              : "Copy account number"
                          }
                        >
                          {copiedAccount === account.accountNumber ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {account.sortCode && (
                        <div className="mt-3">
                          <label className="text-xs text-muted-foreground uppercase tracking-wider">
                            Sort Code
                          </label>
                          <p className="font-mono font-medium mt-1">{account.sortCode}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {whatsappNumber && (
                    <Button
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        handleWhatsApp(account, order.order_number, Number(order.total))
                      }
                    >
                      <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                      Send Payment Proof via WhatsApp
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <section className="container-x py-12">
            <div className="max-w-2xl mx-auto text-center">
              <AlertCircle className="mx-auto text-destructive" size={48} />
              <h1 className="text-2xl mt-4 font-display">Payment Setup Incomplete</h1>
              <p className="mt-2 text-muted-foreground">
                Bank account details have not been configured yet. Please contact support.
              </p>
              <Link to="/account/orders" className="mt-6 inline-block text-primary underline">
                View My Orders
              </Link>
            </div>
          </section>
        )}

        {/* Instructions */}
        {(instructions || !isPaid) && (
          <Card className="mb-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                <AlertCircle className="h-5 w-5" />
                Important Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-amber-800 dark:text-amber-200">
              {instructions && <p className="whitespace-pre-line">{instructions}</p>}
              {!isPaid && (
                <>
                  <p className="font-medium">
                    Your order will remain <span className="underline">pending</span> until we
                    verify your payment.
                  </p>
                  <p>
                    After transferring, send proof of payment via WhatsApp using the button above.
                  </p>
                  <p>Verification typically takes 1–2 business hours during business hours.</p>
                  <p>
                    Once verified, you'll receive a confirmation email and your order will be
                    processed.
                  </p>
                </>
              )}
              {isPaid && (
                <p className="text-emerald-700 dark:text-emerald-300 font-medium">
                  ✓ Payment has been verified. Your order is being processed.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Link to="/account/orders" className="btn-secondary flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to My Orders
        </Link>
        {!isPaid && whatsappNumber && accounts.length > 0 && (
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={() => handleWhatsApp(accounts[0], order.order_number, Number(order.total))}
          >
            <MessageSquare className="h-4 w-4 text-green-500" />
            Send Payment Proof via WhatsApp
          </Button>
        )}
      </div>
    </section>
  );
}

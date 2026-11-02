import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";

type ShopSettings = {
  id: string;
  bank_accounts: unknown;
  whatsapp_number: string | null;
  bank_transfer_instructions: string | null;
  bank_transfer_enabled: boolean;
};

export function PaymentSettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["shop-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (error) throw error;
      return data as ShopSettings | null;
    },
  });

  const [bankAccounts, setBankAccounts] = useState<Array<{ bankName?: string; accountName?: string; accountNumber?: string; sortCode?: string | null }>>([]);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [instructions, setInstructions] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (settings) {
      setBankAccounts(Array.isArray(settings.bank_accounts) ? settings.bank_accounts : []);
      setWhatsappNumber(settings.whatsapp_number ?? "");
      setInstructions(settings.bank_transfer_instructions ?? "");
      setEnabled(settings.bank_transfer_enabled ?? false);
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase.from("shop_settings").update(updates).eq("id", "default");

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shop-settings"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!user) {
    return (
      <section className="container-x py-16 text-center">
        <h1 className="text-3xl font-display">Sign in to configure payments</h1>
        <p className="mt-4 text-muted-foreground">Please login as an administrator.</p>
      </section>
    );
  }

  if (!settings) {
    return (
      <section className="container-x py-16 text-center">
        <AlertCircle className="mx-auto text-destructive" size={48} />
        <h1 className="text-2xl mt-4 font-display">Shop Settings Not Found</h1>
        <p className="mt-2 text-muted-foreground">No shop settings record found.</p>
      </section>
    );
  }

  const addBankAccount = () => {
    setBankAccounts([
      ...bankAccounts,
      { bankName: "", accountName: "", accountNumber: "", sortCode: "" },
    ]);
  };

  const removeBankAccount = (index: number) => {
    setBankAccounts(bankAccounts.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await updateSettings.mutateAsync({
        bank_accounts: bankAccounts as any,
        whatsapp_number: whatsappNumber || null,
        bank_transfer_instructions: instructions || null,
        bank_transfer_enabled: enabled,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display">Payment Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure bank transfer payment details, WhatsApp contact, and payment instructions.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Bank Transfer Settings</CardTitle>
            <CardDescription>
              Configure the bank account customers will transfer to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              {bankAccounts.map((account, index) => (
                <Card key={index} className="p-4 border border-border/50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Bank Name
                      </label>
                      <Input
                        value={account.bankName ?? ""}
                        onChange={(e) => {
                          const next = [...bankAccounts];
                          next[index].bankName = e.target.value;
                          setBankAccounts(next);
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Account Name
                      </label>
                      <Input
                        value={account.accountName ?? ""}
                        onChange={(e) => {
                          const next = [...bankAccounts];
                          next[index].accountName = e.target.value;
                          setBankAccounts(next);
                        }}
                      />
                    </div>
                    <div className="flex flex-col">
                      <label className="text-xs text-muted-foreground uppercase tracking-wider">
                        Account Number
                      </label>
                      <Input
                        value={account.accountNumber ?? ""}
                        onChange={(e) => {
                          const next = [...bankAccounts];
                          next[index].accountNumber = e.target.value;
                          setBankAccounts(next);
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-xs text-muted-foreground uppercase tracking-wider">
                      Sort Code (Optional)
                    </label>
                    <Input
                      value={account.sortCode ?? ""}
                      onChange={(e) => {
                        const next = [...bankAccounts];
                        next[index].sortCode = e.target.value || null;
                        setBankAccounts(next);
                      }}
                    />
                  </div>
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeBankAccount(index)}
                      disabled={bankAccounts.length === 1}
                    >
                      Remove
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={addBankAccount}>
                <Plus className="h-4 w-4 mr-2" /> Add Bank Account
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact & Instructions</CardTitle>
            <CardDescription>Configure WhatsApp contact and payment instructions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                WhatsApp Number
              </label>
              <Input
                placeholder="+2348012345678"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include country code (e.g., +2348012345678). Used for payment proof submission.
              </p>
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-muted-foreground uppercase tracking-wider">
                Payment Instructions
              </label>
              <Textarea
                value={instructions}
                placeholder="Instructions for customers after payment..."
                rows={6}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enable / Disable</CardTitle>
            <CardDescription>
              Configure the bank account customers will transfer to.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch checked={enabled} onCheckedChange={(checked) => setEnabled(checked)} />
                <div className="flex flex-col">
                  <label className="text-xs font-medium">Bank Transfer Enabled</label>
                  <p className="text-xs text-muted-foreground">
                    {enabled
                      ? "Customer checkout accepts bank transfer."
                      : "Checkout is disabled. Customers cannot place new orders."}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                When disabled, customers see a message instead of the checkout form. Existing
                pending orders can still be verified by admins.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="px-6 pt-6">
        <Button variant="default" onClick={handleSubmit} disabled={isUpdating}>
          {isUpdating ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}

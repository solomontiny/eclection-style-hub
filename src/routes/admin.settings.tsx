import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState({ store_name: "", store_description: "", contact_email: "", contact_phone: "", currency: "NGN", shipping_flat_rate: 0, tax_percent: 0, store_policies: "" });
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => { supabase.from("shop_settings").select("*").eq("id", "default").single().then(({ data, error }) => { if (error) toast.error(error.message); if (data) setSettings(data); setLoadingSettings(false); }); }, []);

  async function changePassword() {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Password updated"); setNewPassword(""); }
  }

  async function saveSettings() {
    setBusy(true);
    const { error } = await supabase.from("shop_settings").upsert({ id: "default", ...settings });
    setBusy(false);
    if (error) toast.error(error.message); else toast.success("Shop settings saved");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl">Settings</h1><p className="text-sm text-muted-foreground mt-1">Admin profile</p></div>

      <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-display text-lg">Shop settings</h2>
        {loadingSettings ? <p className="text-sm text-muted-foreground">Loading settings…</p> : <>
          <div><Label>Store name</Label><Input value={settings.store_name} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} /></div>
          <div><Label>Store description</Label><Input value={settings.store_description ?? ""} onChange={(e) => setSettings({ ...settings, store_description: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3"><div><Label>Contact email</Label><Input type="email" value={settings.contact_email ?? ""} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} /></div><div><Label>Contact phone</Label><Input value={settings.contact_phone ?? ""} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })} /></div></div>
          <div className="grid sm:grid-cols-3 gap-3"><div><Label>Currency</Label><Input value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value.toUpperCase() })} /></div><div><Label>Shipping flat rate</Label><Input type="number" min="0" value={settings.shipping_flat_rate} onChange={(e) => setSettings({ ...settings, shipping_flat_rate: Number(e.target.value) })} /></div><div><Label>Tax %</Label><Input type="number" min="0" max="100" value={settings.tax_percent} onChange={(e) => setSettings({ ...settings, tax_percent: Number(e.target.value) })} /></div></div>
          <div><Label>Store policies</Label><Input value={settings.store_policies ?? ""} onChange={(e) => setSettings({ ...settings, store_policies: e.target.value })} /></div>
          <button onClick={saveSettings} disabled={busy} className="btn-primary">{busy ? "Saving…" : "Save shop settings"}</button>
        </>}
      </div>

      <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-display text-lg">Account</h2>
        <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
        <div><Label>User ID</Label><Input value={user?.id ?? ""} disabled className="font-mono text-xs" /></div>
      </div>

      <div className="bg-background rounded-2xl border border-border p-6 space-y-4">
        <h2 className="font-display text-lg">Change password</h2>
        <div><Label>New password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" /></div>
        <button onClick={changePassword} disabled={busy} className="btn-primary">{busy ? "Updating…" : "Update password"}</button>
      </div>
    </div>
  );
}

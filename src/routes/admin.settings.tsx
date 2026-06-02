import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
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

  async function changePassword() {
    if (newPassword.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (error) toast.error(error.message); else { toast.success("Password updated"); setNewPassword(""); }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div><h1 className="font-display text-3xl">Settings</h1><p className="text-sm text-muted-foreground mt-1">Admin profile</p></div>

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

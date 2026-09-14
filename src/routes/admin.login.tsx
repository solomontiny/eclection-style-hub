import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/admin/login")({
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
        if (isAdmin) {
            throw redirect({ to: "/admin/dashboard" });
        }
    }
  },
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    // Verify admin role
    const { data: isAdmin, error: rpcError } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "admin",
    });

    if (rpcError || !isAdmin) {
      await supabase.auth.signOut();
      setErr("Invalid admin credentials");
      setBusy(false);
      return;
    }

    navigate({ to: "/admin/dashboard" });
  }

  return (
    <section className="container-x py-16 flex justify-center items-center min-h-screen">
      <div className="w-full max-w-md card-elegant p-8">
        <h1 className="font-display text-2xl mb-6">Admin Login</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-1">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {err && <p className="text-destructive text-sm">{err}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in as Admin"}
          </Button>
        </form>
      </div>
    </section>
  );
}

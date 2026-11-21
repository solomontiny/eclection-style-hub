import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import React, { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — SupplierAffordable" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"verifying" | "ready" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    let isSubscribed = true;

    async function checkRecoverySession() {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (!isSubscribed) return;

      if (session) {
        setStatus("ready");
      } else if (error) {
        setStatus("error");
        setMessage("The recovery link is invalid or has expired. Please request a new password reset email.");
      } else {
        // No session yet, wait for auth state change
      }
    }

    // Check immediately
    checkRecoverySession();

    // Listen for auth state change (e.g., PASSWORD_RECOVERY event from email link)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isSubscribed) return;
      if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && session) {
        setStatus("ready");
      }
    });

    // Cleanup
    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    if (busy) return;
    setBusy(true);
    setStatus("ready");
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      setBusy(false);
    } else {
      setStatus("success");
      setMessage("Your password has been updated successfully.");
      setBusy(false);
    }
  }

  if (status === "verifying") {
    return (
      <section className="container-x py-16 flex justify-center">
        <div className="w-full max-w-md card-elegant p-8 text-center">
          <h1 className="font-display text-3xl mb-4">Verifying recovery link...</h1>
          <p className="text-muted-foreground">Please wait while we validate your password reset link.</p>
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="container-x py-16 flex justify-center">
        <div className="w-full max-w-md card-elegant p-8 text-center">
          <h1 className="font-display text-3xl mb-4 text-destructive">Invalid or Expired Link</h1>
          <p className="text-muted-foreground mb-6">{message}</p>
          <div className="flex flex-col gap-3">
            <Link to="/forgot-password" className="btn-primary text-center">
              Request New Reset Email
            </Link>
            <Link to="/login" search={{ redirect: undefined }} className="text-primary font-medium hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (status === "success") {
    return (
      <section className="container-x py-16 flex justify-center">
        <div className="w-full max-w-md card-elegant p-8 text-center">
          <h1 className="font-display text-3xl mb-4 text-green-600">Password Updated Successfully! ✅</h1>
          <p className="text-muted-foreground mb-6">Your password has been changed. You can now sign in with your new password.</p>
          <Button onClick={() => navigate({ to: "/login", search: { redirect: undefined } })}>
            Continue to Login
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md card-elegant p-8">
        <h1 className="font-display text-3xl mb-6">Set new password</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <Label>New Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password"
                required
                minLength={8}
                maxLength={120}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>
          <label className="flex flex-col gap-1">
            <Label>Confirm New Password</Label>
            <Input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
              maxLength={120}
            />
          </label>
          <Button type="submit" disabled={busy}>
            {busy ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </section>
  );
}

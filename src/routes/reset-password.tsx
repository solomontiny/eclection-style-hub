import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — Supplier Affordable" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }
    
    if (busy) return;
    setBusy(true);
    setStatus("idle");
    setMessage("");

    const { error } = await supabase.auth.updateUser({ 
        password: password 
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

  return (
    <section className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md card-elegant p-8">
        <h1 className="font-display text-3xl mb-6">Set new password</h1>
        {status === "success" ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{message}</p>
            <Link to="/login" className="text-primary font-medium hover:underline">Return to login</Link>
          </div>
        ) : (
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
            {status === "error" && <p className="text-destructive text-sm">{message}</p>}
            <Button type="submit" disabled={busy}>
              {busy ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset Password — SupplierAffordable" },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy || cooldown > 0) return;
    setBusy(true);
    setStatus("idle");
    setMessage("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setStatus("error");
      // Handle rate limiting (429)
      if (error.message.includes("rate limit") || error.message.includes("too many requests") || error.status === 429) {
        setCooldown(60);
        setMessage("Too many requests. Please wait 60 seconds before trying again.");
      } else {
        setMessage(error.message);
      }
      setBusy(false);
    } else {
      setStatus("success");
      setMessage("Password reset instructions have been sent to your email.");
      setBusy(false);
    }
  }

  return (
    <section className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md card-elegant p-8">
        <h1 className="font-display text-3xl mb-6">Reset password</h1>
        {status === "success" ? (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">{message}</p>
            <Link to="/login" search={{ redirect: undefined }} className="text-primary font-medium">Return to login</Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </label>
            {status === "error" && <p className="text-destructive text-sm">{message}</p>}
            <Button type="submit" disabled={busy || cooldown > 0}>
              {busy ? "Sending..." : cooldown > 0 ? `Try again in ${cooldown}s` : "Send reset email"}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

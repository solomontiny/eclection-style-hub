import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Sign up — SupplierAffordable" },
      { name: "description", content: "Create an account to track your orders." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = React.useRef(false);
  const [err, setErr] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/account" });
    }
  }, [user, loading, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setErr("");
    setBusy(true);

    try {
      const res = await signUp(email.trim(), password, displayName.trim());
      if (res.error) {
        setErr(res.error);
        busyRef.current = false;
        setBusy(false);
      } else {
        setSignupSuccess(true);
      }
    } catch (err) {
      setErr("An unexpected error occurred.");
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setErr("");
    console.log("[RESEND START]", email.trim());
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
        }
      });
      if (error) {
        console.error("[RESEND ERROR]", error);
        throw error;
      }
      console.log("[RESEND SUCCESS]");
      alert("Verification email resent successfully!");
    } catch (err: any) {
      console.error("[RESEND EXCEPTION]", err);
      setErr(err.message || "Failed to resend verification email");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  if (signupSuccess) {
    return (
      <section className="container-x py-16 flex justify-center">
        <div className="w-full max-w-md card-elegant p-8">
          <h1 className="font-display text-3xl mb-1">Account Created! 🎉</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We've sent a verification email to {email}. Please check your inbox and click the verification link to activate your account.
          </p>
          <div className="flex flex-col gap-3">
            <Button onClick={resendVerification} disabled={busy}>
              {busy ? "Sending..." : "Resend verification email"}
            </Button>
            <Link to="/login" className="text-center text-primary font-medium hover:underline">
              Back to Login
            </Link>
          </div>
          {err && <p className="mt-4 text-destructive text-sm">{err}</p>}
        </div>
      </section>
    );
  }

  return (
    <section className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md card-elegant p-8">
        <h1 className="font-display text-3xl mb-6">Create your account</h1>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <Label>Full name</Label>
            <Input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Jane Doe"
              required
              maxLength={120}
            />
          </label>
          <label className="flex flex-col gap-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              maxLength={160}
            />
          </label>
          <label className="flex flex-col gap-1">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </label>
          {err && <p className="text-destructive text-sm">{err}</p>}
          <Button type="submit" disabled={busy}>
            {busy ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-sm text-center">
          Already have an account?{" "}
          <Link to="/login" search={{ redirect: undefined }} className="text-primary font-medium">Sign in</Link>
        </p>
      </div>
    </section>
  );
}

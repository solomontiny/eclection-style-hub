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
      { title: "Sign up — Supplier Affordable" },
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
    const res = await signUp(email.trim(), password, displayName.trim());
    if (res.error) {
      setErr(res.error);
      setBusy(false);
      busyRef.current = false;
    } else {
      navigate({ to: "/account" });
    }
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

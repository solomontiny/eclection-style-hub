import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in — SupplierAffordable" },
      { name: "description", content: "Sign in or create an account to track your orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [busy, setBusy] = useState(false);
  const busyRef = React.useRef(false);
  const [err, setErr] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  useEffect(() => {
    if (!loading && user) {
      if (search.redirect) {
        navigate({ to: search.redirect });
      } else {
        navigate({ to: "/account" });
      }
    }
  }, [user, loading, navigate, search.redirect]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busyRef.current) return;
    busyRef.current = true;
    setErr("");
    setBusy(true);
    try {
      const res = mode === "signin"
        ? await signIn(email.trim(), password, rememberMe)
        : await signUp(email.trim(), password, displayName.trim() || undefined);
      if (res.error) { 
        setErr(res.error); 
        setBusy(false);
        busyRef.current = false;
      } else if (mode === "signup") {
        setSignupEmail(email.trim());
        setSignupSuccess(true);
      }
    } catch (err) {
      setErr("An unexpected error occurred.");
      setBusy(false);
      busyRef.current = false;
    }
  }

  async function resendVerification() {
    if (busyRef.current) return;
    busyRef.current = true;
    setErr("");
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: signupEmail,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        }
      });
      if (error) throw error;
      alert("Verification email resent successfully!");
    } catch (err: any) {
      setErr(err.message || "Failed to resend verification email");
    } finally {
      busyRef.current = false;
    }
  }

  if (signupSuccess) {
    return (
      <section className="container-x py-16 flex justify-center">
        <div className="w-full max-w-md card-elegant p-8">
          <h1 className="font-display text-3xl mb-1">Account Created! 🎉</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We've sent a verification email to {signupEmail}. Please check your inbox and click the verification link to activate your account.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={resendVerification}
              className="btn-primary"
              disabled={busy}
            >
              {busy ? "Sending..." : "Resend verification email"}
            </button>
            <button
              onClick={() => { setSignupSuccess(false); setMode("signin"); setErr(""); }}
              className="text-primary font-medium hover:underline"
            >
              Back to Login
            </button>
          </div>
          {err && <div className="mt-4 rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>}
        </div>
      </section>
    );
  }

  const signInWithGoogle = async () => {
    setErr("");
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setErr(err.message || "Failed to sign in with Google");
      setBusy(false);
      busyRef.current = false;
    }
  };

  return (
    <section className="container-x py-16 flex justify-center">
      <div className="w-full max-w-md card-elegant p-8">
        <h1 className="font-display text-3xl mb-1">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-muted-foreground text-sm mb-6">
          {mode === "signin"
            ? "Sign in to track orders, save favourites, and check out faster."
            : "Sign up to track orders and save your delivery info."}
        </p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium">Full name</span>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input"
                placeholder="Jane Doe"
                autoComplete="name"
                maxLength={120}
              />
            </label>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              autoComplete="email"
              maxLength={160}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input w-full"
                placeholder="At least 8 characters"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
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

          {mode === "signin" && (
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="accent-primary"
                />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-primary font-medium hover:underline">
                Forgot password?
              </Link>
            </div>
          )}

          {err && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">
              {err}
            </div>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {mode === "signin" && (
          <>
            <div className="relative my-6 text-center text-xs text-muted-foreground before:absolute before:left-0 before:top-1/2 before:w-[40%] before:h-[1px] before:bg-border after:absolute after:right-0 after:top-1/2 after:w-[40%] after:h-[1px] after:bg-border">
              OR
            </div>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2 hover:bg-secondary transition"
              onClick={signInWithGoogle}
              disabled={busy}
            >
              Continue with Google
            </button>
          </>
        )}

        <div className="mt-6 text-sm text-muted-foreground text-center">
          {mode === "signin" ? (
            <>
              No account yet?{" "}
              <button className="text-primary font-medium" onClick={() => { setErr(""); setMode("signup"); }}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button className="text-primary font-medium" onClick={() => { setErr(""); setMode("signin"); }}>
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="underline">Back to shop</Link>
        </div>
      </div>
    </section>
  );
}

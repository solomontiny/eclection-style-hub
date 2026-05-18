import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — E Style Collection" },
      { name: "description", content: "Sign in or create an account to track your orders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, signIn, signUp, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: isAdmin ? "/admin" : "/" });
    }
  }, [user, loading, isAdmin, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = mode === "signin"
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName.trim() || undefined);
      if (res.error) setErr(res.error);
    } finally {
      setBusy(false);
    }
  }

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
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="At least 8 characters"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              maxLength={120}
            />
          </label>

          {err && (
            <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-3 py-2">
              {err}
            </div>
          )}

          <button type="submit" className="btn-primary mt-2" disabled={busy}>
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

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

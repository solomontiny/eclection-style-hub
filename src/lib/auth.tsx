import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session |null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    rememberMe: boolean
  ) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error?: string; data?: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const mapAuthError = (message: string) => {
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (message.includes("Email not confirmed")) {
    return "Please verify your email address before signing in. Check your inbox for the confirmation link.";
  }
  if (message.includes("User already registered")) {
    return "An account with this email already exists. Please sign in instead.";
  }
  if (message.includes("Password should be at least")) {
    return "Password must be at least 6 characters long.";
  }
  if (message.includes("Invalid email")) {
    return "Please enter a valid email address.";
  }
  if (message.includes("rate limit") || message.includes("Too many requests")) {
    return "Too many attempts. Please try again later.";
  }
  if (message === "Error sending confirmation email") {
    return "Account created, but we couldn't send the confirmation email. Please contact support.";
  }
  return message;
};

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const raceResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Session timeout")), 8000)
          ),
        ]);
        const { data, error } = raceResult as {
          data: { session: Session | null };
          error: { message: string } | null;
        };

        if (!mounted) return;

        if (error) {
          console.error("[GET SESSION]", error.message);
        }

        setSession(data.session);
        setUser(data.session?.user ?? null);
        setLoading(false);
      } catch (err) {
        console.error("[SESSION EXCEPTION]", err);
        if (mounted) setLoading(false);
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,

      async signIn(email, password, rememberMe) {
        try {
          const { data, error } =
            await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });

          if (error) {
            console.error("[SIGNIN ERROR]", error);
            return {
              error: mapAuthError(error.message),
            };
          }

          return {};
        } catch (err) {
          console.error("[SIGNIN EXCEPTION]", err);
          return {
            error: err instanceof Error ? err.message : "Unexpected login error.",
          };
        }
      },

      async signUp(email, password, displayName) {
        try {
          const redirectTo =
            typeof window !== "undefined"
              ? `${window.location.origin}/verify-email`
              : undefined;

          const { data, error } =
            await supabase.auth.signUp({
              email: email.trim(),
              password,
              options: {
                emailRedirectTo: redirectTo,
                data: displayName
                  ? {
                      display_name: displayName,
                    }
                  : undefined,
              },
            });

          if (error) {
            console.error("[SIGNUP ERROR FULL]", JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            console.error("[SIGNUP ERROR MESSAGE]", error.message);

            return {
              error: mapAuthError(error.message),
            };
          }

          // Treat as success if user created, even if session is null (email confirmation pending)
          return { data };
        } catch (err) {
          console.error("[SIGNUP EXCEPTION]", err);

          return {
            error: "Unexpected signup error.",
          };
        }
      },

      async signOut() {
        if (isSigningOut) return;
        setIsSigningOut(true);
        try {
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error("[LOGOUT ERROR]", error.message);
          } else {
            setUser(null);
            setSession(null);
          }
        } catch (err) {
          console.error("[LOGOUT EXCEPTION]", err);
        } finally {
          setIsSigningOut(false);
        }
      },
    }),
    [user, session, loading, isSigningOut]
  );


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return ctx;
}

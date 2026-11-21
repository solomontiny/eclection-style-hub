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
  ) => Promise<{ error?: string; data?: any; emailConfirmationRequired?: boolean }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error?: string; data?: any; emailConfirmationRequired?: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const mapAuthError = (message: string) => {
  if (message === "Error sending confirmation email") {
    return "Account created, but we couldn't send the confirmation email. Please contact support.";
  }
  if (message.includes("User already registered")) {
    return "This email is already registered.";
  }
  if (message.includes("Password should be at least")) {
    return "Password is too weak.";
  }
  if (message.includes("Invalid email")) {
    return "Invalid email address.";
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many requests. Please wait a moment and try again.";
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
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("[GET SESSION]", error.message);
        }

        if (!mounted) return;

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
              error: error.message,
            };
          }

          return { data, emailConfirmationRequired: false };
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

          console.log("[SIGNUP SUCCESS]", data.user?.email);

          // Check if email confirmation is needed (session will be null if email not confirmed)
          const emailConfirmationRequired = !data.session && !!data.user;
          
          // If there's a user but no session, email confirmation is required
          // If there's a session, user is already signed in (email confirmation not required or auto-confirmed)
          return { data, emailConfirmationRequired };
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
            console.log("[LOGOUT SUCCESS]");
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

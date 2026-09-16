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
          const { error } =
            await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });

          if (error) {
            return {
              error: error.message,
            };
          }

          return {};
        } catch (err) {
          return {
            error: "Unexpected login error.",
          };
        }
      },

      async signUp(email, password, displayName) {
        try {
          const redirectTo =
            typeof window !== "undefined"
              ? `${window.location.origin}/`
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
            console.error("[SIGNUP ERROR]", error);

            return {
              error: error.message,
            };
          }

          console.log("[SIGNUP SUCCESS]", data.user?.email);

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
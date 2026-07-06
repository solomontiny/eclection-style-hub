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
  isAdmin: boolean;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string
  ) => Promise<{ error?: string }>;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refreshAdmin(userId: string) {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (error) {
        console.warn("[ADMIN]", error.message);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    } catch (err) {
      console.error("[ADMIN EXCEPTION]", err);
      setIsAdmin(false);
    }
  }

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

        if (data.session?.user) {
          await refreshAdmin(data.session.user.id);
        }
      } catch (err) {
        console.error("[SESSION EXCEPTION]", err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!mounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        await refreshAdmin(newSession.user.id);
      } else {
        setIsAdmin(false);
      }
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
      isAdmin,
      loading,

      async signIn(email, password) {
        try {
          console.log("[LOGIN ATTEMPT]", email);

          const { data, error } =
            await supabase.auth.signInWithPassword({
              email: email.trim(),
              password,
            });

          if (error) {
            console.error("[LOGIN ERROR]", error);

            return {
              error: error.message,
            };
          }

          console.log("[LOGIN SUCCESS]", data.user?.email);

          return {};
        } catch (err) {
          console.error("[LOGIN EXCEPTION]", err);

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

          return {};
        } catch (err) {
          console.error("[SIGNUP EXCEPTION]", err);

          return {
            error: "Unexpected signup error.",
          };
        }
      },

      async signOut() {
        try {
          const { error } = await supabase.auth.signOut();

          if (error) {
            console.error("[LOGOUT ERROR]", error.message);
          } else {
            console.log("[LOGOUT SUCCESS]");
          }
        } catch (err) {
          console.error("[LOGOUT EXCEPTION]", err);
        }
      },
    }),
    [user, session, isAdmin, loading]
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
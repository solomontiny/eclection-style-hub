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
  session: Session | null;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔐 refresh admin role
  async function refreshAdmin(userId: string) {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (error) {
        console.warn("[Admin Check Failed]", error.message);
        setIsAdmin(false);
        return;
      }

      setIsAdmin(Boolean(data));
    } catch (err) {
      console.warn("[Admin Check Exception]", err);
      setIsAdmin(false);
    }
  }

  useEffect(() => {
    // 1. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        setTimeout(() => {
          void refreshAdmin(newSession.user.id);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    // 2. Get initial session
    supabase.auth.getSession().then(({ data }) => {
      const currentSession = data.session;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        void refreshAdmin(currentSession.user.id);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isAdmin,
      loading,

      // 🔑 LOGIN (improved debugging)
      async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("[LOGIN ERROR]", error.message);
          return { error: error.message };
        }

        console.log("[LOGIN SUCCESS]", data);
        return {};
      },

      // 🆕 SIGN UP
      async signUp(email, password, displayName) {
        const redirectTo = `${window.location.origin}/`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: displayName
              ? { display_name: displayName }
              : undefined,
          },
        });

        if (error) {
          console.error("[SIGNUP ERROR]", error.message);
          return { error: error.message };
        }

        return {};
      },

      // 🚪 LOGOUT
      async signOut() {
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("[LOGOUT ERROR]", error.message);
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

// 🧠 Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
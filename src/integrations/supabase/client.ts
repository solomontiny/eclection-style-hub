import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase environment variables (STRICT VITE ONLY)
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * HARD FAIL FAST
 */
if (!SUPABASE_URL) {
  throw new Error("❌ Missing VITE_SUPABASE_URL");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("❌ Missing VITE_SUPABASE_ANON_KEY");
}

/**
 * SAFETY CHECK: detect wrong Supabase project instantly
 */
if (SUPABASE_URL.includes("rhbbrrhygdmceqmkwwfe")) {
  throw new Error("❌ OLD SUPABASE PROJECT STILL BEING USED");
}

/**
 * DEBUG (only in browser console)
 */
if (import.meta.env.DEV) {
  console.log("🔗 Supabase URL:", SUPABASE_URL);
}

/**
 * Supabase client
 */
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
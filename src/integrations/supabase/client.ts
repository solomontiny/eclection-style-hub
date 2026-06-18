import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase environment variables (STRICT VITE ONLY)
 * Cloudflare + Vite only inject VITE_* vars reliably
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * HARD FAIL FAST (prevents silent fallback bugs)
 */
if (!SUPABASE_URL) {
  throw new Error(
    "❌ Missing VITE_SUPABASE_URL. Check Cloudflare/Vite environment variables."
  );
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "❌ Missing VITE_SUPABASE_ANON_KEY. Check Cloudflare/Vite environment variables."
  );
}

/**
 * Debug (ONLY visible in dev tools)
 * Helps confirm correct Supabase project is being used
 */
console.log("🔗 Supabase URL in use:", SUPABASE_URL);

/**
 * Supabase client instance
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
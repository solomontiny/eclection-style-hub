import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase environment variables (STRICT VITE ONLY)
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
 * DEBUG: confirms which environment is actually running
 * This is VERY important for Cloudflare debugging
 */
console.log("🔗 Supabase URL in use:", SUPABASE_URL);

/**
 * EXTRA DEBUG: detect wrong Supabase project instantly
 * (this helps catch your old rhbbrrhygdmceqmkwwfe issue)
 */
if (SUPABASE_URL.includes("rhbbrrhygdmceqmkwwfe")) {
  console.error("❌ WRONG SUPABASE PROJECT DETECTED!");
}

/**
 * Cloudflare deploy trigger marker (safe, production-safe)
 * This proves the latest build is being executed
 */
if (import.meta.env.DEV) {
  console.log("🚀 Dev mode active - client.ts loaded correctly");
}

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
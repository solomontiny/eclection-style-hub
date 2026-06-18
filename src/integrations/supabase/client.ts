import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase environment variables (STRICT VITE ONLY)
 * Must be injected by Cloudflare / Vite build system
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * HARD FAIL FAST (prevents silent broken auth)
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
 * DEBUG: confirm correct Supabase project in runtime
 */
console.log("🔗 Supabase URL in use:", SUPABASE_URL);

/**
 * EXTRA SAFETY CHECK (catches old broken project instantly)
 */
if (SUPABASE_URL.includes("rhbbrrhygdmceqmkwwfe")) {
  console.error("❌ WRONG SUPABASE PROJECT STILL BEING USED!");
}

/**
 * 🚀 CLOUDFLARE REBUILD TRIGGER
 * This forces a new build hash when pushed to GitHub
 * Safe: only logs, no runtime impact
 */
console.log("🚀 client.ts build sync:", new Date().toISOString());

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
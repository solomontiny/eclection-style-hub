import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase environment variables (STRICT VITE ONLY)
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * FAIL FAST
 */
if (!SUPABASE_URL) {
  throw new Error("❌ Missing VITE_SUPABASE_URL");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("❌ Missing VITE_SUPABASE_ANON_KEY");
}

/**
 * Validate URL format
 */
if (!SUPABASE_URL.startsWith("https://")) {
  console.warn("⚠️ Supabase URL should start with https://");
}

if (!SUPABASE_URL.includes("supabase.co")) {
  console.warn("⚠️ Supabase URL looks invalid:", SUPABASE_URL);
}

/**
 * DEBUG
 * Safe for production (does NOT expose the anon key)
 */
console.log("🔗 Supabase URL:", SUPABASE_URL);
console.log(
  "🔑 Supabase Anon Key Loaded:",
  !!SUPABASE_ANON_KEY
);

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
    global: {
      headers: {
        "x-application-name": "shop-app",
      },
    },
  }
);
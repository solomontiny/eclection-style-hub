import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Read ONLY Vite environment variables
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

/**
 * Safe validation helper (does NOT crash bundle at import time)
 */
function validateEnv() {
  if (typeof SUPABASE_URL !== "string" || SUPABASE_URL.length === 0) {
    console.error("❌ Missing VITE_SUPABASE_URL");
    return false;
  }

<<<<<<< Updated upstream
if (!SUPABASE_ANON_KEY) {
  throw new Error("❌ Missing VITE_SUPABASE_PUBLISHABLE_KEY");
=======
  if (typeof SUPABASE_ANON_KEY !== "string" || SUPABASE_ANON_KEY.length === 0) {
    console.error("❌ Missing VITE_SUPABASE_ANON_KEY");
    return false;
  }

  try {
    new URL(SUPABASE_URL);
  } catch {
    console.error("❌ Invalid Supabase URL:", SUPABASE_URL);
    return false;
  }

  return true;
>>>>>>> Stashed changes
}

/**
 * Only run validation in browser
 */
const isValidEnv = typeof window !== "undefined" ? validateEnv() : true;

if (!isValidEnv) {
  console.warn("⚠️ Supabase environment is not properly configured");
}

/**
 * Supabase client
 */
export const supabase = createClient<Database>(
  SUPABASE_URL || "",
  SUPABASE_ANON_KEY || "",
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
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Read ONLY Vite environment variables
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Validate environment
 */
function validateEnv() {
  if (!SUPABASE_URL) {
    console.error("❌ Missing VITE_SUPABASE_URL");
    return false;
  }

  if (!SUPABASE_ANON_KEY) {
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
}

/**
 * Only validate in browser
 */
const isValidEnv =
  typeof window !== "undefined" ? validateEnv() : true;

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
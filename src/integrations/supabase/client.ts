import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Read ONLY Vite environment variables
 * These are embedded at build time. In production, they come from .env.production
 * or Cloudflare Pages build environment variables.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * Validate environment
 */
function validateEnv() {
  if (!SUPABASE_URL) {
    console.error("❌ Missing VITE_SUPABASE_URL - ensure .env.production or Cloudflare Pages build env is configured");
    return false;
  }

  if (!SUPABASE_ANON_KEY) {
    console.error("❌ Missing VITE_SUPABASE_ANON_KEY - ensure .env.production or Cloudflare Pages build env is configured");
    return false;
  }

  // Ensure we're using the production project
  const expectedProductionUrl = "https://clvxfobvtqwdmuzqbehk.supabase.co";
  if (SUPABASE_URL !== expectedProductionUrl) {
    console.error("❌ Supabase URL mismatch! Expected:", expectedProductionUrl, "Got:", SUPABASE_URL);
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
 * Validate in browser; during SSR the client isn't used for data fetching
 */
const isValidEnv =
  typeof window !== "undefined" ? validateEnv() : true;

if (!isValidEnv) {
  console.warn("⚠️ Supabase environment is not properly configured - using fallback empty client");
}

/**
 * Supabase client
 * Uses production project: https://clvxfobvtqwdmuzqbehk.supabase.co
 */
export const supabase = createClient<Database>(
  SUPABASE_URL || "https://clvxfobvtqwdmuzqbehk.supabase.co",
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
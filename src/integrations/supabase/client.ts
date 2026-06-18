import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase environment variables
 * Supports both Vite and fallback naming styles
 */
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ??
  import.meta.env.SUPABASE_URL;

const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.SUPABASE_PUBLISHABLE_KEY;

/**
 * Validate required env vars early
 */
if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL. Check your environment variables.");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing SUPABASE_ANON_KEY (or publishable key). Check your environment variables."
  );
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
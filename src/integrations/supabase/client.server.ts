import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only Supabase client (ADMIN LEVEL)
// ⚠️ NEVER expose this to frontend

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[Supabase Admin] Missing server env vars:", {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  });

  throw new Error(
    "[Supabase Admin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);
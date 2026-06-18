import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-side only (Cloudflare / Node / Workers)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  const missing = [
    ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
    ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
  ];

  console.error(
    `[Supabase Middleware] Missing required env vars: ${missing.join(", ")}`
  );

  throw new Error(
    `[Supabase Middleware] Missing env vars: ${missing.join(", ")}`
  );
}

// Admin client (bypasses RLS — ONLY use on server)
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
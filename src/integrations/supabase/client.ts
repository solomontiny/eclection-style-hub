import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Supabase environment variables (STRICT VITE ONLY)
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/**
 * HARD FAIL FAST (prevents silent Supabase misconfig)
 */
if (!SUPABASE_URL) {
  throw new Error("❌ Missing VITE_SUPABASE_URL in .env");
}

if (!SUPABASE_ANON_KEY) {
  throw new Error("❌ Missing VITE_SUPABASE_ANON_KEY in .env");
}

/**
 * SAFETY CHECK: detect wrong Supabase project instantly
 */
if (SUPABASE_URL.includes("rhbbrrhygdmceqmkwwfe")) {
  throw new Error("❌ OLD SUPABASE PROJECT STILL BEING USED");
}

/**
 * DEBUG (dev only)
 */
if (import.meta.env.DEV) {
  console.log("🔗 Supabase URL:", SUPABASE_URL);
  console.log(
    "🔑 Supabase Key Loaded:",
    SUPABASE_ANON_KEY ? "YES" : "NO"
  );
}

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
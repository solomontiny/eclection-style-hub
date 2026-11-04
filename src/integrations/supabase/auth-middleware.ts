import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-side only (Cloudflare / Node / Workers)
// Env vars are injected at request time in the Worker runtime.
// Read via getEnvVar() which falls back to globalThis.__env__ (set by Nitro entry point).

let _adminClient: any = null;

function getEnvVar(key: string): string | undefined {
  const value = process.env[key];
  if (typeof value === "string" && value) return value;
  const env = (globalThis as unknown as { __env__?: Record<string, unknown> }).__env__;
  if (env && typeof env === "object") {
    const binding = env[key];
    if (typeof binding === "string" && binding) return binding;
  }
  return undefined;
}

export function getSupabaseAdmin() {
  if (_adminClient) return _adminClient;

  const SUPABASE_URL = getEnvVar("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

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

  _adminClient = createClient<Database>(
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
  return _adminClient;
}
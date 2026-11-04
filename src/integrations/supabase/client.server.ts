import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-only Supabase client (ADMIN LEVEL)
// ⚠️ NEVER expose this to frontend

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
    console.error("[Supabase Admin] Missing server env vars:", {
      missing: [
        ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
        ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
      ],
    });

    throw new Error(
      "[Supabase Admin] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
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

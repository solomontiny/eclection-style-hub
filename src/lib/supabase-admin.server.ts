import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Lazily created admin client.
 *
 * IMPORTANT: env vars are only injected at request time in the Worker runtime,
 * so the client MUST be created inside a handler — never at module scope.
 */
let cached: SupabaseClient<Database> | null = null;

export function getEnvVar(key: string): string | undefined {
  const env = (globalThis as unknown as { __env__?: Record<string, unknown> }).__env__;
  if (env && typeof env === "object") {
    const binding = env[key];
    if (typeof binding === "string" && binding) return binding;
    if (key === "SUPABASE_URL" && typeof env["VITE_SUPABASE_URL"] === "string" && env["VITE_SUPABASE_URL"]) {
      return env["VITE_SUPABASE_URL"] as string;
    }
    if (key === "SUPABASE_ANON_KEY" && typeof env["VITE_SUPABASE_ANON_KEY"] === "string" && env["VITE_SUPABASE_ANON_KEY"]) {
      return env["VITE_SUPABASE_ANON_KEY"] as string;
    }
  }

  const value = process.env[key];
  if (typeof value === "string" && value) return value;

  if (key === "SUPABASE_URL" && typeof process.env.VITE_SUPABASE_URL === "string" && process.env.VITE_SUPABASE_URL) {
    return process.env.VITE_SUPABASE_URL;
  }
  if (key === "SUPABASE_ANON_KEY" && typeof process.env.VITE_SUPABASE_ANON_KEY === "string" && process.env.VITE_SUPABASE_ANON_KEY) {
    return process.env.VITE_SUPABASE_ANON_KEY;
  }

  return undefined;
}

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = getEnvVar("SUPABASE_URL");
  const key = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    const missing = [
      ...(!url ? ["SUPABASE_URL"] : []),
      ...(!key ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ].join(", ");
    throw new Error(`Server database configuration is missing (${missing}).`);
  }

  cached = createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return cached;
}

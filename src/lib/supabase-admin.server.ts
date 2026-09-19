import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Lazily created admin client.
 *
 * IMPORTANT: env vars are only injected at request time in the Worker runtime,
 * so the client MUST be created inside a handler — never at module scope.
 */
let cached: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

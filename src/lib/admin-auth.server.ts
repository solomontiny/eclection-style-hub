import { getRequestHeaders } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { getSupabaseAdmin, getEnvVar } from "./supabase-admin.server";

export async function getAuthenticatedUserFromRequest() {
  const headers = getRequestHeaders();
  const authHeader = headers.get("authorization");
  const cookieHeader = headers.get("cookie");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
  const authUrl = getEnvVar("SUPABASE_URL");
  const authKey = getEnvVar("SUPABASE_ANON_KEY");

  if (!token || !authUrl || !authKey) {
    console.warn("[getAuthenticatedUserFromRequest] Missing headers or env vars:", {
      hasAuthHeader: !!authHeader,
      hasBearerToken: !!token,
      hasCookie: !!cookieHeader,
      hasAuthUrl: !!authUrl,
      hasAuthKey: !!authKey,
    });
    return null;
  }

  const userClient = createClient<Database>(authUrl, authKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser(token);

  if (error) {
    console.error("[getAuthenticatedUserFromRequest] auth.getUser error:", error.message);
  }

  return user ?? null;
}

export async function requireAdminUser() {
  const user = await getAuthenticatedUserFromRequest();
  if (!user) {
    throw new Error("Unauthorized: Authentication required.");
  }

  const { data: roleData } = await getSupabaseAdmin()
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleData) {
    throw new Error("Unauthorized: Admin access required.");
  }

  return user;
}

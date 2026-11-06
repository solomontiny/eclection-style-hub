import "./lib/error-capture";
import "./lib/orders.functions";
import "./lib/cancel-order.functions";
import "./lib/notifications";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, requestOpts?: unknown) => Promise<Response> | Response;
};

type RuntimeBindings = Record<string, unknown>;

// Vite loads .env into process.env for local development. Cloudflare Workers
// instead provide runtime variables as the `env` argument to fetch, so copy only
// the server-only bindings before TanStack loads modules that read them.
function bindServerEnvironment(env: unknown) {
  if (!env || typeof env !== "object") return;

  const bindings = { ...(env as RuntimeBindings) };
  delete bindings.PAYSTACK_SECRET_KEY;
  delete bindings.VITE_PAYSTACK_PUBLIC_KEY;
  (globalThis as unknown as { __env__?: RuntimeBindings }).__env__ = bindings;

  for (const key of [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "VITE_SUPABASE_URL",
    "VITE_SUPABASE_ANON_KEY",
  ]) {
    const value = bindings[key];
    if (typeof value === "string" && value) {
      process.env[key] = value;
    }
  }

  if (!process.env.SUPABASE_ANON_KEY && process.env.VITE_SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
  }
  if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  }
}

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m: any) => {
        const rawHandler = (m.default ?? m) as ServerEntry;
        const createEntry = m.createServerEntry as ((entry: { fetch: ServerEntry["fetch"] }) => ServerEntry) | undefined;
        if (createEntry) {
          return createEntry({
            fetch(request, requestOpts) {
              return rawHandler.fetch(request, requestOpts);
            },
          });
        }
        return rawHandler;
      },
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  const capturedError = consumeLastCapturedError();
  const errToLog = capturedError ?? new Error(`h3 swallowed SSR error: ${body}`);
  console.error(errToLog instanceof Error ? errToLog.stack : String(errToLog));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      bindServerEnvironment(env);
      const handler = await getServerEntry();
      const response = await handler.fetch(request, { context: ctx });
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error instanceof Error ? error.stack : String(error));
      return brandedErrorResponse();
    }
  },
};

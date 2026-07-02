import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// TanStack Start SSR on Cloudflare Workers.
// Wrangler serves ./dist/server/server.js (Worker) + ./dist/client (assets).
// Wire the server entry so src/server.ts wraps the TanStack handler.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});

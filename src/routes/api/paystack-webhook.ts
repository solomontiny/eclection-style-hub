import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/paystack-webhook")({
  server: {
    handlers: {
      POST: async () => new Response(null, { status: 410 }),
    },
  },
});

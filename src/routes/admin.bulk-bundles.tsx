import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/bulk-bundles")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/bulk-order" });
  },
});

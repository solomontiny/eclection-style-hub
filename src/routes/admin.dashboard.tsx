import { createFileRoute } from "@tanstack/react-router";
import { Route as AdminIndexRoute } from "./admin.index";

// Alias route so /admin/dashboard renders the same dashboard as /admin
export const Route = createFileRoute("/admin/dashboard")({
  component: AdminIndexRoute.options.component!,
});

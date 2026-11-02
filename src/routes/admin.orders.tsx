import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "../pages/admin/Orders";

export const Route = createFileRoute("/admin/orders")({
  component: OrdersPage,
});

import { createFileRoute } from "@tanstack/react-router";
import { PaymentSettingsPage } from "../pages/admin/PaymentSettings";

export const Route = createFileRoute("/admin/payment-settings")({
  component: PaymentSettingsPage,
});

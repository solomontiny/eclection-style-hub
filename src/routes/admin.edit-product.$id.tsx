import { createFileRoute } from "@tanstack/react-router";
import EditProduct from "@/pages/admin/EditProduct";

export const Route = createFileRoute("/admin/edit-product/$id")({
  component: EditProduct,
});

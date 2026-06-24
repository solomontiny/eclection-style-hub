import { createFileRoute } from "@tanstack/react-router";
import AddProduct from "@/pages/admin/AddProduct";

export const Route = createFileRoute("/admin/add-product")({
  component: AddProduct,
});

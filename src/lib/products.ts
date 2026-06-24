import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type Product = ProductRow & {
  category?: string | null;
  image_url?: string | null;
  image?: string | null;
  tag?: string | null;
};

type ProductRowWithCategory = ProductRow & {
  category?: { name: string } | null;
  image_url?: string | null;
};

const normalizeProduct = (product: ProductRowWithCategory): Product => ({
  ...product,
  category: product.category?.name ?? null,
  image_url: product.image_url ?? null,
  image: product.image_url ?? product.images?.[0] ?? null,
});

/**
 * Fetch all products (READ)
 */
export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getProducts error:", error.message);
    throw new Error(error.message);
  }

  return (data || []).map(normalizeProduct);
}

/**
 * Fetch single product by ID (READ ONE)
 */
export async function getProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(name)")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getProductById error:", error.message);
    return null;
  }

  return data ? normalizeProduct(data) : null;
}

/**
 * CREATE product (ADMIN ONLY USE)
 */
export async function createProduct(product: Database["public"]["Tables"]["products"]["Insert"]) {
  const { data, error } = await supabase
    .from("products")
    .insert([product])
    .select()
    .single();

  if (error) {
    console.error("createProduct error:", error.message);
    throw new Error(error.message);
  }

  return normalizeProduct(data);
}

/**
 * UPDATE product (ADMIN ONLY USE)
 */
export async function updateProduct(
  id: string,
  updates: Database["public"]["Tables"]["products"]["Update"]
) {
  const { data, error } = await supabase
    .from("products")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("updateProduct error:", error.message);
    throw new Error(error.message);
  }

  return normalizeProduct(data);
}

/**
 * DELETE product (ADMIN ONLY USE)
 */
export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("deleteProduct error:", error.message);
    throw new Error(error.message);
  }

  return true;
}

/**
 * Format currency (NGN)
 */
export const formatNaira = (n: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n);
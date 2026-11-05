import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { trackApiRequest } from "@/lib/perf-monitor";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type Product = ProductRow & {
  category?: string | null;
  image_url?: string | null;
  image?: string | null;
  tag?: string | null;
  bundle_items?: { id: string; name?: string; quantity: number }[];
  colors?: string[] | null;
  sizes?: string[] | null;
  color_images?: Record<string, string> | null;
};

type ProductRowWithCategory = ProductRow & {
  category?: { name: string; active: boolean } | null;
  image_url?: string | null;
};

const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL", "XXXL"];

export const normalizeProduct = (product: ProductRowWithCategory): Product => ({
  ...product,
  category: product.category?.name ?? null,
  image_url: product.image_url ?? null,
  image: product.image_url ?? product.images?.[0] ?? null,
  colors: (product as any).colors ?? [],
  sizes: Array.isArray((product as any).sizes) && (product as any).sizes.length > 0
    ? (product as any).sizes
    : DEFAULT_SIZES,
  color_images: (product as any).color_images ?? null,
});

const PRODUCT_SELECT_COLUMNS = "id, name, slug, description, category_id, price, discount_percent, stock, low_stock_threshold, images, status, featured, created_at, updated_at, sku, sale_price, product_type, promotion_status, colors, sizes, color_images, category:categories(name, active)";

/**
 * Fetch all categories
 */
export async function getCategories() {
  trackApiRequest("getCategories");
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, active")
    .eq("active", true);

  if (error) {
    console.error("getCategories error:", error.message);
    throw new Error(error.message);
  }

  return data;
}

export interface GetProductsOptions {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  search?: string;
  sort?: "newest" | "name" | "price-low" | "price-high";
  saleOnly?: boolean;
  featured?: boolean;
  productType?: "standard" | "bundle" | "premium";
  status?: "active" | "draft" | "archived" | "all";
}

export interface GetProductsResult {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductFilterOptions {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
  sort?: "newest" | "name" | "price-low" | "price-high";
  saleOnly?: boolean;
  featured?: boolean;
}

export interface PaginatedProductsResult {
  products: Product[];
  totalCount: number;
  pageCount: number;
  currentPage: number;
}

/**
 * Fetch products with server-side pagination, filtering, and sorting (PUBLIC - active only)
 */
export async function getProductsPaginated(options: ProductFilterOptions = {}): Promise<PaginatedProductsResult> {
  const {
    page = 1,
    pageSize = 12,
    category,
    search,
    sort = "newest",
    saleOnly = false,
    featured = false,
  } = options;

  trackApiRequest("getProductsPaginated");

  let query = supabase
    .from("products")
    .select(
      PRODUCT_SELECT_COLUMNS,
      { count: "exact" }
    )
    .eq("status", "active");

  if (category && category !== "all") {
    query = query.eq("category_id", category);
  }

  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`);
  }

  if (saleOnly) {
    query = query.not("sale_price", "is", null);
  }

  if (featured) {
    query = query.eq("featured", true);
  }

  const sortColumn = sort === "name" ? "name" : sort === "price-low" ? "price" : sort === "price-high" ? "price" : "created_at";
  const ascending = sort === "name" || sort === "price-low";

  query = query.order(sortColumn, { ascending });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("getProductsPaginated error:", error.message);
    throw new Error(error.message);
  }

  const totalCount = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    products: (data || []).map(normalizeProduct),
    totalCount,
    pageCount,
    currentPage: page,
  };
}

/**
 * Fetch products with pagination, filtering, and sorting (READ)
 * Used for admin and general queries with flexible status
 */
export async function getProducts(options: GetProductsOptions = {}): Promise<GetProductsResult> {
  trackApiRequest("getProducts");
  const {
    page = 1,
    pageSize = 12,
    categoryId,
    search,
    sort = "newest",
    saleOnly = false,
    featured,
    productType,
    status = "active",
  } = options;

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS, { count: "exact" });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  if (saleOnly) {
    query = query.not("sale_price", "is", null).filter("sale_price", "lt", "price");
  }

  if (featured !== undefined) {
    query = query.eq("featured", featured);
  }

  if (productType) {
    query = query.eq("product_type", productType);
  }

  // Apply sorting
  switch (sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "price-low":
      query = query.order("price", { ascending: true });
      break;
    case "price-high":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("getProducts error:", error.message);
    throw new Error(error.message);
  }

  return {
    products: (data || []).map(normalizeProduct),
    total: count || 0,
    page,
    pageSize,
  };
}

/**
 * Fetch products for admin (includes all statuses) with pagination
 */
export async function getAdminProducts(options: GetProductsOptions = {}): Promise<GetProductsResult> {
  trackApiRequest("getAdminProducts");
  const {
    page = 1,
    pageSize = 10,
    categoryId,
    search,
    sort = "newest",
    status = "all",
  } = options;

  let query = supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS, { count: "exact" });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,sku.ilike.%${search}%`);
  }

  // Apply sorting
  switch (sort) {
    case "name":
      query = query.order("name", { ascending: true });
      break;
    case "price-low":
      query = query.order("price", { ascending: true });
      break;
    case "price-high":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
    default:
      query = query.order("created_at", { ascending: false });
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error("getAdminProducts error:", error.message);
    throw new Error(error.message);
  }

  return {
    products: (data || []).map(normalizeProduct),
    total: count || 0,
    page,
    pageSize,
  };
}

/**
 * Fetch featured products (limit 4)
 */
export async function getFeaturedProducts(limit = 4): Promise<Product[]> {
  trackApiRequest("getFeaturedProducts");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS)
    .eq("status", "active")
    .eq("featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getFeaturedProducts error:", error.message);
    throw new Error(error.message);
  }

  return (data || []).map(normalizeProduct);
}

/**
 * Fetch new arrivals (limit 4)
 */
export async function getNewArrivals(limit = 4): Promise<Product[]> {
  trackApiRequest("getNewArrivals");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getNewArrivals error:", error.message);
    throw new Error(error.message);
  }

  return (data || []).map(normalizeProduct);
}

/**
 * Fetch bundle products (limit 4)
 */
export async function getBundleProducts(limit = 4): Promise<Product[]> {
  trackApiRequest("getBundleProducts");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS)
    .eq("status", "active")
    .eq("product_type", "bundle")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getBundleProducts error:", error.message);
    throw new Error(error.message);
  }

  return (data || []).map(normalizeProduct);
}

/**
 * Fetch on-sale products (limit 4)
 */
export async function getOnSaleProducts(limit = 4): Promise<Product[]> {
  trackApiRequest("getOnSaleProducts");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS)
    .eq("status", "active")
    .not("sale_price", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getOnSaleProducts error:", error.message);
    throw new Error(error.message);
  }

  return (data || []).map(normalizeProduct);
}

/**
 * Fetch single product by ID (READ ONE)
 */
export async function getProductById(id: string): Promise<Product | null> {
  trackApiRequest("getProductById");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS)
    .eq("id", id)
    .single();

  if (error) {
    console.error("getProductById error:", error.message);
    return null;
  }

  return data && data.status === "active" && (data.category_id == null || data.category?.active !== false) ? normalizeProduct(data) : null;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  trackApiRequest("getProductBySlug");
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error("getProductBySlug error:", error.message);
    return null;
  }

  return data && (data.category_id == null || data.category?.active !== false)
    ? normalizeProduct(data)
    : null;
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
 * Fetch products by IDs (for favourites, etc.)
 * Only returns active products. Preserves order of IDs if possible.
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  trackApiRequest("getProductsByIds");
  if (!ids || ids.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT_COLUMNS)
    .in("id", ids)
    .eq("status", "active");

  if (error) {
    console.error("getProductsByIds error:", error.message);
    throw new Error(error.message);
  }

  const products = (data || []).map(normalizeProduct);
  const productMap = new Map(products.map((p) => [p.id, p]));
  // Preserve order of IDs as they were saved
  return ids
    .map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p));
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
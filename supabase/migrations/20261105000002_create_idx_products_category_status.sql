CREATE INDEX IF NOT EXISTS idx_products_category_status
  ON public.products (category_id, status, created_at DESC);

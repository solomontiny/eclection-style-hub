CREATE INDEX IF NOT EXISTS idx_products_status_sale_price
  ON public.products (status, sale_price)
  WHERE sale_price IS NOT NULL;

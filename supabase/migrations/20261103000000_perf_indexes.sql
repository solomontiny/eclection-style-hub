-- Performance indexes for frequently queried/order columns (bandwidth & query efficiency)
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products (featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_products_status_created ON public.products (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON public.order_items (product_id);

-- Additional indexes for optimized query patterns
CREATE INDEX IF NOT EXISTS idx_products_category_status ON public.products (category_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_status_sale_price ON public.products (status, sale_price) WHERE sale_price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_type_status ON public.products (product_type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_search ON public.products USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(sku, '')));
CREATE INDEX IF NOT EXISTS idx_categories_active_name ON public.categories (active, name) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications (order_id, is_read) WHERE is_read = false;
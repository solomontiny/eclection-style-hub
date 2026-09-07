-- Additive fields required by the admin shop manager.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12,2),
  ADD CONSTRAINT products_sale_price_nonnegative CHECK (sale_price IS NULL OR sale_price >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_unique
  ON public.products (sku)
  WHERE sku IS NOT NULL AND sku <> '';

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'payment_status'
  ) THEN
    CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
  END IF;
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status public.payment_status NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_discount NUMERIC(12,2);

ALTER TABLE public.coupons
  ADD CONSTRAINT coupons_max_discount_nonnegative
  CHECK (max_discount IS NULL OR max_discount >= 0);

CREATE TABLE IF NOT EXISTS public.shop_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  store_name TEXT NOT NULL DEFAULT 'SupplierAffordable',
  store_description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  currency TEXT NOT NULL DEFAULT 'NGN',
  shipping_flat_rate NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (shipping_flat_rate >= 0),
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (tax_percent >= 0 AND tax_percent <= 100),
  store_policies TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.shop_settings TO authenticated;
GRANT ALL ON public.shop_settings TO service_role;

DROP POLICY IF EXISTS "Admins manage shop settings" ON public.shop_settings;
CREATE POLICY "Admins manage shop settings"
  ON public.shop_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP TRIGGER IF EXISTS trg_shop_settings_updated ON public.shop_settings;
CREATE TRIGGER trg_shop_settings_updated
  BEFORE UPDATE ON public.shop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.shop_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'standard';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotion_status text NOT NULL DEFAULT 'regular';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_discount numeric;

CREATE TABLE IF NOT EXISTS public.bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  child_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (parent_product_id, child_product_id)
);
GRANT SELECT ON public.bundles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bundles TO authenticated;
GRANT ALL ON public.bundles TO service_role;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Bundles viewable by all' AND tablename = 'bundles') THEN
    CREATE POLICY "Bundles viewable by all" ON public.bundles FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins manage bundles' AND tablename = 'bundles') THEN
    CREATE POLICY "Admins manage bundles" ON public.bundles FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bundles_updated_at') THEN
        CREATE TRIGGER update_bundles_updated_at BEFORE UPDATE ON public.bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END
$$;
-- Add product type, promotion status, and bundle support

-- Add Enums for constraints
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type_enum') THEN
        CREATE TYPE public.product_type_enum AS ENUM ('standard', 'bundle', 'premium');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'promotion_status_enum') THEN
        CREATE TYPE public.promotion_status_enum AS ENUM ('regular', 'sale', 'flash_sale');
    END IF;
END $$;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type public.product_type_enum NOT NULL DEFAULT 'standard';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS promotion_status public.promotion_status_enum NOT NULL DEFAULT 'regular';

-- Bundle relationship
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bundles') THEN
        CREATE TABLE public.bundles (
          id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
          parent_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
          child_product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
          quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          CONSTRAINT parent_child_not_same CHECK (parent_product_id <> child_product_id),
          CONSTRAINT unique_bundle_item UNIQUE (parent_product_id, child_product_id)
        );
    ELSE
        -- Validate structure if it exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bundles' AND column_name = 'parent_product_id') THEN
            RAISE EXCEPTION 'Table bundles exists but is missing required column parent_product_id';
        END IF;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bundles_parent ON public.bundles(parent_product_id);
CREATE INDEX IF NOT EXISTS idx_bundles_child ON public.bundles(child_product_id);

-- RLS
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view bundles" ON public.bundles FOR SELECT USING (true);
CREATE POLICY "Admins manage bundles" ON public.bundles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'admin')) 
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

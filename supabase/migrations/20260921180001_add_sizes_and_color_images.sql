-- Add sizes and color_images columns to products
-- sizes: TEXT[] of available sizes (e.g. ['S','M','L','XL'])
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sizes TEXT[] DEFAULT '{}';

-- color_images: JSONB mapping color name -> image URL
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color_images JSONB DEFAULT '{}'::jsonb;

-- Index for faster color_images lookups is not needed (JSONB is flexible)
CREATE INDEX IF NOT EXISTS idx_products_sizes ON public.products USING GIN (sizes);

-- Add bulk order configuration fields to shop_settings
ALTER TABLE public.shop_settings
ADD COLUMN IF NOT EXISTS bulk_order_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS bulk_min_qty integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS bulk_unit_price numeric DEFAULT 6000,
ADD COLUMN IF NOT EXISTS bulk_instructions text DEFAULT 'Choose a quantity for each colour or design. Minimum bundle is 10 pieces.';

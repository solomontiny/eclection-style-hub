-- Add tracking number column to orders (preserves existing records)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;

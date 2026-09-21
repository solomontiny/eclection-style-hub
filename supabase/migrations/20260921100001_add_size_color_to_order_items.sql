-- Add size and color columns to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS size TEXT DEFAULT '';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '';

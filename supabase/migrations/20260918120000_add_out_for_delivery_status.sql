ALTER TYPE public.order_status ADD VALUE 'out_for_delivery';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;

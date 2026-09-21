ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notified_status public.order_status;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS notified_tracking TEXT;

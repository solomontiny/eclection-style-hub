ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'not_delivered'
  CHECK (delivery_status IN ('not_delivered', 'delivered'));

-- Add courier and estimated delivery fields to orders
-- Reconciled with the remote project (already applied there)

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier TEXT,
  ADD COLUMN IF NOT EXISTS estimated_delivery TEXT;

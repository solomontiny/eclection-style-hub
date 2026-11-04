-- Add payment_method column to orders table
-- Supports 'paystack' (default) and 'bank_transfer'

CREATE TYPE public.payment_method AS ENUM ('paystack', 'bank_transfer');

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method public.payment_method NOT NULL DEFAULT 'paystack';

COMMENT ON COLUMN public.orders.payment_method IS 'Payment method used for this order: paystack or bank_transfer';
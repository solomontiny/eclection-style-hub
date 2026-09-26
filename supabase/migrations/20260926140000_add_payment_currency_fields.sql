-- Add payment currency and payment amount fields to orders table
-- These track the actual Paystack payment currency and amount (in major units)
-- for accurate verification and audit trail.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_currency TEXT,
  ADD COLUMN IF NOT EXISTS payment_amount NUMERIC(12,2);

-- Add comments for documentation
COMMENT ON COLUMN public.orders.payment_currency IS 'Actual currency used for Paystack payment (may differ from display currency for unsupported currencies)';
COMMENT ON COLUMN public.orders.payment_amount IS 'Payment amount in major currency units (e.g., GHS 84.00, not pesewas)';
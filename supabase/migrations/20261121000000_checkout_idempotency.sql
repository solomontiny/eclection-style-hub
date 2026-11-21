-- Checkout Idempotency Migration
-- Adds attempt key and fingerprint columns with uniqueness constraint

-- Add idempotency columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_attempt_key text,
  ADD COLUMN IF NOT EXISTS checkout_request_fingerprint text;

-- Unique constraint for idempotency:
-- For authenticated users: (user_id, checkout_attempt_key)
-- For guest checkout: (customer_email, checkout_attempt_key)
-- Only enforced when checkout_attempt_key is provided
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_checkout_attempt_unique
  ON public.orders (
    COALESCE(user_id::text, 'guest:' || lower(customer_email)),
    checkout_attempt_key
  )
  WHERE checkout_attempt_key IS NOT NULL;

-- Comment for documentation
COMMENT ON COLUMN public.orders.checkout_attempt_key IS 'Client-generated unique key for idempotent checkout retry. One key per logical checkout attempt.';
COMMENT ON COLUMN public.orders.checkout_request_fingerprint IS 'Hash of request payload to detect tampering on retry.';
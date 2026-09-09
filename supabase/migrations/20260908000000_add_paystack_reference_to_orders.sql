-- Add Paystack reference to orders to track secure payments.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS paystack_reference TEXT;

-- Create a unique index for paystack_reference, allowing NULLs for historical orders.
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_paystack_reference_unique
  ON public.orders (paystack_reference)
  WHERE paystack_reference IS NOT NULL;

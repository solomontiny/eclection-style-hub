-- Migration: Add payment_receipts table for tracking bank transfer payment confirmations
-- This table supports the bank transfer payment workflow where customers
-- pay via Moniepoint bank transfer and admins verify payments manually.
--
-- The table tracks the email receipt state for each paid order so that:
--   - Only one receipt is sent per order
--   * Failed receipts can be retried by admins
--   - Duplicate receipts are prevented
--
-- This migration is DRAFT ONLY. Do not apply to production without review.

-- Create payment_receipts table
CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_payment_receipts_status
  ON public.payment_receipts(status);

-- Index for querying by order_id
CREATE INDEX IF NOT EXISTS idx_payment_receipts_order
  ON public.payment_receipts(order_id);

-- Enable RLS on payment_receipts
ALTER TABLE public.payment_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read/write payment receipts
CREATE POLICY "Admins can manage payment receipts"
  ON public.payment_receipts
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Grant service role access for server-side functions
GRANT INSERT, UPDATE, SELECT ON public.payment_receipts TO service_role;

-- Add payment_receipt to notifications type CHECK constraint
-- First drop the existing constraint, then add the new one
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_order', 'status_change', 'stock_alert', 'payment_receipt'));

-- Note: The exact constraint name (notifications_type_check) may vary.
-- Run the following to discover the actual name before applying:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'public.notifications'::regclass AND contype = 'c';

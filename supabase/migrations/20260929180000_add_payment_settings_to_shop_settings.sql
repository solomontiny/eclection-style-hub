-- Manual bank transfer + WhatsApp payment settings.
--
-- Reuses the EXISTING `shop_settings` singleton row (id = 'default'), the same
-- pattern already used by 20260924000000_add_bulk_order_settings.sql. No new
-- table, no new storage system: shop_settings already exists and is already
-- protected by the admin-only RLS policy added in the drizzle migration
-- 0001_restrict_shop_settings_to_admins.sql.
--
--   bank_accounts   jsonb array of { bankName, accountName, accountNumber, active }
--                   so the admin can manage any number of accounts.
--   whatsapp_number text   business/support number customers use to send
--                   their payment receipt (read by the payment instructions page).
--
-- This file is intentionally NOT applied. Apply it with the Supabase CLI /
-- SQL editor only after review.

ALTER TABLE public.shop_settings
ADD COLUMN IF NOT EXISTS bank_accounts jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS whatsapp_number text;

COMMENT ON COLUMN public.shop_settings.bank_accounts IS
  'Bank transfer accounts shown on the payment instructions page: [{ bankName, accountName, accountNumber, active }]';
COMMENT ON COLUMN public.shop_settings.whatsapp_number IS
  'Business WhatsApp number customers use to send payment receipts (wa.me format).';

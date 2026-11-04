-- Add bank transfer payment settings to shop_settings
-- Reconciled with the remote project (already applied there)

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS bank_accounts JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

COMMENT ON COLUMN public.shop_settings.bank_accounts IS 'Array of bank accounts: [{bank_name, account_name, account_number, sort_code}]';
COMMENT ON COLUMN public.shop_settings.whatsapp_number IS 'WhatsApp number for payment proof submissions';

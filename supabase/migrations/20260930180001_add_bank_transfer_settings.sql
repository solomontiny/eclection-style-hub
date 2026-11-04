-- Add bank transfer settings to shop_settings table
-- Supports multiple bank accounts via JSONB array

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS bank_transfer_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bank_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_transfer_instructions TEXT;

COMMENT ON COLUMN public.shop_settings.bank_transfer_enabled IS 'Enable bank transfer as a payment method';
COMMENT ON COLUMN public.shop_settings.bank_accounts IS 'Array of bank accounts: [{bank_name, account_name, account_number, sort_code}]';
COMMENT ON COLUMN public.shop_settings.whatsapp_number IS 'WhatsApp number for payment proof submissions';
COMMENT ON COLUMN public.shop_settings.bank_transfer_instructions IS 'Additional instructions for bank transfer payments';
-- supabase/migrations/20261121115917_add_bank_transfer_config_and_public_view.sql

-- 1. Add missing payment configuration columns to shop_settings
ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS bank_accounts JSONB;

UPDATE public.shop_settings
SET bank_accounts = '[]'::jsonb
WHERE bank_accounts IS NULL;

ALTER TABLE public.shop_settings
  ALTER COLUMN bank_accounts SET NOT NULL,
  ALTER COLUMN bank_accounts SET DEFAULT '[]'::jsonb;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;

ALTER TABLE public.shop_settings
  ADD COLUMN IF NOT EXISTS bank_transfer_instructions TEXT;

ALTER TABLE public.shop_settings
  ALTER COLUMN bank_transfer_enabled SET DEFAULT false;

-- 2. Create public views (originally with security_invoker = off, later corrected)
CREATE OR REPLACE VIEW public.shop_payment_config
WITH (security_invoker = off) AS
SELECT
  id,
  bank_transfer_enabled,
  bank_accounts,
  whatsapp_number,
  bank_transfer_instructions
FROM public.shop_settings
WHERE id = 'default';

GRANT SELECT ON public.shop_payment_config TO anon;

CREATE OR REPLACE VIEW public.shop_video_config
WITH (security_invoker = off) AS
SELECT
  id,
  video_url,
  video_title,
  video_description,
  poster_image_url,
  is_video_advert_enabled
FROM public.shop_settings
WHERE id = 'default';

GRANT SELECT ON public.shop_video_config TO anon;
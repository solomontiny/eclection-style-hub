-- supabase/migrations/20261121120010_secure_public_shop_settings_column_access.sql

-- This migration corrects the public views to use security_invoker = true
-- and restricts anonymous access on the underlying shop_settings table
-- to only the columns exposed via the public views.

-- 1. Revoke all privileges from anon on the underlying table
REVOKE ALL PRIVILEGES ON TABLE public.shop_settings FROM anon;

-- 2. Grant SELECT only on the specific columns exposed via views
GRANT SELECT (
  id,
  bank_transfer_enabled,
  bank_accounts,
  whatsapp_number,
  bank_transfer_instructions,
  video_url,
  video_title,
  video_description,
  poster_image_url,
  is_video_advert_enabled
) ON public.shop_settings TO anon;

-- 3. Recreate payment config view with security_invoker = true
CREATE OR REPLACE VIEW public.shop_payment_config
WITH (security_invoker = true) AS
SELECT
  id,
  bank_transfer_enabled,
  bank_accounts,
  whatsapp_number,
  bank_transfer_instructions
FROM public.shop_settings
WHERE id = 'default';

GRANT SELECT ON public.shop_payment_config TO anon;

-- 4. Recreate video config view with security_invoker = true
CREATE OR REPLACE VIEW public.shop_video_config
WITH (security_invoker = true) AS
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
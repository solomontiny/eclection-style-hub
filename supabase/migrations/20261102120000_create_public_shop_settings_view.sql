-- Create a hardened secure public view for storefront and checkout settings
-- Excludes administrative audit columns (created_at, updated_at).
-- Restricts projection strictly to public storefront, checkout, bank-transfer, contact, bulk-order and video-advert settings.
-- The base shop_settings table remains fully protected by RLS (admin access only).

CREATE OR REPLACE VIEW public.public_shop_settings 
WITH (security_invoker = false) AS
SELECT 
  id,
  store_name,
  store_description,
  store_policies,
  currency,
  shipping_flat_rate,
  tax_percent,
  vat_rate,
  is_vat_enabled,
  bank_transfer_enabled,
  bank_accounts,
  bank_transfer_instructions,
  whatsapp_number,
  contact_email,
  contact_phone,
  bulk_order_enabled,
  bulk_unit_price,
  bulk_min_qty,
  bulk_instructions,
  video_title,
  video_description,
  video_url,
  poster_image_url,
  is_video_advert_enabled
FROM public.shop_settings
WHERE id = 'default';

-- Grant SELECT only to anon and authenticated users
GRANT SELECT ON public.public_shop_settings TO anon, authenticated;

-- Comment on view
COMMENT ON VIEW public.public_shop_settings IS 'Hardened public-facing view of shop settings. Exposes only public storefront and checkout configurations. Base table shop_settings remains strictly restricted to administrators.';

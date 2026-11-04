-- Fix shop_settings RLS policies to allow public/customer read access for checkout and payment instructions
DROP POLICY IF EXISTS "Admins view settings" ON public.shop_settings;
DROP POLICY IF EXISTS "Settings viewable by all" ON public.shop_settings;
DROP POLICY IF EXISTS "Shop settings viewable by everyone" ON public.shop_settings;

CREATE POLICY "Shop settings viewable by everyone"
ON public.shop_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins manage shop settings"
ON public.shop_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.shop_settings TO anon, authenticated;

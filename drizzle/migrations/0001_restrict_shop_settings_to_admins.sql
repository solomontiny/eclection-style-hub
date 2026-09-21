DROP POLICY IF EXISTS "Settings viewable by all" ON public.shop_settings;

CREATE POLICY "Admins view settings"
ON public.shop_settings
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

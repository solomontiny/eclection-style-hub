-- Preserve the existing schema while restoring the permissions required by
-- the browser admin guard and the admin customer dashboard.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view customer profiles" ON public.profiles;
CREATE POLICY "Users and admins can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
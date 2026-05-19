
-- Restrict profiles SELECT to owner
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Prevent admins from granting/modifying admin role via RLS
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage non-admin roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role)
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND role <> 'admin'::app_role);

-- Allow anonymous users to execute has_role
-- This is necessary for RLS policies that might be checked even for anonymous users.
-- The function is SECURITY DEFINER, so it is safe.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;

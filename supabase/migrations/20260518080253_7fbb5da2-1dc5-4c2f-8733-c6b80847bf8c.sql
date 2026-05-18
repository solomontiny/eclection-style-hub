
-- handle_new_user is a trigger function — no one should call it directly
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- has_role is used by RLS policies; restrict to authenticated only
revoke all on function public.has_role(uuid, public.app_role) from public, anon;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;

-- update_updated_at_column is a trigger function
revoke all on function public.update_updated_at_column() from public, anon, authenticated;

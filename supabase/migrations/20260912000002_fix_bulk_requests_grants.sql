-- Add necessary table grants for bulk_requests to allow RLS policies to function
GRANT INSERT ON public.bulk_requests TO anon, authenticated;
GRANT SELECT ON public.bulk_requests TO authenticated;
GRANT ALL ON public.bulk_requests TO service_role;

-- Add missing UPDATE grant to bulk_requests for authenticated users.
-- RLS policies will still govern which rows can be updated (specifically, the 'Admins can manage all' policy).
GRANT UPDATE ON public.bulk_requests TO authenticated;

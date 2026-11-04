-- Enable realtime publication for orders and bulk_requests
-- Reconciled with the remote project (already applied there)

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_requests;

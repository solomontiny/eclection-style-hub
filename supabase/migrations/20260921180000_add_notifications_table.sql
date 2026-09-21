-- Notifications table for admin dashboard + email notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('new_order', 'status_change', 'stock_alert')),
  title TEXT NOT NULL,
  message TEXT,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sent_email BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications (is_read)
  WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_order ON public.notifications (order_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view notifications" ON public.notifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can mark notifications read" ON public.notifications FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE ON public.notifications TO service_role;

-- Customer payment confirmation notifications
-- Customer payment confirmation notifications.
-- Applied and verified on the linked production Supabase project.

CREATE TABLE IF NOT EXISTS public.customer_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_notifications_one_payment_confirmed_per_order
    UNIQUE (order_id, type)
);

ALTER TABLE public.customer_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own notifications"
ON public.customer_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.mark_customer_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE public.customer_notifications
  SET is_read = true
  WHERE id = p_notification_id
    AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notification not found';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_customer_notification_read(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_customer_notification_read(uuid) FROM anon, public;

CREATE OR REPLACE FUNCTION public.create_customer_payment_confirmation_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF OLD.payment_status = 'pending'
     AND NEW.payment_status = 'paid'
     AND NEW.user_id IS NOT NULL THEN
    INSERT INTO public.customer_notifications (
      user_id,
      order_id,
      type,
      title,
      message
    )
    VALUES (
      NEW.user_id,
      NEW.id,
      'payment_confirmed',
      'Payment confirmed',
      'Your payment for order ' || NEW.order_number || ' has been confirmed.'
    )
    ON CONFLICT (order_id, type) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER customer_payment_confirmation_notification
AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW
WHEN (OLD.payment_status IS DISTINCT FROM NEW.payment_status)
EXECUTE FUNCTION public.create_customer_payment_confirmation_notification();

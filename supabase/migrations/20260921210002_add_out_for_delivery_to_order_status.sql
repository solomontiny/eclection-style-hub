-- Add out_for_delivery to order_status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'order_status') AND enumlabel = 'out_for_delivery') THEN
    ALTER TYPE public.order_status ADD VALUE 'out_for_delivery';
  END IF;
END$$;

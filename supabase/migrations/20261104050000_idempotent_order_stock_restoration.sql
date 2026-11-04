CREATE TABLE public.order_stock_reservations (
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL,
  outstanding_product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
  reserved_quantity integer NOT NULL CHECK (reserved_quantity > 0),
  restored_at timestamptz,
  PRIMARY KEY (order_id, product_id),
  CHECK (
    (restored_at IS NULL AND outstanding_product_id IS NOT DISTINCT FROM product_id)
    OR (restored_at IS NOT NULL AND outstanding_product_id IS NULL)
  )
);

CREATE OR REPLACE FUNCTION public.prevent_order_delete_with_outstanding_reservations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.order_stock_reservations
    WHERE order_id = OLD.id
      AND restored_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'Cannot delete order % while stock reservations are outstanding. Cancel the eligible unpaid order to restore stock first.',
      OLD.order_number;
  END IF;

  RETURN OLD;
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_order_delete_with_outstanding_reservations()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prevent_order_delete_with_outstanding_reservations()
TO service_role;

CREATE TRIGGER prevent_order_delete_with_outstanding_reservations
BEFORE DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.prevent_order_delete_with_outstanding_reservations();

ALTER TABLE public.order_stock_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.order_stock_reservations FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.order_stock_reservations TO service_role;

CREATE OR REPLACE FUNCTION public.create_order_with_stock_reservations(
  p_order jsonb,
  p_items jsonb
)
RETURNS TABLE (
  id uuid,
  order_number text,
  total numeric,
  payment_status public.payment_status
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item_count integer;
  v_reservation record;
BEGIN
  IF jsonb_typeof(p_order) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid order or order items.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invalid order or order items.';
  END IF;

  SELECT count(*) INTO v_item_count
  FROM jsonb_to_recordset(p_items) AS item(
    product_id uuid,
    quantity integer
  )
  WHERE product_id IS NULL OR quantity IS NULL OR quantity <= 0;

  IF v_item_count > 0 THEN
    RAISE EXCEPTION 'Order items must include a product and positive quantity.';
  END IF;

  INSERT INTO public.orders (
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    subtotal,
    discount,
    shipping,
    vat_amount,
    vat_rate,
    taxable_subtotal,
    total,
    payment_status,
    payment_method,
    paystack_reference,
    currency,
    payment_currency,
    payment_amount,
    notes
  )
  VALUES (
    (p_order ->> 'user_id')::uuid,
    p_order ->> 'customer_name',
    p_order ->> 'customer_email',
    NULLIF(p_order ->> 'customer_phone', ''),
    CASE
      WHEN p_order -> 'shipping_address' IS NULL
        OR jsonb_typeof(p_order -> 'shipping_address') = 'null'
      THEN NULL
      ELSE p_order -> 'shipping_address'
    END,
    (p_order ->> 'subtotal')::numeric,
    (p_order ->> 'discount')::numeric,
    (p_order ->> 'shipping')::numeric,
    (p_order ->> 'vat_amount')::numeric,
    (p_order ->> 'vat_rate')::numeric,
    (p_order ->> 'taxable_subtotal')::numeric,
    (p_order ->> 'total')::numeric,
    'pending',
    'bank_transfer',
    p_order ->> 'paystack_reference',
    p_order ->> 'currency',
    p_order ->> 'payment_currency',
    (p_order ->> 'payment_amount')::numeric,
    p_order ->> 'notes'
  )
  RETURNING * INTO v_order;

  INSERT INTO public.order_items (
    order_id,
    product_id,
    product_name,
    unit_price,
    quantity,
    subtotal,
    size,
    color,
    bundle_id
  )
  SELECT
    v_order.id,
    item.product_id,
    item.product_name,
    item.unit_price,
    item.quantity,
    item.subtotal,
    item.size,
    item.color,
    item.bundle_id
  FROM jsonb_to_recordset(p_items) AS item(
    product_id uuid,
    product_name text,
    unit_price numeric,
    quantity integer,
    subtotal numeric,
    size text,
    color text,
    bundle_id text
  );

  INSERT INTO public.order_stock_reservations (
    order_id,
    product_id,
    outstanding_product_id,
    reserved_quantity
  )
  SELECT
    v_order.id,
    order_item.product_id,
    order_item.product_id,
    sum(order_item.quantity)::integer
  FROM public.order_items AS order_item
  WHERE order_item.order_id = v_order.id
  GROUP BY order_item.product_id;

  FOR v_reservation IN
    SELECT product_id, reserved_quantity
    FROM public.order_stock_reservations
    WHERE order_id = v_order.id
    ORDER BY product_id
  LOOP
    UPDATE public.products
    SET stock = stock - v_reservation.reserved_quantity,
        updated_at = now()
    WHERE id = v_reservation.product_id
      AND stock >= v_reservation.reserved_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One or more items no longer have enough stock. Please refresh your cart and try again.';
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT v_order.id, v_order.order_number, v_order.total, v_order.payment_status;
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_stock_reservations(jsonb, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock_reservations(jsonb, jsonb)
TO service_role;

CREATE OR REPLACE FUNCTION public.cancel_pending_order_and_restore_reserved_stock(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_order_status public.order_status;
  v_payment_status public.payment_status;
  v_reservation_count integer;
  v_unrestored_count integer;
  v_item_count integer;
  v_reservation record;
BEGIN
  SELECT status, payment_status
  INTO v_order_status, v_payment_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  SELECT count(*), count(*) FILTER (WHERE restored_at IS NULL)
  INTO v_reservation_count, v_unrestored_count
  FROM public.order_stock_reservations
  WHERE order_id = p_order_id;

  IF v_reservation_count = 0 THEN
    RAISE EXCEPTION 'Order stock reservations are incomplete; manual review is required.';
  END IF;

  IF v_unrestored_count = 0 THEN
    IF v_order_status = 'cancelled' THEN
      RETURN 'already_restored';
    END IF;
    RAISE EXCEPTION 'Stock reservations are marked restored for a non-cancelled order.';
  END IF;

  IF v_unrestored_count <> v_reservation_count THEN
    RAISE EXCEPTION 'Order stock reservations are partially restored; manual review is required.';
  END IF;

  IF v_order_status IS DISTINCT FROM 'pending'
     OR v_payment_status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Only unpaid pending orders can be cancelled.';
  END IF;

  SELECT count(*) INTO v_item_count
  FROM public.order_items
  WHERE order_id = p_order_id;

  IF v_item_count = 0
     OR EXISTS (
       SELECT 1
       FROM public.order_items
       WHERE order_id = p_order_id
         AND product_id IS NULL
     )
     OR EXISTS (
       SELECT 1
       FROM (
         SELECT product_id, sum(quantity)::bigint AS quantity
         FROM public.order_items
         WHERE order_id = p_order_id
         GROUP BY product_id
       ) AS order_item_totals
       FULL OUTER JOIN (
         SELECT product_id, reserved_quantity::bigint AS quantity
         FROM public.order_stock_reservations
         WHERE order_id = p_order_id
       ) AS reservations USING (product_id)
       WHERE order_item_totals.quantity IS DISTINCT FROM reservations.quantity
     ) THEN
    RAISE EXCEPTION 'Order stock reservations are incomplete; manual review is required.';
  END IF;

  FOR v_reservation IN
    SELECT product_id, reserved_quantity
    FROM public.order_stock_reservations
    WHERE order_id = p_order_id
      AND restored_at IS NULL
    ORDER BY product_id
    FOR UPDATE
  LOOP
    UPDATE public.products
    SET stock = stock + v_reservation.reserved_quantity,
        updated_at = now()
    WHERE id = v_reservation.product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Reserved product % no longer exists.', v_reservation.product_id;
    END IF;

    UPDATE public.order_stock_reservations
    SET restored_at = now(),
        outstanding_product_id = NULL
    WHERE order_id = p_order_id
      AND product_id = v_reservation.product_id
      AND restored_at IS NULL;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock reservation was concurrently changed.';
    END IF;
  END LOOP;

  UPDATE public.orders
  SET status = 'cancelled',
      updated_at = now()
  WHERE id = p_order_id
    AND status = 'pending'
    AND payment_status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only unpaid pending orders can be cancelled.';
  END IF;

  RETURN 'restored';
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_pending_order_and_restore_reserved_stock(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pending_order_and_restore_reserved_stock(uuid)
TO service_role;

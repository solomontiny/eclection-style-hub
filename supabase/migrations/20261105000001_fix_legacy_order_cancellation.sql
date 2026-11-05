-- Allow cancellation of legacy orders created before stock reservations existed.
-- For orders with no reservation rows, restore stock from order_items and record
-- the restoration in order_stock_reservations for idempotency.
CREATE OR REPLACE FUNCTION public.cancel_pending_order_and_restore_reserved_stock(p_order_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
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

  -- Legacy orders created before the reservation system have no rows.
  IF v_reservation_count = 0 THEN
    SELECT count(*) INTO v_item_count
    FROM public.order_items
    WHERE order_id = p_order_id;

    IF v_item_count = 0
       OR EXISTS (
         SELECT 1
         FROM public.order_items
         WHERE order_id = p_order_id
           AND product_id IS NULL
       ) THEN
      RAISE EXCEPTION 'Legacy order stock cannot be safely restored: missing or incomplete order items. Manual review is required.';
    END IF;

    FOR v_reservation IN
      SELECT product_id, sum(quantity)::integer AS reserved_quantity
      FROM public.order_items
      WHERE order_id = p_order_id
      GROUP BY product_id
      ORDER BY product_id
    LOOP
      UPDATE public.products
      SET stock = stock + v_reservation.reserved_quantity,
          updated_at = now()
      WHERE id = v_reservation.product_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Reserved product % no longer exists.', v_reservation.product_id;
      END IF;

      INSERT INTO public.order_stock_reservations (
        order_id,
        product_id,
        outstanding_product_id,
        reserved_quantity,
        restored_at
      )
      VALUES (
        p_order_id,
        v_reservation.product_id,
        NULL,
        v_reservation.reserved_quantity,
        now()
      )
      ON CONFLICT (order_id, product_id) DO NOTHING;
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
$function$;

REVOKE ALL ON FUNCTION public.cancel_pending_order_and_restore_reserved_stock(uuid)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_pending_order_and_restore_reserved_stock(uuid)
TO service_role;

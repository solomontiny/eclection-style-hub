-- Updated create_order_with_stock_reservations with idempotency support
-- Receives attempt key and fingerprint in p_order jsonb

CREATE OR REPLACE FUNCTION public.create_order_with_stock_reservations(p_order jsonb, p_items jsonb)
RETURNS TABLE(id uuid, order_number text, total numeric, payment_status payment_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_item_count integer;
  v_reservation record;
  v_attempt_key text;
  v_fingerprint text;
  v_identity_key text;
  v_existing_order public.orders%ROWTYPE;
BEGIN
  -- Validate input types
  IF jsonb_typeof(p_order) IS DISTINCT FROM 'object'
     OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invalid order or order items.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Invalid order or order items.';
  END IF;

  -- Validate items have product_id and positive quantity
  SELECT count(*) INTO v_item_count
  FROM jsonb_to_recordset(p_items) AS item(
    product_id uuid,
    quantity integer
  )
  WHERE product_id IS NULL OR quantity IS NULL OR quantity <= 0;

  IF v_item_count > 0 THEN
    RAISE EXCEPTION 'Order items must include a product and positive quantity.';
  END IF;

  -- Extract idempotency fields from p_order
  v_attempt_key := p_order ->> 'checkout_attempt_key';
  v_fingerprint := p_order ->> 'checkout_request_fingerprint';

  -- If attempt key provided, check for existing order
  IF v_attempt_key IS NOT NULL THEN
    -- Build identity key: user_id for authenticated, customer_email for guest
    v_identity_key := COALESCE(p_order ->> 'user_id', 'guest:' || lower(p_order ->> 'customer_email'));

    -- Look for existing order with same attempt key and identity
    SELECT * INTO v_existing_order
    FROM public.orders
    WHERE COALESCE(user_id::text, 'guest:' || lower(customer_email)) = v_identity_key
      AND checkout_attempt_key = v_attempt_key
    LIMIT 1;

    IF FOUND THEN
      -- Order exists - verify fingerprint matches
      IF v_existing_order.checkout_request_fingerprint IS DISTINCT FROM v_fingerprint THEN
        RAISE EXCEPTION 'Checkout attempt key reused with different request payload.';
      END IF;

      -- Return existing order - idempotent success
      RETURN QUERY
      SELECT v_existing_order.id, v_existing_order.order_number, v_existing_order.total, v_existing_order.payment_status;
      RETURN;
    END IF;
  END IF;

  -- No existing order - create new one with idempotency fields
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
    notes,
    checkout_attempt_key,
    checkout_request_fingerprint
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
    p_order ->> 'notes',
    v_attempt_key,
    v_fingerprint
  )
  RETURNING * INTO v_order;

  -- Insert order items
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

  -- Insert stock reservations
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

  -- Deduct stock
  FOR v_reservation IN
    SELECT product_id, reserved_quantity
    FROM public.order_stock_reservations
    WHERE order_id = v_order.id
    ORDER BY product_id
  LOOP
    UPDATE public.products AS p
    SET stock = p.stock - v_reservation.reserved_quantity,
        updated_at = now()
    WHERE p.id = v_reservation.product_id
      AND p.stock >= v_reservation.reserved_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'One or more items no longer have enough stock. Please refresh your cart and try again.';
    END IF;
  END LOOP;

  RETURN QUERY
  SELECT v_order.id, v_order.order_number, v_order.total, v_order.payment_status;

EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent request created the order - fetch and return it
    IF v_attempt_key IS NOT NULL THEN
      v_identity_key := COALESCE(p_order ->> 'user_id', 'guest:' || lower(p_order ->> 'customer_email'));
      SELECT * INTO v_existing_order
      FROM public.orders
      WHERE COALESCE(user_id::text, 'guest:' || lower(customer_email)) = v_identity_key
        AND checkout_attempt_key = v_attempt_key
      LIMIT 1;

      IF FOUND THEN
        IF v_existing_order.checkout_request_fingerprint IS DISTINCT FROM v_fingerprint THEN
          RAISE EXCEPTION 'Checkout attempt key reused with different request payload.';
        END IF;
        RETURN QUERY
        SELECT v_existing_order.id, v_existing_order.order_number, v_existing_order.total, v_existing_order.payment_status;
        RETURN;
      END IF;
    END IF;
    -- Should not reach here, but re-raise if it does
    RAISE;
END;
$function$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_order_with_stock_reservations(jsonb, jsonb) TO service_role;
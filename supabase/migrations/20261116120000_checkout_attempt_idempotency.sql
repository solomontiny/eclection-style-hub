-- Checkout idempotency: bind each authenticated client checkout attempt to at
-- most one logical order and bind that attempt key to a canonical server-side
-- request fingerprint. Legacy orders keep checkout_attempt_key/request
-- fingerprint NULL. No existing order/payment/stock data is modified.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS checkout_attempt_key text,
  ADD COLUMN IF NOT EXISTS checkout_request_fingerprint text;

COMMENT ON COLUMN public.orders.checkout_attempt_key IS
  'Client-generated checkout attempt identifier. Reused only when the same logical checkout request is retried after timeout, lost response, or page interruption. NULL for legacy orders.';

COMMENT ON COLUMN public.orders.checkout_request_fingerprint IS
  'Canonical server-generated fingerprint of the logical checkout request bound to checkout_attempt_key. Used to reject reused keys with different payloads. NULL for legacy orders.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_user_checkout_attempt_key
  ON public.orders (user_id, checkout_attempt_key)
  WHERE checkout_attempt_key IS NOT NULL;

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
AS $function$
DECLARE
  v_order public.orders%ROWTYPE;
  v_existing_fingerprint text;
  v_item_count integer;
  v_reservation record;
  v_user_id uuid;
  v_checkout_attempt_key text;
  v_request_fingerprint text;
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

  v_user_id := (p_order ->> 'user_id')::uuid;
  v_checkout_attempt_key := NULLIF(btrim(p_order ->> 'checkout_attempt_key'), '');
  v_request_fingerprint := NULLIF(btrim(p_order ->> 'checkout_request_fingerprint'), '');

  -- The authenticated bank-transfer checkout path must be idempotent and bound
  -- to the same logical request payload. Do not allow this path to create
  -- non-idempotent orders.
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authenticated checkout is required.';
  END IF;

  IF v_checkout_attempt_key IS NULL THEN
    RAISE EXCEPTION 'A checkout attempt key is required. Please refresh and try again.';
  END IF;

  IF v_request_fingerprint IS NULL THEN
    RAISE EXCEPTION 'A checkout request fingerprint is required. Please refresh and try again.';
  END IF;

  -- Idempotent replay: if this authenticated attempt already created an order,
  -- return that order only when it matches the same logical checkout request.
  SELECT existing_order.*, existing_order.checkout_request_fingerprint
  INTO v_order, v_existing_fingerprint
  FROM public.orders AS existing_order
  WHERE existing_order.user_id = v_user_id
    AND existing_order.checkout_attempt_key = v_checkout_attempt_key;

  IF FOUND THEN
    IF v_existing_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
      RAISE EXCEPTION 'This checkout attempt does not match the current order details. Please start a new checkout attempt.';
    END IF;

    RETURN QUERY
    SELECT v_order.id, v_order.order_number, v_order.total, v_order.payment_status;
    RETURN;
  END IF;

  BEGIN
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
      v_user_id,
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
      v_checkout_attempt_key,
      v_request_fingerprint
    )
    RETURNING * INTO v_order;
  EXCEPTION
    WHEN unique_violation THEN
      -- The partial unique index on (user_id, checkout_attempt_key) is the only
      -- uniqueness that can produce a committed row for this attempt key. If a
      -- matching order exists, this is either an idempotent replay (same
      -- fingerprint) or a reused attempt key with a different logical request.
      -- If no matching order exists, the violation came from an unrelated
      -- unique constraint and must be surfaced unchanged; this also avoids
      -- relying on CONSTRAINT_NAME diagnostics, which may vary by environment.
      SELECT existing_order.*, existing_order.checkout_request_fingerprint
      INTO v_order, v_existing_fingerprint
      FROM public.orders AS existing_order
      WHERE existing_order.user_id = v_user_id
        AND existing_order.checkout_attempt_key = v_checkout_attempt_key;

      IF FOUND THEN
        IF v_existing_fingerprint IS DISTINCT FROM v_request_fingerprint THEN
          RAISE EXCEPTION 'This checkout attempt does not match the current order details. Please start a new checkout attempt.';
        END IF;

        RETURN QUERY
        SELECT v_order.id, v_order.order_number, v_order.total, v_order.payment_status;
        RETURN;
      END IF;

      RAISE;
  END;

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
    SELECT reservation.product_id, reservation.reserved_quantity
    FROM public.order_stock_reservations AS reservation
    WHERE reservation.order_id = v_order.id
    ORDER BY reservation.product_id
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
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_with_stock_reservations(jsonb, jsonb)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_stock_reservations(jsonb, jsonb)
TO service_role;

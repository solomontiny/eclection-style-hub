
-- Restrict coupons SELECT to admins only. Validation will be server-side.
DROP POLICY IF EXISTS "Active coupons viewable" ON public.coupons;
CREATE POLICY "Admins view coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Tighten orders INSERT: ensure user_id matches auth.uid() or is null (guest, but only via service role since policy is authenticated)
DROP POLICY IF EXISTS "Anyone can create order" ON public.orders;
CREATE POLICY "Users create own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Tighten order_items INSERT: only for own orders
DROP POLICY IF EXISTS "Create order items" ON public.order_items;
CREATE POLICY "Create items for own orders"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND (o.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
    )
  );

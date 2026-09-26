-- Atomic stock reservation and restoration functions
-- These replace the invalid supabase.raw() calls in stock.ts

-- Atomic stock reservation: only decrements when stock >= qty
-- Returns: 1 if successful, 0 if insufficient stock
CREATE OR REPLACE FUNCTION public.reserve_stock(p_product_id uuid, p_qty int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.products
    SET stock = stock - p_qty,
        updated_at = now()
    WHERE id = p_product_id
      AND stock >= p_qty;

    IF FOUND THEN
        RETURN 1;
    ELSE
        RETURN 0;
    END IF;
END;
$$;

-- Stock restoration: adds qty back to stock
-- Used when order is cancelled/refunded/failed
CREATE OR REPLACE FUNCTION public.restore_stock(p_product_id uuid, p_qty int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.products
    SET stock = stock + p_qty,
        updated_at = now()
    WHERE id = p_product_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.reserve_stock(uuid, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_stock(uuid, int) TO service_role;
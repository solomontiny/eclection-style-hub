-- Fix public access to products
DROP POLICY IF EXISTS "Active products viewable by all" ON public.products;
DROP POLICY IF EXISTS "Admins manage products" ON public.products;

-- Create policy for public access (includes authenticated non-admins)
CREATE POLICY "Active products viewable by all" ON public.products FOR SELECT
  USING (status = 'active');

-- Create policy for admin access
CREATE POLICY "Admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

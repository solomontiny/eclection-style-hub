-- Fix the admin policy which had a typo
DROP POLICY IF EXISTS "Admins can manage all" ON public.bulk_requests;

CREATE POLICY "Admins can manage all"
  ON public.bulk_requests FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Ensure insert policy exists
DROP POLICY IF EXISTS "Anyone can insert" ON public.bulk_requests;

CREATE POLICY "Anyone can insert"
  ON public.bulk_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Add avatar_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create customer-profiles storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-profiles', 'customer-profiles', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for customer-profiles bucket
DROP POLICY IF EXISTS "Customer profiles public read" ON storage.objects;
CREATE POLICY "Customer profiles public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'customer-profiles');

DROP POLICY IF EXISTS "Users upload own profile picture" ON storage.objects;
CREATE POLICY "Users upload own profile picture" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'customer-profiles' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users update own profile picture" ON storage.objects;
CREATE POLICY "Users update own profile picture" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'customer-profiles' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

DROP POLICY IF EXISTS "Users delete own profile picture" ON storage.objects;
CREATE POLICY "Users delete own profile picture" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-profiles' AND
    (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

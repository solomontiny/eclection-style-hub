-- Site media bucket for video, poster, and category images
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-media', 'site-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Site media public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'site-media');

CREATE POLICY "Admins upload site media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update site media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete site media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'));

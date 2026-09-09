-- Insert required categories if they do not exist
INSERT INTO public.categories (name, slug, active)
VALUES
  ('Gowns', 'gowns', true),
  ('Corporate Pant', 'corporate-pant', true),
  ('Tweed Gowns', 'tweed-gowns', true),
  ('Two Piece Corporate Set', 'two-piece-corporate-set', true),
  ('Blazers', 'blazers', true),
  ('Female Tops', 'female-tops', true)
ON CONFLICT (slug) DO NOTHING;

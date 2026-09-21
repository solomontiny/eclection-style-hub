ALTER TABLE public.products ADD COLUMN IF NOT EXISTS colors text[] DEFAULT '{}';

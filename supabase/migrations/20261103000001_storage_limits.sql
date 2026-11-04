-- Storage bucket configuration for bandwidth control and security
-- Apply these settings via Supabase Dashboard > Storage > Buckets > [bucket] > Settings

-- Product images bucket: 2MB max, web-friendly formats only
UPDATE storage.buckets 
SET file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
WHERE id = 'product-images';

-- Site media bucket: 10MB max for videos/images
UPDATE storage.buckets 
SET file_size_limit = 10485760, -- 10 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm']
WHERE id = 'site-media';

-- Customer profiles bucket: 2MB max, images only
UPDATE storage.buckets 
SET file_size_limit = 2097152, -- 2 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'customer-profiles';

-- Verify the updates
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id IN ('product-images', 'site-media', 'customer-profiles');
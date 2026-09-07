
-- Ensure pgcrypto is available for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- The intended administrator, wshittar@yahoo.com, is provisioned explicitly
-- through Supabase Auth after the migration chain succeeds.

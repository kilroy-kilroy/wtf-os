-- Add is_admin flag to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- Set Tim as admin (all known emails)
UPDATE users SET is_admin = true WHERE email IN (
  'tim@timkilroy.com',
  'tk@timkilroy.com',
  'timk@timkilroy.com',
  't@timkilroy.com'
);

-- Create index for middleware lookups
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users (id) WHERE is_admin = true;

-- ─────────────────────────────────────────────
--  FIXED SCHEMA: RUN THIS IN SUPABASE SQL EDITOR
-- ─────────────────────────────────────────────

-- 1. Drop the problematic unique constraint on username
-- This is what causes the 500 error on signup when two users have the same email prefix!
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- 2. Update the trigger to handle usernames safely
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    -- Append a random 4-character string to avoid any duplicate username issues
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(md5(random()::text), 1, 4))
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════
--  COMPLETE FIX — Run this in Supabase SQL Editor
--  Dashboard → SQL Editor → New Query → Paste → Run
-- ═══════════════════════════════════════════════════════════════

-- ── STEP 1: Drop the broken trigger and function ──────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ── STEP 2: Recreate the function with correct columns ────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NULL
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ── STEP 3: Re-attach the trigger ────────────────────────────
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── STEP 4: Fix RLS policies on profiles ─────────────────────
-- Allow authenticated users to insert their own profile
DROP POLICY IF EXISTS "profiles_i" ON profiles;
CREATE POLICY "profiles_i" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow anyone (including trigger / service role) to insert
-- This is needed because the trigger runs as SECURITY DEFINER
DROP POLICY IF EXISTS "profiles_service_i" ON profiles;

-- ── STEP 5: Make sure profiles table has correct columns ──────
-- Add missing columns if they don't exist yet
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- ── STEP 6: Remove unique constraint on username (breaks signup) ──
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- ── STEP 7: Seed channels if empty ───────────────────────────
INSERT INTO channels (name, description)
VALUES
  ('general',       'General discussion'),
  ('engineering',   'Engineering talk'),
  ('random',        'Off-topic fun'),
  ('announcements', 'Team announcements')
ON CONFLICT (name) DO NOTHING;

-- ── STEP 8: Fix RLS so channels are readable without auth ─────
DROP POLICY IF EXISTS "channels_r" ON channels;
CREATE POLICY "channels_r" ON channels
  FOR SELECT USING (true);

-- ── STEP 9: Fix messages RLS ──────────────────────────────────
DROP POLICY IF EXISTS "messages_i" ON messages;
CREATE POLICY "messages_i" ON messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "messages_r" ON messages;
CREATE POLICY "messages_r" ON messages
  FOR SELECT USING (true);

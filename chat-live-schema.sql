-- ═══════════════════════════════════════════════════════════════
-- CKC-OS  ·  Live P2P Chat Schema  (run in Supabase SQL Editor)
-- ═══════════════════════════════════════════════════════════════
-- Run this entire script in:
--   Supabase Dashboard → SQL Editor → New Query → Run

-- ── 1. profiles table (linked to auth.users) ──────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'username',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing auth users
INSERT INTO public.profiles (id, username)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'username',
    au.raw_user_meta_data->>'full_name',
    split_part(au.email, '@', 1),
    'user_' || substr(au.id::text, 1, 8)
  )
FROM auth.users au
WHERE au.id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- ── 2. channels table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.channels (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text UNIQUE NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed default channels
INSERT INTO public.channels (name, description) VALUES
  ('general',     'General discussion'),
  ('engineering', 'Engineering talk'),
  ('random',      'Off-topic fun'),
  ('announcements','Team announcements'),
  ('devops',      'DevOps and deployment'),
  ('errors',      'Bug reports and error tracking')
ON CONFLICT (name) DO NOTHING;

-- ── 3. messages table ─────────────────────────────────────────
-- Drop old messages table if it has wrong schema, recreate cleanly
DO $$
BEGIN
  -- Check if messages has channel_id column; if not, drop and recreate
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='messages' AND column_name='channel_id'
  ) THEN
    DROP TABLE IF EXISTS public.messages CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text NOT NULL CHECK (char_length(content) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_channel_created_idx
  ON public.messages (channel_id, created_at ASC);

-- ── 4. RLS policies ───────────────────────────────────────────

-- profiles: everyone can read, only owner can write
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- channels: everyone can read
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "channels_select" ON public.channels;
CREATE POLICY "channels_select" ON public.channels FOR SELECT USING (true);

-- messages: authenticated users can read all, insert own
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_delete" ON public.messages;
CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "messages_delete" ON public.messages FOR DELETE USING (auth.uid() = user_id);

-- ── 5. Enable Realtime on messages ───────────────────────────
-- (Also go to Supabase → Database → Replication → enable for messages table)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- ── Done ──────────────────────────────────────────────────────
SELECT 'Schema applied successfully' AS status;

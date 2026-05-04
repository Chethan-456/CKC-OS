-- ═══════════════════════════════════════════════════════════════
-- 🚀 CKC-OS REGISTRATION & PROFILE FIX
-- Run this in your Supabase SQL Editor:
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ═══════════════════════════════════════════════════════════════

-- 1. Ensure the profiles table exists and has the correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT,
  avatar_url TEXT,
  cursor_color TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable RLS on profiles if not already enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Drop old unique constraint on username if it exists
-- This prevents the "Database error saving new user" when usernames collide
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- 4. Create safer policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 5. Create the handle_new_user function
-- This function is triggered whenever a new user signs up in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, cursor_color)
  VALUES (
    NEW.id,
    NEW.email,
    -- Handle username collisions by appending a random suffix
    COALESCE(
      NEW.raw_user_meta_data->>'username', 
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ) || '_' || substr(md5(random()::text), 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'cursor_color', '#4FC1FF')
  )
  ON CONFLICT (id) DO UPDATE SET 
    email = EXCLUDED.email,
    username = EXCLUDED.username;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Re-attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Ensure channels exist for the chat app
INSERT INTO public.channels (name, description)
VALUES 
  ('general', 'General discussion'),
  ('engineering', 'Engineering talk'),
  ('random', 'Off-topic fun')
ON CONFLICT (name) DO NOTHING;

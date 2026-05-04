-- Supabase Chat schema for CKC-OS
-- Run this in Supabase SQL editor or via psql against your Supabase database.

-- Enable UUID generation if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User profile table used by the chat app hooks
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  email text,
  avatar_url text,
  full_name text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Channels for chat groups
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Messages per channel
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  reply_to uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_channel_id_idx ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON public.messages(reply_to);

-- Reactions for messages
CREATE TABLE IF NOT EXISTS public.reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS reactions_message_id_idx ON public.reactions(message_id);
CREATE INDEX IF NOT EXISTS reactions_user_id_idx ON public.reactions(user_id);

-- Typing indicator table for realtime presence
CREATE TABLE IF NOT EXISTS public.typing (
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

-- Read receipts / unread counts
CREATE TABLE IF NOT EXISTS public.read_receipts (
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  last_read timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (channel_id, user_id)
);

-- Seed a default channel
INSERT INTO public.channels (name, description)
VALUES ('general', 'General conversation')
ON CONFLICT (name) DO NOTHING;

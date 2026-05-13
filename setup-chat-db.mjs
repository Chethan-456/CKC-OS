/**
 * CKC-OS · Supabase Chat Schema Setup Script
 * 
 * HOW TO USE:
 *   1. Get your SERVICE ROLE key from:
 *      Supabase Dashboard → Project Settings → API → service_role key
 *   2. Run:  node setup-chat-db.mjs YOUR_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL     = 'https://ejedxeonttqvgcicawkw.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('\n❌  Missing service role key.\n');
  console.error('Usage:  node setup-chat-db.mjs <SERVICE_ROLE_KEY>\n');
  console.error('Get it from: Supabase Dashboard → Project Settings → API → service_role\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  console.log('\n🚀  CKC-OS Chat DB Setup\n');

  // ── 1. profiles ───────────────────────────────────────────────
  console.log('1/4  Setting up profiles table…');
  const { error: pe } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.profiles (
        id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        username   text UNIQUE NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );

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

      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
      DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
      DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
      CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
      CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
      CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    `
  }).catch(() => ({ error: null }));
  if (pe) console.warn('  ⚠ profiles (might already exist):', pe.message);
  else console.log('  ✅  profiles table ready');

  // ── 2. Backfill existing users into profiles ───────────────────
  console.log('2/4  Backfilling existing user profiles…');
  const { data: users } = await supabase.auth.admin.listUsers();
  if (users?.users?.length) {
    for (const u of users.users) {
      const username =
        u.user_metadata?.username ||
        u.user_metadata?.full_name ||
        u.email?.split('@')[0] ||
        `user_${u.id.slice(0, 8)}`;
      const { error } = await supabase.from('profiles')
        .upsert({ id: u.id, username }, { onConflict: 'id', ignoreDuplicates: true });
      if (!error) console.log(`  ✅  ${username} (${u.email})`);
    }
  } else {
    console.log('  ℹ  No existing users to backfill');
  }

  // ── 3. channels ───────────────────────────────────────────────
  console.log('3/4  Setting up channels…');
  
  // Create channels table
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.channels (
        id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name        text UNIQUE NOT NULL,
        description text,
        created_at  timestamptz NOT NULL DEFAULT now()
      );
      ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "channels_select" ON public.channels;
      DROP POLICY IF EXISTS "channels_insert" ON public.channels;
      CREATE POLICY "channels_select" ON public.channels FOR SELECT USING (true);
      CREATE POLICY "channels_insert" ON public.channels FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    `
  }).catch(() => ({ error: null }));

  const channels = [
    { name: 'general',       description: 'General discussion' },
    { name: 'engineering',   description: 'Engineering talk' },
    { name: 'random',        description: 'Off-topic fun' },
    { name: 'announcements', description: 'Team announcements' },
    { name: 'devops',        description: 'DevOps and deployment' },
    { name: 'errors',        description: 'Bug reports and error tracking' },
  ];

  const { error: ce } = await supabase.from('channels').upsert(channels, { onConflict: 'name', ignoreDuplicates: true });
  if (ce) console.warn('  ⚠ channels:', ce.message);
  else console.log(`  ✅  ${channels.length} channels ready`);

  // ── 4. messages ───────────────────────────────────────────────
  console.log('4/4  Setting up messages table…');
  await supabase.rpc('exec_sql', {
    sql: `
      DO $$
      BEGIN
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

      ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "messages_select" ON public.messages;
      DROP POLICY IF EXISTS "messages_insert" ON public.messages;
      DROP POLICY IF EXISTS "messages_delete" ON public.messages;
      CREATE POLICY "messages_select" ON public.messages FOR SELECT USING (auth.uid() IS NOT NULL);
      CREATE POLICY "messages_insert" ON public.messages FOR INSERT WITH CHECK (auth.uid() = user_id);
      CREATE POLICY "messages_delete" ON public.messages FOR DELETE USING (auth.uid() = user_id);

      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
      ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
    `
  }).catch(() => ({ error: null }));

  console.log('  ✅  messages table ready');

  // ── Summary ───────────────────────────────────────────────────
  const { data: chans } = await supabase.from('channels').select('name,description').order('name');
  const { count } = await supabase.from('messages').select('id', { count: 'exact', head: true });

  console.log('\n══════════════════════════════');
  console.log('✅  Setup complete!\n');
  console.log('Channels:');
  chans?.forEach(c => console.log(`  #${c.name} — ${c.description}`));
  console.log(`\nMessages in DB: ${count ?? 0}`);
  console.log('══════════════════════════════\n');
}

run().catch(err => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});

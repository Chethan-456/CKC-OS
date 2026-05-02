/**
 * AuthContext.jsx
 * Location: src/context/AuthContext.jsx
 *
 * Auth context for CKC-OS. Wraps Supabase auth and exposes
 * user, profile, session, loading, signIn, signUp, signOut.
 *
 * "profile" is the enriched object that devchat.jsx reads as `me`.
 * It maps Supabase user metadata → the persona shape that the chat UI needs.
 */

import { createContext, useContext, useState, useEffect } from 'react';

// ── Supabase (optional) ──────────────────────────────────────────────────────
// We try to import the shared supabase client. If it doesn't exist yet, we
// fall back to a no-op stub so the chat UI still renders in demo mode.
let supabase;
try {
  supabase = (await import('../lib/supabase.js')).supabase;
} catch {
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signUp: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
    },
  };
}

// ── Default demo profile (used when there is no real auth session) ───────────
const DEMO_PROFILE = {
  id: 'demo-u0',
  name: 'Demo User',
  initials: 'DU',
  color: '#2AABEE',
  bg: 'rgba(42,171,238,0.14)',
  role: 'Guest',
  email: 'demo@ckcos.dev',
};

function buildProfile(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const name = meta.name || meta.username || user.email?.split('@')[0] || 'User';
  const words = name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();

  return {
    id: user.id,
    name,
    initials,
    color: meta.color || '#2AABEE',
    bg: meta.bg || 'rgba(42,171,238,0.14)',
    role: meta.role || 'Member',
    email: user.email,
  };
}

// ── Context ──────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        const u = session?.user ?? null;
        setUser(u);
        // In demo mode (no real user), use the demo profile
        setProfile(u ? buildProfile(u) : DEMO_PROFILE);
        setLoading(false);
      })
      .catch(() => {
        setProfile(DEMO_PROFILE);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const u = session?.user ?? null;
      setUser(u);
      setProfile(u ? buildProfile(u) : DEMO_PROFILE);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password, username) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username, name: username } },
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(DEMO_PROFILE);
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
import { useAuth as useGlobalAuth } from "../pages/auth.jsx";
import { supabase } from "../lib/supabase.js";

/**
 * useAuth Shim
 * Maps the global CKC-OS auth store to the format expected by
 * LoginPage.jsx and SignupPage.jsx (signIn / signUp) as well as
 * the rest of the app (user / logout).
 */
export function useAuth() {
  const { user, loading, logout, loginLocal } = useGlobalAuth();

  /** Sign in with email + password via Supabase */
  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data?.session) {
      // Sync into the global CKC-OS auth store
      const meta = data.user.user_metadata || {};
      const name = meta.full_name || meta.username || email.split("@")[0] || "Developer";
      const color = meta.cursor_color || meta.color || "#4FC1FF";
      loginLocal({
        id: data.user.id,
        email: data.user.email,
        name,
        cursorColor: color,
        bg: color + "22",
        isGuest: false,
      });
    }
    return { data, error };
  };

  /** Register a new account via Supabase */
  const signUp = async (email, password, options) => {
    const { data, error } = await supabase.auth.signUp({ email, password, options });
    if (!error && data?.user) {
      const meta = options?.data || {};
      const name = meta.username || meta.full_name || email.split("@")[0] || "Developer";
      const color = meta.color || "#4FC1FF";
      loginLocal({
        id: data.user.id,
        email: data.user.email,
        name,
        cursorColor: color,
        bg: color + "22",
        isGuest: false,
      });
    }
    return { data, error };
  };

  return {
    user,
    profile: user,
    loading,
    logout,
    signIn,
    signUp,
  };
}

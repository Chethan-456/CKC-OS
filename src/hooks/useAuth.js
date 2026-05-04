import { useAuth as useGlobalAuth } from "../pages/auth.jsx";

/**
 * useAuth Shim
 * Maps the global CKC-OS auth store to the format expected by the DevChat backup.
 */
export function useAuth() {
  const { user, logout } = useGlobalAuth();
  
  return { 
    user, 
    profile: user, 
    loading: false, // AuthProvider initializes from session, so we can assume loading is done
    logout 
  };
}

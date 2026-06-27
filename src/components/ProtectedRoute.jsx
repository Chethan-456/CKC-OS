/**
 * ProtectedRoute.jsx  —  FIXED
 *
 * Previously: redirected straight to "/login", throwing away where the
 * user was trying to go. After login they always landed on "/chat"
 * (or wherever the login page hardcoded), never the module they clicked.
 *
 * Fix: pass { state: { from: location.pathname } } with the redirect so
 * the login / auth page can send the user to the right place after sign-in.
 */

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../pages/auth.jsx";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Still loading — render nothing (App-level spinner handles this)
  if (loading) return null;

  // Not logged in → go to /auth, but remember where they wanted to go
  if (!user) {
    return (
      <Navigate
        to="/auth"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return children;
}
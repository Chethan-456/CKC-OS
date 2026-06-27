import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./pages/auth.jsx";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Login              from "./pages/LoginPage.jsx";
import Dashboard          from "./pages/devchat.jsx";
import Index              from "./pages/index.jsx";
import Ckcossupabase      from "./pages/Ckcossupabase.jsx";
import SupabaseChat       from "./pages/SupabaseChat.jsx";
import SandBox            from "./pages/sandbox.jsx";
import ApiTesting         from "./pages/api.jsx";
import PerformanceMonitor from "./pages/performance.jsx";
import Behavior           from "./pages/behavior.jsx";
import Knowledge          from "./pages/Knowledge.jsx";
import AiMentor           from "./pages/AiMentor.jsx";
import Debug              from "./pages/Debug.jsx";
import Logs               from "./pages/Logs.jsx";
import Cognitive          from "./pages/cognitive.jsx";
import Gitbridge          from "./pages/Gitbridge.jsx";
import AIPair             from "./pages/AIPair.jsx";

// ── /login and /auth: if already logged in, go to editor ─────────────────────
function LoginWithRedirect() {
  const { user } = useAuth();
  const location = useLocation();
  const destination = location.state?.from || "/editor";
  if (user) return <Navigate to={destination} replace />;
  return <Login />;
}
// ─────────────────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
        <span className="loading-screen-text">Loading CKC-OS...</span>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public — no login needed ── */}
      <Route path="/"           element={<Index />} />
      <Route path="/login"      element={<LoginWithRedirect />} />
      <Route path="/auth"       element={<LoginWithRedirect />} />
      <Route path="/chat"       element={<SupabaseChat />} />
      <Route path="/devchat"    element={<Dashboard />} />
      <Route path="/dashboard"  element={<Dashboard />} />
      <Route path="/sandbox"    element={<SandBox />} />
      <Route path="/api"        element={<ApiTesting />} />
      <Route path="/performance"element={<PerformanceMonitor />} />
      <Route path="/behavior"   element={<Behavior />} />
      <Route path="/knowledge"  element={<Knowledge />} />
      <Route path="/aimentor"   element={<AiMentor />} />
      <Route path="/debug"      element={<Debug />} />
      <Route path="/logs"       element={<Logs />} />
      <Route path="/cognitive"  element={<Cognitive />} />
      <Route path="/gitbridge"  element={<Gitbridge />} />
      <Route path="/aipair"     element={<AIPair />} />

      {/* ── Protected — login required only for editor ── */}
      <Route path="/editor" element={
        <ProtectedRoute><Ckcossupabase /></ProtectedRoute>
      } />

      {/* ── 404 ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./pages/auth.jsx";
import ProtectedRoute from "./components/ProtectedRoute";

// ── Pages ─────────────────────────────────────────────────────────────────────
import Login              from "./pages/LoginPage.jsx";
import Signup             from "./pages/SignupPage.jsx";
import Index              from "./pages/index.jsx";
import EditorPage         from "./pages/editor.jsx";
import DevChat            from "./pages/devchat.jsx";
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

// ── Auth-aware login wrapper ──────────────────────────────────────────────────
// If already logged in, skip to the intended destination.
// If not, show Login or Signup — both receive the ?redirect= param intact.
function AuthGate({ mode }) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const destination = params.get("redirect") || "/editor";
  if (user) return <Navigate to={destination} replace />;
  return mode === "signup" ? <Signup /> : <Login />;
}

// ── Protected route that forwards ?redirect back to login ─────────────────────
function GuardedRoute({ children, redirectTo = "/editor" }) {
  const { user, loading } = useAuth();
  if (loading) return null; // wait for session to resolve
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  return children;
}
// ─────────────────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0d0f14", gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid rgba(79,193,255,.1)",
          borderTopColor: "#4FC1FF",
          borderRadius: "50%",
          animation: "spin .7s linear infinite",
        }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color: "#4a5568", fontFamily: "monospace", fontSize: 13 }}>
          Loading CKC-OS…
        </span>
      </div>
    );
  }

  return (
    <Routes>
      {/* ── Public ── */}
      <Route path="/"       element={<Index />} />
      <Route path="/login"  element={<AuthGate />} />
      <Route path="/signup" element={<AuthGate mode="signup" />} />
      <Route path="/auth"   element={<AuthGate />} />

      {/* ── Protected: Live Collaborative Editor ── */}
      <Route path="/editor" element={
        <GuardedRoute redirectTo="/editor">
          <EditorPage />
        </GuardedRoute>
      } />

      {/* ── Protected: DevChat ── */}
      <Route path="/devchat"   element={
        <GuardedRoute redirectTo="/devchat">
          <DevChat />
        </GuardedRoute>
      } />
      <Route path="/dashboard" element={
        <GuardedRoute redirectTo="/devchat">
          <DevChat />
        </GuardedRoute>
      } />

      {/* ── Open module pages ── */}
      <Route path="/chat"        element={<SupabaseChat />} />
      <Route path="/sandbox"     element={<SandBox />} />
      <Route path="/api"         element={<ApiTesting />} />
      <Route path="/performance" element={<PerformanceMonitor />} />
      <Route path="/behavior"    element={<Behavior />} />
      <Route path="/knowledge"   element={<Knowledge />} />
      <Route path="/aimentor"    element={<AiMentor />} />
      <Route path="/debug"       element={<Debug />} />
      <Route path="/logs"        element={<Logs />} />
      <Route path="/cognitive"   element={<Cognitive />} />
      <Route path="/gitbridge"   element={<Gitbridge />} />
      <Route path="/aipair"      element={<AIPair />} />

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
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./pages/auth.jsx";
import ProtectedRoute from "./components/ProtectedRoute";

// ── Pages ─────────────────────────────────────────────────────────────────────
import Login              from "./pages/LoginPage.jsx";
import Signup             from "./pages/SignupPage.jsx";
import Index              from "./pages/index.jsx";
import EditorPage         from "./pages/editor.jsx";        // ← real Yjs collab editor
import DevChat            from "./pages/devchat.jsx";       // ← collaborative dev chat
import SupabaseChat       from "./pages/SupabaseChat.jsx";  // ← legacy chat at /chat
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

// ── Auth-aware login redirect ─────────────────────────────────────────────────
// Sends already-logged-in users to their intended destination.
function LoginWithRedirect({ mode }) {
  const { user } = useAuth();
  const location = useLocation();
  const destination = location.state?.from || "/editor";
  if (user) return <Navigate to={destination} replace />;
  if (mode === "signup") return <Signup />;
  return <Login />;
}
// ─────────────────────────────────────────────────────────────────────────────

function AppRoutes() {
  const { loading } = useAuth();

  // Show a full-screen spinner while the Supabase session is resolving —
  // this prevents ProtectedRoute from incorrectly redirecting to "/" on load.
  if (loading) {
    return (
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        background: "#0d0f14", gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, border: "3px solid rgba(79,193,255,.1)",
          borderTopColor: "#4FC1FF", borderRadius: "50%",
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
      {/* ── Public — accessible without login ── */}
      <Route path="/"           element={<Index />} />
      <Route path="/login"      element={<LoginWithRedirect />} />
      <Route path="/signup"     element={<LoginWithRedirect mode="signup" />} />
      <Route path="/auth"       element={<LoginWithRedirect />} />

      {/* ── Module pages — no auth required ── */}
      <Route path="/chat"       element={<SupabaseChat />} />
      <Route path="/devchat"    element={
        <ProtectedRoute><DevChat /></ProtectedRoute>
      } />
      <Route path="/dashboard"  element={
        <ProtectedRoute><DevChat /></ProtectedRoute>
      } />
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

      {/* ── Protected — login required for the live editor ── */}
      <Route path="/editor" element={
        <ProtectedRoute><EditorPage /></ProtectedRoute>
      } />

      {/* ── 404 fallback ── */}
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
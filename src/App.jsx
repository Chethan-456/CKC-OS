import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Login from "./pages/LoginPage.jsx";
import Dashboard from "./pages/DevChat.jsx";
import Index from "./pages/index.jsx";
import Ckcossupabase from "./pages/Ckcossupabase.jsx";
import SupabaseChat from "./pages/SupabaseChat.jsx";
import SandBox from "./pages/sandbox.jsx";
import ApiTesting from "./pages/api.jsx";
import PerformanceMonitor from "./pages/performance.jsx";
import Behavior from "./pages/behavior.jsx";
import Knowledge from "./pages/Knowledge.jsx";
import AiMentor from "./pages/AiMentor.jsx";
import Auth from "./pages/auth.jsx";
import Debug from "./pages/Debug.jsx";
import Logs from "./pages/Logs.jsx";
import Cognitive from "./pages/cognitive.jsx";
import Gitbridge from "./pages/Gitbridge.jsx";
import AIPair from "./pages/AIPair.jsx";

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen-text">
          Loading ChatFlow...
        </span>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Index />} />

      <Route
        path="/login"
        element={user ? <Navigate to="/chat" replace /> : <Login />}
      />

      <Route
        path="/auth"
        element={user ? <Navigate to="/chat" replace /> : <Auth />}
      />

      {/* Protected */}
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <SupabaseChat />
          </ProtectedRoute>
        }
      />

      <Route
        path="/devchat"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/editor"
        element={
          <ProtectedRoute>
            <Ckcossupabase />
          </ProtectedRoute>
        }
      />

      <Route
        path="/sandbox"
        element={
          <ProtectedRoute>
            <SandBox />
          </ProtectedRoute>
        }
      />

      <Route
        path="/api"
        element={
          <ProtectedRoute>
            <ApiTesting />
          </ProtectedRoute>
        }
      />

      <Route
        path="/performance"
        element={
          <ProtectedRoute>
            <PerformanceMonitor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/behavior"
        element={
          <ProtectedRoute>
            <Behavior />
          </ProtectedRoute>
        }
      />

      <Route
        path="/knowledge"
        element={
          <ProtectedRoute>
            <Knowledge />
          </ProtectedRoute>
        }
      />

      <Route
        path="/aimentor"
        element={
          <ProtectedRoute>
            <AiMentor />
          </ProtectedRoute>
        }
      />

      <Route
        path="/debug"
        element={
          <ProtectedRoute>
            <Debug />
          </ProtectedRoute>
        }
      />

      <Route
        path="/logs"
        element={
          <ProtectedRoute>
            <Logs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/cognitive"
        element={
          <ProtectedRoute>
            <Cognitive />
          </ProtectedRoute>
        }
      />

      <Route
        path="/gitbridge"
        element={
          <ProtectedRoute>
            <Gitbridge />
          </ProtectedRoute>
        }
      />

      <Route
        path="/aipair"
        element={
          <ProtectedRoute>
            <AIPair />
          </ProtectedRoute>
        }
      />

      {/* 404 */}
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
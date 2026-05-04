import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./pages/auth.jsx";

import Index from "./pages/index.jsx";
import EditorPage from "./pages/editor.jsx"; // ✅ Unified Collaborative Editor
import DevChat from "./pages/devchat.jsx";
import SandBox from "./pages/sandbox.jsx";
import ApiTesting from "./pages/api.jsx";
import PerformanceMonitor from "./pages/performance.jsx";
import Behavior from "./pages/behavior.jsx";
import Knowledge from "./pages/Knowledge.jsx";
import AiMentor from "./pages/AiMentor.jsx";
import Debug from "./pages/Debug.jsx";
import Login from "./pages/Login.jsx";
import EditorLogin from "./pages/EditorLogin.jsx";
import { ProtectedRoute } from "./pages/auth.jsx";
import Logs from "./pages/Logs.jsx";
import Cognitive from "./pages/cognitive.jsx";
import Gitbridge from "./pages/Gitbridge.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/editor-login" element={<EditorLogin />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/devchat" element={<ProtectedRoute><DevChat /></ProtectedRoute>} />
          <Route path="/sandbox" element={<ProtectedRoute><SandBox /></ProtectedRoute>} />
          <Route path="/api" element={<ProtectedRoute><ApiTesting /></ProtectedRoute>} />
          <Route path="/performance" element={<ProtectedRoute><PerformanceMonitor /></ProtectedRoute>} />
          <Route path="/behavior" element={<ProtectedRoute><Behavior /></ProtectedRoute>} />
          <Route path="/knowledge" element={<ProtectedRoute><Knowledge /></ProtectedRoute>} />
          <Route path="/aimentor" element={<ProtectedRoute><AiMentor /></ProtectedRoute>} />
          <Route path="/debug" element={<ProtectedRoute><Debug /></ProtectedRoute>} />
          <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
          <Route path="/cognitive" element={<ProtectedRoute><Cognitive /></ProtectedRoute>} />
          <Route path="/gitbridge" element={<ProtectedRoute><Gitbridge /></ProtectedRoute>} />
          <Route path="*" element={<Login />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
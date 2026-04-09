import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './pages/auth.jsx'

import Index                from './pages/index.jsx'
import EditorPage           from './pages/editor.jsx'
import DevChat              from "./pages/devchat.jsx"
import SandBox              from "./pages/sandbox.jsx"
import ApiTesting           from "./pages/api.jsx"
import PerformanceMonitor   from "./pages/performance.jsx"
import Behavior             from "./pages/behavior.jsx"
import KnowledgeGraphEngine from "./pages/KnowledgeGraphEngine"
import AIBot                from "./pages/AIBOT.jsx"
import Auth               from "./pages/auth.jsx"
import Debuggingroom         from "./pages/Debuggingroom.jsx"
import Liveserverlogs        from "./pages/Liveserverlogs.jsx"



function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"                element={<Index />} />
          <Route path="/editor"          element={<EditorPage />} />
          <Route path="/devchat"         element={<DevChat />} />
          <Route path="/sandbox"         element={<SandBox />} />
          <Route path="/api"             element={<ApiTesting />} />
          <Route path="/performance"     element={<PerformanceMonitor />} />
          <Route path="/behavior"        element={<Behavior />} />
          <Route path="/knowledge-graph" element={<KnowledgeGraphEngine />} />
          <Route path="/aibot"           element={<AIBot />} />
          <Route path="/auth"            element={<Auth />} />
          <Route path="/debuggingroom"   element={<Debuggingroom />} />
          <Route path="/liveserverlogs"   element={<Liveserverlogs />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

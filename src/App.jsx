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
import Knowledge from "./pages/Knowledge.jsx"
import AiMentor                from "./pages/AiMentor.jsx"
import Auth               from "./pages/auth.jsx"
import Debug        from "./pages/Debug.jsx"
import Logs        from "./pages/Logs.jsx"
import Cognitive         from "./pages/cognitive.jsx"



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
          <Route path="/knowledge"       element={<Knowledge />} />
          <Route path="/aimentor"           element={<AiMentor />} />
          <Route path="/auth"            element={<Auth />} />
          <Route path="/debug"   element={<Debug />} />
          <Route path="/logs"   element={<Logs />} />
         
          <Route path="/cognitive"      element={<Cognitive />} />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App

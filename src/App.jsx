import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Index from './pages/index.jsx'
import EditorPage from './pages/editor.jsx'
import DevChat from "./pages/devchat.jsx";
import ApiTesting from "./pages/api.jsx";
import PerformanceMonitor from "./pages/performance.jsx";  // ← fixed path

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/devchat" element={<DevChat />} />
        <Route path="/api" element={<ApiTesting />} />
        <Route path="/performance" element={<PerformanceMonitor />} />  {/* ← added */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
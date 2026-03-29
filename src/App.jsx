import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Index from './pages/index.jsx'
import EditorPage from './pages/editor.jsx'
import DevChat from "./pages/devchat.jsx"
import SandBox from "./pages/sandbox.jsx";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/devchat" element={<DevChat />} />
        <Route path="/sandbox" element={<SandBox />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
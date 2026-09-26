import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Chat from './pages/Chat'
import History from './pages/History'
import Trace from './pages/Trace'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/history" element={<History />} />
        <Route path="/trace/:threadId/:messageIndex" element={<Trace />} />
      </Routes>
    </BrowserRouter>
  )
}
import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { KeyRound } from 'lucide-react'

export default function Header() {
  const location = useLocation()
  const isChat = location.pathname === '/chat'
  const isHistory = location.pathname === '/history'
  const [showKeyModal, setShowKeyModal] = useState(false)

  return (
    <div className="flex items-center justify-between mb-10 py-3">
      <Link to="/" className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
          <span className="text-cream text-xl font-semibold">R</span>
        </div>
        <span className="text-2xl font-semibold text-ink">RIE</span>
      </Link>

      <div className="flex gap-9 text-lg">
        <Link
          to="/chat"
          className={isChat ? 'text-accent font-semibold border-b-2 border-accent pb-2' : 'text-muted'}
        >
          Search
        </Link>
        <Link
          to="/history"
          className={isHistory ? 'text-accent font-semibold border-b-2 border-accent pb-2' : 'text-muted'}
        >
          History
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowKeyModal(true)}
          title="Use your own Gemini API key"
          className="w-10 h-10 rounded-full border border-border-muted flex items-center justify-center text-muted hover:text-accent hover:border-accent transition"
        >
          <KeyRound size={18} />
        </button>
        <div className="w-12 h-12 rounded-full bg-accent-bg flex items-center justify-center text-lg font-semibold text-accent">
          A
        </div>
      </div>

      {showKeyModal && <ApiKeyModal onClose={() => setShowKeyModal(false)} />}
    </div>
  )
}

function ApiKeyModal({ onClose }) {
  const [key, setKey] = useState(localStorage.getItem('gemini_api_key') || '')

  function save() {
    if (key.trim()) {
      localStorage.setItem('gemini_api_key', key.trim())
      localStorage.setItem('gemini_api_key_saved_at', Date.now().toString())
    } else {
      localStorage.removeItem('gemini_api_key')
      localStorage.removeItem('gemini_api_key_saved_at')
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold text-ink mb-1.5">Use your own Gemini key</div>
        <div className="text-sm text-muted mb-4">
          Add your Gemini API key to ask questions — get one free at aistudio.google.com/apikey.
        </div>
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="AIza..."
          className="w-full border border-border-muted rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 text-sm font-semibold text-muted py-2.5">
            Cancel
          </button>
          <button onClick={save} className="flex-1 text-sm font-semibold text-cream bg-accent py-2.5 rounded-lg">
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
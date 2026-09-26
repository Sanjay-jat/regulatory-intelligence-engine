import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useNavigate, Link, useLocation } from 'react-router-dom'
import { sendQuery, getThread, listThreads, deleteThread } from '../lib/api'
import { Search, GitCompare, Plus, Trash2, PanelLeftClose, PanelLeftOpen, KeyRound } from 'lucide-react'

const EXAMPLE_QUERIES = [
  'Modified nomination norms for demat accounts',
  'AIF band karne ke liye kya guidelines hain?',
  'MPS requirement relaxation for listed companies',
  'Commercial banks ke liye naya KYC circular kya bola gaya hai?',
]
const DATE_PRESETS = {
  'All time': null,
  'Last month': 30,
  'Last 6 months': 182,
  'Last year': 365,
}
function presetToDateFrom(days) {
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().split('T')[0]
}
function getStoredGeminiKey() {
  const key = localStorage.getItem('gemini_api_key')
  const savedAt = localStorage.getItem('gemini_api_key_saved_at')
  if (!key || !savedAt) return null
  const ONE_DAY_MS = 24 * 60 * 60 * 1000
  if (Date.now() - Number(savedAt) > ONE_DAY_MS) {
    localStorage.removeItem('gemini_api_key')
    localStorage.removeItem('gemini_api_key_saved_at')
    return null
  }
  return key
}

export default function Chat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [filterBody, setFilterBody] = useState(null)
  const [datePreset, setDatePreset] = useState('All time')
  const [threadId, setThreadId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sidebarThreads, setSidebarThreads] = useState([])
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showKeyModal, setShowKeyModal] = useState(false)
  const bottomRef = useRef(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const urlThreadId = searchParams.get('thread')
  const [initialLoading, setInitialLoading] = useState(!!urlThreadId)

  function refreshSidebar() {
    listThreads().then(setSidebarThreads).catch(() => {})
  }

  useEffect(() => {
    refreshSidebar()
  }, [])

  useEffect(() => {
    if (!urlThreadId) return

    getThread(urlThreadId)
      .then((history) => {
        const loaded = []
        history.forEach((msg, idx) => {
          loaded.push({ role: 'user', text: msg.query })
          loaded.push({
            role: 'agent',
            text: msg.answer,
            citations: msg.citations,
            amendmentDiff: msg.amendment_diff,
            messageIndex: idx,
          })
        })
        setMessages(loaded)
        setThreadId(urlThreadId)
      })
      .catch(() => {
        setMessages([
          { role: 'agent', text: 'Could not load this conversation.', error: true },
        ])
      })
      .finally(() => setInitialLoading(false))
  }, [urlThreadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(text) {
    const query = (text ?? input).trim()
    if (!query || loading) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: query }])
    setLoading(true)

    try {
      const dateFrom = presetToDateFrom(DATE_PRESETS[datePreset])
      const userGeminiKey = getStoredGeminiKey()
      const result = await sendQuery(query, threadId, filterBody, dateFrom, null, userGeminiKey)
      setThreadId(result.thread_id)

      const messageIndex = messages.filter((m) => m.role === 'agent').length
      const fullText = result.answer

      setMessages((prev) => [
        ...prev,
        {
          role: 'agent',
          text: '',
          citations: result.citations,
          amendmentDiff: result.amendment_diff,
          messageIndex,
        },
      ])
      setLoading(false)

      let i = 0
      const CHARS_PER_TICK = 3
      const interval = setInterval(() => {
        i += CHARS_PER_TICK
        setMessages((prev) =>
          prev.map((m, idx) =>
            idx === prev.length - 1 ? { ...m, text: fullText.slice(0, i) } : m
          )
        )
        if (i >= fullText.length) clearInterval(interval)
      }, 15)

      refreshSidebar()
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'agent', text: 'Something went wrong reaching the backend. Please try again.', error: true },
      ])
      setLoading(false)
    }
  }

  function newChat() {
    setMessages([])
    setThreadId(null)
    setInput('')
    navigate('/chat')
  }

  function openThread(id) {
    navigate(`/chat?thread=${id}`)
  }

  async function handleSidebarDelete(e, id) {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    await deleteThread(id)
    setSidebarThreads((prev) => prev.filter((t) => t.thread_id !== id))
    if (id === threadId) newChat()
  }

  const filteredSidebar = sidebarThreads.filter((t) =>
    (t.first_query || '').toLowerCase().includes(sidebarSearch.toLowerCase())
  )

  const hasMessages = messages.length > 0
  if (initialLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-sm text-muted">Loading conversation...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex">
      <aside
        className={`shrink-0 border-r border-border-soft flex flex-col transition-all duration-200 ${
          sidebarOpen ? 'w-64' : 'w-14'
        }`}
      >
        <div className="flex items-center justify-between px-3 py-4">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <span className="text-cream text-sm font-semibold">R</span>
              </div>
              <span className="text-base font-semibold text-ink">RIE</span>
            </Link>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-muted hover:text-accent transition shrink-0"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={newChat}
            className={`flex items-center gap-2 text-sm font-semibold text-cream bg-accent rounded-lg mb-3 hover:opacity-90 transition ${
              sidebarOpen ? 'w-full px-4 py-2.5 justify-start' : 'w-8 h-8 justify-center'
            }`}
          >
            <Plus size={15} />
            {sidebarOpen && 'New Chat'}
          </button>
        </div>

        {sidebarOpen && (
          <>
            <div className="px-3 mb-3">
              <div className="flex items-center gap-2 bg-white border border-border-soft rounded-lg px-3 py-2">
                <Search size={14} className="text-muted shrink-0" />
                <input
                  value={sidebarSearch}
                  onChange={(e) => setSidebarSearch(e.target.value)}
                  placeholder="Search chats"
                  className="text-sm outline-none bg-transparent w-full"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 space-y-1">
              {filteredSidebar.map((t) => (
                <div
                  key={t.thread_id}
                  onClick={() => openThread(t.thread_id)}
                  className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg cursor-pointer text-sm truncate ${
                    t.thread_id === threadId ? 'bg-accent-bg text-accent font-semibold' : 'text-muted hover:bg-cream-card'
                  }`}
                >
                  <span className="truncate">{t.first_query}</span>
                  <button
                    onClick={(e) => handleSidebarDelete(e, t.thread_id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-light hover:text-danger transition"
                    title="Delete conversation"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-border-soft px-3 py-3 flex items-center justify-between">
              <Link
                to="/history"
                className={`text-xs font-semibold ${location.pathname === '/history' ? 'text-accent' : 'text-muted'} hover:text-accent transition`}
              >
                Full History
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowKeyModal(true)}
                  title="Use your own Gemini API key"
                  className="w-8 h-8 rounded-full border border-border-muted flex items-center justify-center text-muted hover:text-accent hover:border-accent transition"
                >
                  <KeyRound size={15} />
                </button>
                <div className="w-8 h-8 rounded-full bg-accent-bg flex items-center justify-center text-sm font-semibold text-accent">
                  A
                </div>
              </div>
            </div>
          </>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className={`flex-1 flex flex-col ${hasMessages ? 'justify-end' : 'justify-center'} max-w-2xl mx-auto w-full px-6`}>
          {!hasMessages && (
            <div className="text-center mb-8">
              <div className="text-3xl font-semibold mb-2.5 text-ink">Ask about SEBI or RBI regulation</div>
              <div className="text-base text-muted">English or Hinglish — answers grounded in official circulars only</div>
            </div>
          )}

          <div className="space-y-5 mb-4 overflow-y-auto">
            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <div className="bg-accent text-cream text-sm rounded-2xl rounded-br-sm px-4 py-2.5 max-w-md">
                    {m.text}
                  </div>
                </div>
              ) : (
                <AgentMessage key={i} message={m} threadId={threadId} navigate={navigate} />
              )
            )}
            {loading && (
              <div className="text-sm text-muted flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                Thinking...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="bg-white border border-border-soft rounded-xl px-4 py-3 flex items-center gap-2.5 mb-3 shadow-sm">
            <Search size={18} className="text-accent shrink-0" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about KYC, position limits, penalties..."
              className="flex-1 text-sm outline-none bg-transparent"
            />
            <button
              onClick={() => handleSend()}
              disabled={loading}
              className="text-xs font-semibold text-cream bg-accent px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Ask
            </button>
          </div>

          <div className="flex justify-center gap-2 mb-4">
            {['All', 'SEBI', 'RBI'].map((f) => {
              const value = f === 'All' ? null : f
              const active = filterBody === value
              return (
                <button
                  key={f}
                  onClick={() => setFilterBody(value)}
                  className={`text-xs font-semibold px-3.5 py-2 rounded-lg ${
                    active ? 'bg-accent text-cream' : 'border border-border-muted text-muted'
                  }`}
                >
                  {f}
                </button>
              )
            })}
          </div>
          <div className="flex justify-center gap-2 mb-4 flex-wrap">
            {Object.keys(DATE_PRESETS).map((label) => (
              <button
                key={label}
                onClick={() => setDatePreset(label)}
                className={`text-xs font-semibold px-3.5 py-2 rounded-lg ${
                  datePreset === label ? 'bg-accent text-cream' : 'border border-border-muted text-muted'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {!hasMessages && (
            <div className="flex justify-center gap-2 flex-wrap pb-10">
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="text-xs px-3.5 py-2 rounded-lg border border-border-muted text-muted hover:border-accent hover:text-accent transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
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

function AgentMessage({ message, threadId, navigate }) {
  if (message.error) {
    return <div className="text-sm text-danger">{message.text}</div>
  }

  const topCitation = message.citations?.[0]

  return (
    <div>
      <div className="text-[15px] leading-relaxed mb-2.5 whitespace-pre-line">{message.text}</div>

      {message.amendmentDiff && (
        <div className="grid grid-cols-2 gap-2 mb-2.5">
          <div className="bg-danger-bg border border-[#E8CFCF] rounded-lg p-3">
            <div className="text-[10px] font-semibold text-danger uppercase tracking-wide mb-1.5">
              Superseded — {message.amendmentDiff.old_circular_id}
            </div>
            <div className="text-xs leading-relaxed">{message.amendmentDiff.old_text}</div>
          </div>
          <div className="bg-accent-bg border border-[#D3E0C6] rounded-lg p-3">
            <div className="text-[10px] font-semibold text-accent uppercase tracking-wide mb-1.5">
              Active — {message.amendmentDiff.new_circular_id}
            </div>
            <div className="text-xs leading-relaxed">{message.amendmentDiff.new_text}</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        {topCitation && (
          <span className="text-[11px] font-semibold bg-accent-bg text-accent px-2.5 py-1 rounded-md">
            {topCitation.circular_id} · {Math.round(topCitation.confidence_score * 100)}%
          </span>
        )}
        <button
          onClick={() => navigate(`/trace/${threadId}/${message.messageIndex}`)}
          className="text-xs font-semibold text-accent flex items-center gap-1.5"
        >
          <GitCompare size={13} />
          How this was generated
        </button>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MessageSquare, ChevronRight, Trash2 } from 'lucide-react'
import Header from '../components/Header'
import { listThreads, deleteThread } from '../lib/api'

export default function History() {
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    listThreads()
      .then(setThreads)
      .catch(() => setThreads([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = threads.filter((t) =>
    (t.first_query || '').toLowerCase().includes(search.toLowerCase())
  )

  const grouped = groupByDate(filtered)

  async function handleDelete(e, threadId) {
    e.stopPropagation()
    if (!confirm('Delete this conversation?')) return
    await deleteThread(threadId)
    setThreads((prev) => prev.filter((t) => t.thread_id !== threadId))
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-6 py-6">
        <Header />

        <div className="flex items-center justify-between mb-6">
          <div className="text-2xl font-semibold text-ink">Query history</div>
          <div className="flex items-center gap-2 bg-white border border-border-soft rounded-lg px-3.5 py-2.5">
            <Search size={15} className="text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search history"
              className="text-sm outline-none bg-transparent w-40"
            />
          </div>
        </div>

        {loading && (
          <div className="text-sm text-muted text-center py-20">Loading...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-accent-bg flex items-center justify-center text-accent mx-auto mb-4">
              <MessageSquare size={24} />
            </div>
            <div className="text-base font-semibold text-ink mb-1.5">
              {search ? 'No matches found' : 'No conversations yet'}
            </div>
            <div className="text-sm text-muted mb-5">
              {search ? 'Try a different search term' : 'Start one from the Search page'}
            </div>
            {!search && (
              <button
                onClick={() => navigate('/chat')}
                className="text-sm font-semibold text-cream bg-accent px-5 py-2.5 rounded-xl hover:opacity-90 transition"
              >
                Ask a question
              </button>
            )}
          </div>
        )}

        {Object.entries(grouped).map(([label, items]) => (
          <div key={label} className="mb-7">
            <div className="text-xs font-semibold text-muted-light uppercase tracking-wide mb-3">
              {label}
            </div>
            <div className="space-y-2.5">
              {items.map((t) => (
                <div
                  key={t.thread_id}
                  onClick={() => navigate(`/chat?thread=${t.thread_id}`)}
                  className="w-full text-left bg-white border border-border-soft rounded-xl px-5 py-4 flex items-start justify-between gap-4 hover:border-accent transition group cursor-pointer"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold mb-1.5 truncate text-ink">{t.first_query}</div>
                    <div className="text-xs text-muted line-clamp-1 leading-relaxed">{t.last_answer}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-[11px] text-muted-light whitespace-nowrap">
                      {formatTime(t.updated_at)}
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, t.thread_id)}
                      className="text-muted-light hover:text-danger opacity-0 group-hover:opacity-100 transition"
                      title="Delete conversation"
                    >
                      <Trash2 size={15} />
                    </button>
                    <ChevronRight size={15} className="text-muted-light group-hover:text-accent transition" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function groupByDate(threads) {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const groups = {}

  for (const t of threads) {
    const d = new Date(t.updated_at).toDateString()
    const label = d === today ? 'Today' : d === yesterday ? 'Yesterday' : d
    if (!groups[label]) groups[label] = []
    groups[label].push(t)
  }
  return groups
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
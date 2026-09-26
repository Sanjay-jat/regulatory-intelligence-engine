import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import Header from '../components/Header'
import { getThread } from '../lib/api'

const NODE_LABELS = [
  { match: 'Node 1', label: 'Route intent' },
  { match: 'Node 2', label: 'Search index' },
  { match: 'Node 3', label: 'Resolve conflict' },
  { match: 'Node 4', label: 'Synthesize answer' },
  { match: 'Node 5', label: 'Aggregate output' },
]

export default function Trace() {
  const { threadId, messageIndex } = useParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    getThread(threadId)
      .then((history) => {
        const msg = history[Number(messageIndex)]
        if (!msg) throw new Error('not found')
        setMessage(msg)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [threadId, messageIndex])

  return (
    <div className="min-h-screen bg-cream">
      <div className="max-w-2xl mx-auto px-6 py-6">
        <Header />

        <button
          onClick={() => navigate(`/chat?thread=${threadId}`)}
          className="flex items-center gap-1.5 text-xs text-muted mb-1 hover:text-accent transition"
        >
          <ArrowLeft size={13} />
          Back to answer
        </button>

        {loading && <div className="text-sm text-muted py-16 text-center">Loading trace...</div>}

        {error && (
          <div className="text-sm text-danger py-16 text-center">Could not load this trace.</div>
        )}

        {message && (
          <>
            <div className="text-lg font-semibold text-ink mb-1 mt-3">How this answer was generated</div>
            <div className="text-sm text-muted mb-6">"{message.query}"</div>

            <div className="bg-white border border-border-soft rounded-xl p-4 mb-4">
              <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2.5">
                Execution path
              </div>
              <div className="space-y-3">
                {(message.execution_step_logs || []).map((log, i) => (
                  <StepRow key={i} log={log} />
                ))}
              </div>
            </div>

            {message.amendment_diff && (
              <div className="bg-white border border-border-soft rounded-xl p-4 mb-4">
                <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  Conflict resolved
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-danger-bg border border-[#E8CFCF] rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-danger uppercase tracking-wide mb-1.5">
                      Superseded — {message.amendment_diff.old_circular_id}
                    </div>
                    <div className="text-xs leading-relaxed">{message.amendment_diff.old_text}</div>
                  </div>
                  <div className="bg-accent-bg border border-[#D3E0C6] rounded-lg p-3">
                    <div className="text-[10px] font-semibold text-accent uppercase tracking-wide mb-1.5">
                      Active — {message.amendment_diff.new_circular_id}
                    </div>
                    <div className="text-xs leading-relaxed">{message.amendment_diff.new_text}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white border border-border-soft rounded-xl p-4">
              <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                Sources used
              </div>
              <div className="space-y-2">
                {(message.citations || []).map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-3 py-2.5 bg-cream rounded-lg"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{c.circular_id}</div>
                      <div className="text-[11px] text-muted truncate">{c.title}</div>
                    </div>
                    <span className="text-[11px] font-semibold text-accent shrink-0 ml-3">
                      {Math.round(c.confidence_score * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StepRow({ log }) {
  const isError = log.includes('ERROR')
  const nodeInfo = NODE_LABELS.find((n) => log.startsWith(n.match))
  const label = nodeInfo ? nodeInfo.label : log.split(':')[0]
  const detail = log.includes(':') ? log.split(':').slice(1).join(':').trim() : log

  return (
    <div className="flex items-start gap-2.5">
      {isError ? (
        <AlertCircle size={15} className="text-danger shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 size={15} className="text-accent shrink-0 mt-0.5" />
      )}
      <div className="min-w-0">
        <div className="text-xs font-semibold text-ink">{label}</div>
        <div className="text-xs text-muted leading-relaxed">{detail}</div>
      </div>
    </div>
  )
}
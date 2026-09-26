import { Link } from 'react-router-dom'
import { GitCompare, Route, Languages, Search, GitBranch, ShieldCheck, FileText } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-cream relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, #1E241F 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative">
        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <nav className="flex items-center justify-between py-5 border-b border-border-soft mb-14">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <span className="text-cream text-sm font-semibold">R</span>
              </div>
              <span className="text-sm font-semibold text-ink">Regulatory Intelligence Engine</span>
            </div>
            <div className="hidden md:flex gap-8 text-xs font-semibold text-muted">
              <a href="#ask" className="hover:text-accent transition">Ask</a>
              <a href="#how" className="hover:text-accent transition">How it works</a>
              <a href="#coverage" className="hover:text-accent transition">Coverage</a>
              <a href="#stack" className="hover:text-accent transition">Stack</a>
            </div>
          </nav>

          <div id="ask" className="grid lg:grid-cols-2 gap-12 items-start mb-16">
            <div>
              <div className="text-xs font-semibold text-muted-light uppercase tracking-wide mb-3">
                Independent research tool
              </div>
              <h1 className="text-4xl font-semibold leading-[1.2] mb-4 text-ink tracking-tight">
                Ask a SEBI or RBI rule in plain words. Get the rule, the source, and what changed.
              </h1>
              <p className="text-base text-muted leading-relaxed mb-6 max-w-md">
                Built to read the circulars so you do not have to. It shows the current rule,
                the last amendment, and the part that actually affects you.
              </p>

              <Link
                to="/chat"
                className="inline-flex items-center gap-2 text-sm font-semibold text-cream bg-accent px-6 py-3 rounded-xl hover:opacity-90 transition mb-4"
              >
                Try a live query →
              </Link>

              <div className="bg-[#FAEEDA] border border-[#E8C77A] rounded-xl px-4 py-3 mb-6 max-w-md">
                <p className="text-sm font-semibold text-[#633806] mb-1">You'll need your own Gemini API key</p>
                <p className="text-xs text-[#633806] leading-relaxed">
                  This runs on your own free key, not a shared one. Add it from the key icon
                  inside chat before asking a question. It only takes a minute and Google's
                  free tier covers plenty of queries.
                </p>
              </div>

              <div className="flex gap-5 text-xs font-semibold text-muted-light">
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Central</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#BA7517]" />Amended</span>
                <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Hinglish</span>
              </div>
            </div>

            <PreviewCard />
          </div>
        </div>

        <div className="bg-cream-card border-y border-border-soft mb-16">
          <div className="max-w-6xl mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-10 py-14">
            <div>
              <div className="text-xs font-semibold text-muted-light uppercase tracking-wide mb-3">The problem</div>
              <p className="text-base text-ink leading-relaxed">
                When SEBI or RBI updates a rule, the old circular usually stays online right
                next to the new one. Nothing on the page tells you which is current. Someone
                relying on the wrong version might not find out until it costs them.
              </p>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-light uppercase tracking-wide mb-3">What it does about it</div>
              <p className="text-base text-ink leading-relaxed">
                This reads every circular as it comes in, keeps track of which rules replace
                older ones, and answers your questions directly, whether you ask in English
                or Hinglish.
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 lg:px-10">
          <div id="how" className="mb-16">
            <div className="text-xs font-semibold text-muted-light uppercase tracking-wide mb-3">How it works</div>
            <h2 className="text-2xl font-semibold text-ink mb-8">Five steps, every time you ask</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <StepCard icon={<Search size={17} />} step="01" title="Understands your question" desc="Turns a casual question, in English or Hinglish, into something it can search for." />
              <StepCard icon={<FileText size={17} />} step="02" title="Searches the circulars" desc="Pulls the relevant sections from real, ingested SEBI and RBI documents." />
              <StepCard icon={<GitBranch size={17} />} step="03" title="Checks for conflicts" desc="If a rule was replaced, lines up the old and new versions before answering." />
              <StepCard icon={<ShieldCheck size={17} />} step="04" title="Writes a grounded answer" desc="Only uses what's actually in the retrieved text, nothing outside it." />
              <StepCard icon={<GitCompare size={17} />} step="05" title="Shows its work" desc="Every step, every source, every confidence score stays visible." />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-5 mb-16">
            <FeatureCard icon={<GitCompare size={19} />} title="Amendment aware" desc="Never surfaces a superseded rule as current. Old and new versions are compared explicitly." />
            <FeatureCard icon={<Route size={19} />} title="Fully traceable" desc="Every node, every retrieved source, every confidence score is visible, not hidden." />
            <FeatureCard icon={<Languages size={19} />} title="Hinglish ready" desc="Ask casually in English or Hinglish. Answers stay grounded and formal." />
          </div>

          <div id="coverage" className="bg-cream-card border border-border-soft rounded-2xl px-7 py-6 mb-16">
            <div className="text-xs font-semibold text-muted-light uppercase tracking-wide mb-2">What's inside right now</div>
            <p className="text-sm text-muted leading-relaxed max-w-2xl">
              It's currently reading around 45 recent circulars from SEBI and RBI, mostly from
              the past year. That's enough to see amendment tracking, citations, and Hinglish
              queries working end to end. It isn't the full historical archive yet.
            </p>
          </div>

          <div id="stack" className="bg-dark rounded-2xl px-7 py-6 mb-16">
            <div className="text-xs font-semibold tracking-wide text-muted-light uppercase mb-3">
              Under the hood
            </div>
            <div className="flex gap-2.5 flex-wrap">
              {['FastAPI', 'LangGraph', 'FAISS', 'Gemini', 'React', 'LangSmith', 'PostgreSQL'].map((tech) => (
                <span key={tech} className="text-xs px-3.5 py-2 rounded-lg bg-dark-card text-border-muted">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-border-soft pt-8 pb-10">
            <p className="text-sm text-muted max-w-lg">
              Built by Sanjay, to see how far an agentic RAG system could go in resolving real
              conflicts between regulatory documents instead of just retrieving text.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StepCard({ icon, step, title, desc }) {
  return (
    <div>
      <div className="w-8 h-8 rounded-lg bg-accent-bg flex items-center justify-center text-accent mb-2.5">
        {icon}
      </div>
      <div className="text-[11px] font-semibold text-muted-light mb-1">{step}</div>
      <div className="text-sm font-semibold mb-1 text-ink">{title}</div>
      <div className="text-xs text-muted leading-relaxed">{desc}</div>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div className="bg-cream-card border border-border-soft rounded-xl p-5">
      <div className="w-8 h-8 rounded-lg bg-accent-bg flex items-center justify-center text-accent mb-2.5">
        {icon}
      </div>
      <div className="text-sm font-semibold mb-1.5 text-ink">{title}</div>
      <div className="text-xs text-muted leading-relaxed">{desc}</div>
    </div>
  )
}

function PreviewCard() {
  return (
    <div className="bg-white border border-border-soft rounded-2xl shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-soft bg-cream-card">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wide">Live query</span>
        <span className="text-[10px] font-semibold text-accent">● ready</span>
      </div>

      <div className="p-4">
        <div className="bg-accent text-cream text-xs rounded-xl rounded-bl-sm px-3.5 py-2.5 mb-3 inline-block">
          AIF band karne ke liye kya guidelines hain?
        </div>

        <div className="bg-cream-card rounded-xl px-3.5 py-3 text-xs leading-relaxed text-ink mb-3">
          Once liabilities are satisfied, the scheme is wound up. Assets are liquidated
          within the liquidation period and proceeds are distributed to investors after
          satisfying all liabilities.
        </div>

        <div className="flex gap-2 flex-wrap mb-3">
          <span className="text-[10px] font-semibold bg-accent-bg text-accent px-2.5 py-1 rounded-md">Source cited</span>
          <span className="text-[10px] font-semibold bg-[#FAEEDA] text-[#633806] px-2.5 py-1 rounded-md">Amendment tracked</span>
        </div>

        <div className="pt-3 border-t border-border-soft text-[11px] font-semibold text-muted flex items-center justify-between">
          <span>HO/19/34/11(2)2026-AFD-POD1</span>
          <span className="text-accent">60% confidence</span>
        </div>
      </div>
    </div>
  )
}
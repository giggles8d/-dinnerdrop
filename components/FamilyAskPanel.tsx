'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, HelpCircle, ShoppingBag } from 'lucide-react'

interface Ask { kind: 'question' | 'takeout'; question: string; place?: string; at: string; live: boolean; done?: boolean; asked: Array<{ id: string; name: string }>; answers: Record<string, { name: string; text: string; at: string }> }

/** Ask the whole family something ("tacos tonight?") or collect takeout orders; answers show up here and by text. */
export default function FamilyAskPanel() {
  const [mode, setMode] = useState<'question' | 'takeout'>('question')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [ask, setAsk] = useState<Ask | null>(null)

  const load = useCallback(async () => {
    try { const d = await (await fetch('/api/texting/ask', { cache: 'no-store' })).json(); setAsk(d.ask) } catch { /* ignore */ }
  }, [])
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t) }, [load])

  async function go() {
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/texting/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: mode, text }) })
      const d = await r.json()
      setMsg(r.ok ? `Sent to ${d.sent} ${d.sent === 1 ? 'person' : 'people'}. Answers show up below and come to you by text.` : (d.error || 'Something went wrong.'))
      if (r.ok) { setText(''); await load() }
    } finally { setBusy(false) }
  }

  return (
    <section className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex gap-2 mb-3">
        <button onClick={() => setMode('question')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${mode === 'question' ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background'}`}><HelpCircle className="w-3.5 h-3.5" />Ask the family</button>
        <button onClick={() => setMode('takeout')} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${mode === 'takeout' ? 'bg-primary text-primary-foreground border-primary' : 'border-border bg-background'}`}><ShoppingBag className="w-3.5 h-3.5" />Takeout orders</button>
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={300} onKeyDown={(e) => { if (e.key === 'Enter' && (mode === 'takeout' || text.trim())) go() }}
          placeholder={mode === 'question' ? 'Tacos tonight?' : 'Where from? (optional, e.g. Wingstop)'} className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={go} disabled={busy || (mode === 'question' && !text.trim())} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}{mode === 'question' ? 'Ask' : 'Collect orders'}
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{mode === 'question' ? 'Everyone gets a text and replies YES, NO or what they\'d rather have.' : 'Everyone texts back what they want. You get one combined list with links to order.'} You can also text the bot: &quot;ask everyone: tacos tonight?&quot; or &quot;takeout from Wingstop&quot;.</p>
      {msg && <p className="mt-2 text-sm text-foreground">{msg}</p>}
      {ask && (
        <div className="mt-3 rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold text-foreground">{ask.kind === 'takeout' ? `Takeout orders${ask.place ? ` from ${ask.place}` : ''}` : `"${ask.question}"`}<span className="ml-2 text-xs font-normal text-muted-foreground">{ask.live ? 'collecting answers…' : 'done'}</span></p>
          <ul className="mt-1.5 space-y-0.5 text-sm">
            {ask.asked.map((p) => <li key={p.id}><b>{p.name}:</b> {ask.answers[p.id]?.text ?? <span className="text-muted-foreground">no answer yet</span>}</li>)}
          </ul>
        </div>
      )}
    </section>
  )
}

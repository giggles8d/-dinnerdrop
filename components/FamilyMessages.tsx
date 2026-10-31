'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageCircle, Send } from 'lucide-react'

interface Msg { id: string; who: string; mine: boolean; bot: boolean; body: string; at: string }

/** Dashboard: the planner texts the whole family in one go; replies (and what the bot passed on) show up here. */
export default function FamilyMessages() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [family, setFamily] = useState(true)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/texting/message', { cache: 'no-store' })
      const j = await r.json()
      setMsgs(j.messages ?? []); setMembers(j.members ?? []); setFamily(j.family !== false)
    } catch { /* ignore */ } finally { setLoaded(true) }
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t) }, [load])
  useEffect(() => { if (open) endRef.current?.scrollIntoView({ block: 'nearest' }) }, [open, msgs.length])

  if (!loaded || (!members.length && !msgs.length)) return null

  async function send() {
    const message = text.trim()
    if (message.length < 2 || busy) return
    setBusy(true); setNote(null)
    try {
      const r = await fetch('/api/texting/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })
      const j = await r.json()
      if (!r.ok) { setNote(j.error === 'family_required' ? 'Texting the family is part of the Family plan.' : j.error || 'Could not send.'); return }
      setText(''); setNote(`Sent to ${j.to.join(', ')}.`); await load()
    } finally { setBusy(false) }
  }

  const fmt = (iso: string) => new Date(iso).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-5 py-4 text-left">
        <span className="flex items-center gap-2 font-semibold text-foreground"><MessageCircle className="w-4 h-4 text-primary" /> Message the family</span>
        <span className="text-xs text-muted-foreground">{members.length ? `${members.join(', ')} get it by text` : 'nobody opted in yet'}{open ? ' · hide' : ' · open'}</span>
      </button>
      {open && (
        <div className="px-5 pb-4">
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {msgs.length === 0 && <p className="text-sm text-muted-foreground">No messages yet. Whatever you write here goes to everyone by text, and their replies land back here.</p>}
            {msgs.map((m) => (
              <div key={m.id} className={`flex ${m.mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.mine ? 'bg-primary text-primary-foreground' : m.bot ? 'bg-muted text-muted-foreground' : 'bg-accent/20 text-foreground'}`}>
                  <div className={`text-[11px] ${m.mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{m.who} · {fmt(m.at)}</div>
                  <div className="whitespace-pre-wrap">{m.body}</div>
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="mt-3 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} maxLength={600} placeholder={family ? 'Text everyone… e.g. "Dinner is at 6 tonight — Rich is cooking"' : 'Family plan needed to text the family'} disabled={!family} className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <button type="button" onClick={send} disabled={busy || !family || text.trim().length < 2} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"><Send className="w-4 h-4" />{busy ? 'Sending…' : 'Send'}</button>
          </div>
          {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
          <p className="text-[11px] text-muted-foreground mt-2">Goes out as &ldquo;{'<your name>'}: …&rdquo; from the DinnerDrop number. Replies that aren&apos;t votes or list items are passed straight to your phone and shown here.</p>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import FamilyAskPanel from '@/components/FamilyAskPanel'
import { RefreshCw, CheckCheck, AlertTriangle, Image as ImageIcon, Send } from 'lucide-react'

interface Person { id: string; name: string; you: boolean; phone: string | null; status: 'joined' | 'invited' | 'stopped' | 'no phone'; sentThisWeek: number; cap: number; plainText: boolean; lastReply: string | null; problem: { at: string; what: string | null; picture: boolean } | null }
interface Msg { id: string; memberId: string | null; person: string; direction: 'in' | 'out'; from: string; body: string; kind: string; picture: boolean; at: string; delivery: 'delivered' | 'failed' | 'sending' | 'unknown' | 'not sent' | null; problem: string | null }

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const STATUS: Record<Person['status'], { label: string; cls: string }> = {
  joined: { label: 'Getting texts', cls: 'bg-emerald-100 text-emerald-800' },
  invited: { label: "Hasn't replied YES", cls: 'bg-amber-100 text-amber-800' },
  stopped: { label: 'Texted STOP', cls: 'bg-red-100 text-red-800' },
  'no phone': { label: 'No phone number', cls: 'bg-muted text-muted-foreground' },
}

/** The planner's view of every family text in and out, whether it arrived, and quick fixes. */
export default function TextsPage() {
  const [people, setPeople] = useState<Person[]>([])
  const [messages, setMessages] = useState<Msg[]>([])
  const [openVote, setOpenVote] = useState(false)
  const [loading, setLoading] = useState(true)
  const [who, setWho] = useState<string>('all')
  const [note, setNote] = useState('')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState('')
  const [days, setDays] = useState(14)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/texting/log?days=${days}`, { cache: 'no-store' })
      const d = await r.json()
      setPeople(d.people ?? []); setMessages(d.messages ?? []); setOpenVote(!!d.openVote)
    } finally { setLoading(false) }
  }, [days])
  useEffect(() => { load() }, [load])

  async function act(action: string, memberId: string, extra: Record<string, unknown> = {}) {
    setBusy(action + memberId); setNote('')
    try {
      const r = await fetch('/api/texting/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, memberId, ...extra }) })
      const d = await r.json()
      setNote(r.ok ? (d.note || 'Done.') : (d.error || 'Something went wrong.'))
      if (r.ok && action === 'send') setDraft('')
      await load()
    } finally { setBusy('') }
  }

  const shown = who === 'all' ? messages : messages.filter((m) => m.memberId === who)
  const selected = people.find((p) => p.id === who)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Texts</h1>
            <p className="text-muted-foreground mt-1">Every text to and from your family, whether it reached their phone, and quick fixes.</p>
          </div>
          <button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/40 disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>

        {note && <p className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">{note}</p>}

        <FamilyAskPanel />

        <section className="grid sm:grid-cols-2 gap-3 mb-8">
          {people.map((p) => (
            <div key={p.id} className={`rounded-xl border bg-card p-4 ${p.problem ? 'border-amber-300' : 'border-border'}`}>
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => setWho(who === p.id ? 'all' : p.id)} className="font-heading font-semibold text-foreground hover:underline text-left">
                  {p.name}{p.you ? ' (you)' : ''}
                </button>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[p.status].cls}`}>{STATUS[p.status].label}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {p.phone ?? 'No number'} · {p.sentThisWeek} of {p.cap} texts this week{p.lastReply ? ` · last replied ${when(p.lastReply)}` : ''}
              </p>
              {p.problem && (
                <p className="mt-2 text-xs text-amber-800 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />A text on {when(p.problem.at)} didn&apos;t arrive. {p.problem.what}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.status === 'joined' && openVote && (
                  <button onClick={() => act('vote_plain', p.id)} disabled={!!busy} className="px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-muted/40 disabled:opacity-50">Send this week&apos;s vote as plain text</button>
                )}
                {(p.status === 'invited') && (
                  <button onClick={() => act('invite', p.id)} disabled={!!busy} className="px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-muted/40 disabled:opacity-50">Re-send the join text</button>
                )}
                {p.status === 'joined' && !p.you && (
                  <button onClick={() => { setWho(p.id); setTimeout(() => document.getElementById('compose')?.focus(), 50) }} className="px-2.5 py-1 rounded-md border border-border text-xs font-medium hover:bg-muted/40">Message {p.name}</button>
                )}
              </div>
              {p.status === 'joined' && (
                <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={p.plainText} onChange={(e) => act('plain_text', p.id, { on: e.target.checked })} disabled={!!busy} />
                  Send {p.you ? 'my' : 'their'} votes as plain text (for phones that don&apos;t get picture texts)
                </label>
              )}
              {p.status === 'stopped' && <p className="mt-2 text-xs text-muted-foreground">They need to text START to (866) 722-4708 to get texts again.</p>}
              {p.status === 'no phone' && <p className="mt-2 text-xs text-muted-foreground">Add their number in <Link href="/settings" className="underline">Settings</Link>.</p>}
            </div>
          ))}
        </section>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button onClick={() => setWho('all')} className={`px-3 py-1 rounded-full text-xs font-semibold border ${who === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>Everyone</button>
          {people.map((p) => (
            <button key={p.id} onClick={() => setWho(p.id)} className={`px-3 py-1 rounded-full text-xs font-semibold border ${who === p.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border'}`}>{p.name}</button>
          ))}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="ml-auto rounded-md border border-input bg-background px-2 py-1 text-xs">
            <option value={3}>Last 3 days</option><option value={7}>Last week</option><option value={14}>Last 2 weeks</option><option value={30}>Last month</option>
          </select>
        </div>

        {selected && selected.status === 'joined' && !selected.you && (
          <div className="mb-4 flex gap-2">
            <input id="compose" value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={600} placeholder={`Text ${selected.name}. Their reply comes back to you here.`}
              onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) act('send', selected.id, { message: draft }) }}
              className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-sm" />
            <button onClick={() => act('send', selected.id, { message: draft })} disabled={!draft.trim() || !!busy} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"><Send className="w-4 h-4" />Send</button>
          </div>
        )}

        {loading && !messages.length ? (
          <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
        ) : !shown.length ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No texts in this period.</p>
        ) : (
          <ul className="space-y-2">
            {shown.map((m) => (
              <li key={m.id} className={`rounded-xl border p-3 ${m.direction === 'in' ? 'bg-card border-border mr-8' : m.delivery === 'failed' ? 'bg-amber-50 border-amber-300 ml-8' : 'bg-primary/5 border-primary/15 ml-8'}`}>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground mb-1">
                  <span className="font-semibold text-foreground">{m.direction === 'in' ? `${m.from} →` : `${m.from} → ${m.person}`}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">{m.kind}</span>
                  {m.picture && <span className="inline-flex items-center gap-0.5"><ImageIcon className="w-3 h-3" />picture</span>}
                  <span>{when(m.at)}</span>
                  {m.direction === 'out' && m.delivery === 'delivered' && <span className="inline-flex items-center gap-0.5 text-emerald-700"><CheckCheck className="w-3.5 h-3.5" />Delivered</span>}
                  {m.direction === 'out' && m.delivery === 'sending' && <span>Sending…</span>}
                  {m.direction === 'out' && m.delivery === 'failed' && <span className="inline-flex items-center gap-0.5 text-amber-800 font-semibold"><AlertTriangle className="w-3.5 h-3.5" />Not delivered</span>}
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{m.body}</p>
                {m.problem && <p className="mt-1 text-xs text-amber-800">{m.problem}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

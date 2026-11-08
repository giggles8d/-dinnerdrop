'use client'

import { useState } from 'react'

interface Dinner { n: number; name: string; image: string | null; time: string; sunday: boolean; picked: boolean }

export default function TapVote({ code, name, week, dinners, max, closed, test }: { code: string; name: string; week: string; dinners: Dinner[]; max: number; closed: boolean; test: boolean }) {
  const [sel, setSel] = useState<number[]>(dinners.filter((d) => d.picked).map((d) => d.n))
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const toggle = (n: number) => {
    if (closed || state === 'sending') return
    setState('idle')
    setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : s.length >= max ? s : [...s, n]))
  }
  async function send() {
    setState('sending')
    try {
      const r = await fetch(`/api/v/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ picks: sel }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setMsg(j.error || 'That didn’t go through. Try again.'); setState('error'); return }
      setMsg(test ? 'This was a test, so nothing changed. It would have counted as your picks.' : 'Your picks are in. They count just like texting the numbers.')
      setState('done')
    } catch { setMsg('That didn’t go through. Check your connection and try again.'); setState('error') }
  }
  return (
    <main className="min-h-screen bg-background pb-32">
      <div className="max-w-xl mx-auto px-4 pt-6">
        <p className="text-sm font-semibold text-primary">DinnerDrop</p>
        <h1 className="text-2xl font-heading font-bold text-foreground mt-1">{name ? `${name}, pick` : 'Pick'} the dinners you want</h1>
        <p className="text-sm text-muted-foreground mt-1">Week of {week} · tap up to {max}. {closed ? 'Voting for this week has closed.' : 'Tap again to un-pick.'}</p>
        {test && <p className="mt-3 rounded-lg bg-amber-50 text-amber-900 text-sm px-3 py-2">Test link: your taps won&apos;t change this week&apos;s dinners.</p>}
        <div className="grid grid-cols-2 gap-3 mt-5">
          {dinners.map((d) => {
            const on = sel.includes(d.n)
            return (
              <button key={d.n} type="button" onClick={() => toggle(d.n)} aria-pressed={on}
                className={`relative text-left rounded-2xl overflow-hidden border-2 transition ${on ? 'border-primary ring-2 ring-primary/30' : 'border-border'} ${closed ? 'opacity-70' : ''}`}>
                <div className="aspect-[4/3] bg-secondary">
                  {d.image ? <img src={d.image} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
                </div>
                <span className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-base font-bold shadow ${on ? 'bg-primary text-primary-foreground' : 'bg-white/90 text-transparent border border-border'}`}>✓</span>
                <div className="p-2.5">
                  {d.sunday && <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">Sunday dinner</p>}
                  <p className="text-sm font-semibold text-foreground leading-snug">{d.name}</p>
                  {d.time && <p className="text-xs text-muted-foreground mt-0.5">{d.time}</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
      {!closed && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 border-t border-border px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-xl mx-auto">
            {state === 'done' || state === 'error' ? <p className={`text-sm mb-2 ${state === 'error' ? 'text-red-700' : 'text-foreground'}`}>{msg}</p> : null}
            <button type="button" onClick={send} disabled={!sel.length || state === 'sending'}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 font-semibold disabled:opacity-40">
              {state === 'sending' ? 'Sending…' : state === 'done' ? `Update my picks (${sel.length})` : sel.length ? `Send my ${sel.length} pick${sel.length > 1 ? 's' : ''}` : 'Tap the dinners you want'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

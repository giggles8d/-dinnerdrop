'use client'

import { useState } from 'react'

interface Dinner { n: number; name: string; image: string | null; time: string; sunday: boolean; picked: boolean }
interface Fav { name: string; image: string | null }

function Card({ on, image, title, sub, tag, onClick, closed, heart }: {
  on: boolean; image: string | null; title: string; sub?: string; tag?: string; onClick: () => void; closed: boolean
  heart?: { on: boolean; busy: boolean; onClick: () => void }
}) {
  return (
    <div className={`relative rounded-2xl overflow-hidden border-2 transition ${on ? 'border-primary ring-2 ring-primary/30' : 'border-border'} ${closed ? 'opacity-70' : ''}`}>
      <button type="button" onClick={onClick} aria-pressed={on} className="block w-full text-left">
        <div className="aspect-[4/3] bg-secondary">
          {image ? <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>}
        </div>
        <span className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-base font-bold shadow ${on ? 'bg-primary text-primary-foreground' : 'bg-white/90 text-transparent border border-border'}`}>✓</span>
        <div className="p-2.5">
          {tag && <p className="text-[11px] font-semibold text-primary uppercase tracking-wide">{tag}</p>}
          <p className="text-sm font-semibold text-foreground leading-snug">{title}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </button>
      {heart && (
        <button type="button" onClick={heart.onClick} disabled={heart.busy} aria-pressed={heart.on}
          aria-label={heart.on ? 'Saved to family favorites' : 'Save to family favorites'}
          className={`absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-lg shadow bg-white/90 border border-border ${heart.busy ? 'opacity-60' : ''}`}>
          <span className={heart.on ? 'text-red-500' : 'text-muted-foreground'}>{heart.on ? '♥' : '♡'}</span>
        </button>
      )}
    </div>
  )
}

/**
 * Tap-to-vote (lib/tap-vote).
 * mode 'vote': tap as many dinners as you like (Rich, Nov 8: not just the week's number); the top picks across the family
 * still make the week. "Family favorites" adds one of the family's saved dinners to this week's vote.
 * mode 'again': the Thursday "which dinners should come back?" text — tap the ones to bring back.
 * On both, the ♥ saves a dinner to the family favorites without picking it (Sarah, Nov 8: anyone can heart, the planner can remove).
 */
export default function TapVote({ mode, code, name, week, dinners, favorites, hearted, needed, closed, test }: {
  mode: 'vote' | 'again'; code: string; name: string; week: string; dinners: Dinner[]; favorites: Fav[]; hearted: string[]; needed: number; closed: boolean; test: boolean
}) {
  const again = mode === 'again'
  const [sel, setSel] = useState<number[]>(test ? [] : dinners.filter((d) => d.picked).map((d) => d.n))
  const [favSel, setFavSel] = useState<string[]>([])
  const [showFavs, setShowFavs] = useState(false)
  const [hearts, setHearts] = useState<string[]>(hearted)
  const [heartBusy, setHeartBusy] = useState<string | null>(null)
  const [heartMsg, setHeartMsg] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')
  const count = sel.length + favSel.length

  const toggle = (n: number) => {
    if (closed || state === 'sending') return
    setState('idle')
    setSel((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]))
  }
  const toggleFav = (f: string) => {
    if (closed || state === 'sending') return
    setState('idle')
    setFavSel((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]))
  }
  async function heart(dinner: string) {
    const on = !hearts.includes(dinner)
    setHeartBusy(dinner); setHeartMsg('')
    try {
      const r = await fetch(`/api/v/${code}/heart`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: dinner, on }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setHeartMsg(j.error || 'That didn’t save. Try again.'); return }
      setHearts((h) => (on ? [...h, dinner] : h.filter((x) => x !== dinner)))
      setHeartMsg(j.message || (test ? 'Test link: nothing was saved.' : on ? `Saved ${dinner} to family favorites.` : `Removed ${dinner} from family favorites.`))
    } catch { setHeartMsg('That didn’t save. Check your connection and try again.') }
    finally { setHeartBusy(null) }
  }
  async function send() {
    setState('sending')
    try {
      const r = await fetch(`/api/v/${code}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ picks: sel, favorites: favSel }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) { setMsg(j.error || 'That didn’t go through. Try again.'); setState('error'); return }
      setMsg(test ? 'This was a test, so nothing changed.' : again ? 'Got it. These will come back in the next few weeks.' : 'Your picks are in. They count just like texting the numbers.')
      setState('done')
    } catch { setMsg('That didn’t go through. Check your connection and try again.'); setState('error') }
  }

  const addedFavs = favorites.filter((f) => favSel.includes(f.name))
  const heartFor = (dinner: string) => ({ on: hearts.includes(dinner), busy: heartBusy === dinner, onClick: () => heart(dinner) })
  return (
    <main className="min-h-screen bg-background pb-36">
      <div className="max-w-xl mx-auto px-4 pt-6">
        <p className="text-sm font-semibold text-primary">DinnerDrop</p>
        {again ? (
          <>
            <h1 className="text-2xl font-heading font-bold text-foreground mt-1">{name ? `${name}, which` : 'Which'} dinners should come back?</h1>
            <p className="text-sm text-muted-foreground mt-1">Tap the ones you&apos;d eat again soon. Tap ♡ to save one to the family favorites for good.</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-heading font-bold text-foreground mt-1">{name ? `${name}, pick` : 'Pick'} the dinners you want</h1>
            <p className="text-sm text-muted-foreground mt-1">Week of {week} · tap as many as you like. The top {needed} across the family make the week. {closed ? 'Voting for this week has closed.' : 'Tap again to un-pick. Tap ♡ to save one to the family favorites.'}</p>
          </>
        )}
        {test && <p className="mt-3 rounded-lg bg-amber-50 text-amber-900 text-sm px-3 py-2">Test link: your taps won&apos;t change anything.</p>}
        {heartMsg && <p className="mt-3 rounded-lg bg-secondary text-foreground text-sm px-3 py-2" role="status">{heartMsg}</p>}

        <div className="grid grid-cols-2 gap-3 mt-5">
          {dinners.map((d) => (
            <Card key={d.n} on={sel.includes(d.n)} image={d.image} title={d.name} sub={d.time} tag={d.sunday ? 'Sunday dinner' : undefined} onClick={() => toggle(d.n)} closed={closed} heart={heartFor(d.name)} />
          ))}
          {addedFavs.map((f) => (
            <Card key={f.name} on image={f.image} title={f.name} tag="Family favorite · added by you" onClick={() => toggleFav(f.name)} closed={closed} />
          ))}
        </div>

        {!again && !closed && (
          <div className="mt-6">
            <button type="button" onClick={() => setShowFavs((v) => !v)}
              className="w-full rounded-xl border-2 border-primary text-primary py-3 font-semibold">
              {showFavs ? 'Hide family favorites' : '⭐ In the mood for something else? Add a family favorite'}
            </button>
            {showFavs && (favorites.length ? (
              <>
                <p className="text-sm text-muted-foreground mt-3">Tap one to add it to this week&apos;s vote. It counts as your pick, and if enough of the family wants it, it makes the week.</p>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {favorites.map((f) => (
                    <Card key={f.name} on={favSel.includes(f.name)} image={f.image} title={f.name} onClick={() => toggleFav(f.name)} closed={closed} />
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground mt-3 rounded-lg bg-secondary px-3 py-3">No family favorites yet. Tap the ♡ on any dinner to save it here, and next time you can add it to the vote.</p>
            ))}
          </div>
        )}
      </div>

      {!closed && (
        <div className="fixed bottom-0 inset-x-0 bg-background/95 border-t border-border px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <div className="max-w-xl mx-auto">
            {state === 'done' || state === 'error' ? <p className={`text-sm mb-2 ${state === 'error' ? 'text-red-700' : 'text-foreground'}`}>{msg}</p> : null}
            <button type="button" onClick={send} disabled={(!count && !again) || state === 'sending'}
              className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 font-semibold disabled:opacity-40">
              {state === 'sending' ? 'Sending…'
                : again ? (state === 'done' ? `Update (${count})` : count ? `Bring back ${count} dinner${count > 1 ? 's' : ''}` : 'None of these')
                : state === 'done' ? `Update my picks (${count})` : count ? `Send my ${count} pick${count > 1 ? 's' : ''}` : 'Tap the dinners you want'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { track } from '@/lib/activation'
import type { ListItem } from '@/lib/list'

/**
 * "Done shopping? Clear what you bought" (Sarah, Nov 25 2026, Action 1). 13 of 94 "never sent" families had ticked
 * off 5+ items: they shopped in store from the list, but nothing recorded it, so they looked like non-senders and the
 * week-two nudges (default shop day) skipped them.
 *
 * Shows at the bottom of the screen (they're scrolled deep into the list in the store) once at least 5 items and 60%
 * of what's left to buy are ticked, when nothing was sent this week. Yes = records this week's in-store send
 * (POST /api/handoff/in-store, store 'In store', no message sent) and clears the ticked lines (ordered_at), with
 * Undo for 15 seconds. One prompt per week per family (localStorage), whatever they answer.
 * Tracked: list_cta_seen 'done_shopping'; cta_tap 'done_shopping_yes' / 'done_shopping_no' / 'done_shopping_undo'.
 */
export default function DoneShoppingPrompt({ uid, weekStart, items, sentThisWeek, estTotal, onClear, onUndo }: {
  uid: string | null
  weekStart: string | null
  items: ListItem[]
  sentThisWeek: boolean
  estTotal: number
  /** Mark these rows bought (ordered_at = now) and reload. */
  onClear: (ids: string[]) => Promise<void>
  /** Put them back (ordered_at = null) and reload. */
  onUndo: (ids: string[]) => Promise<void>
}) {
  const key = uid && weekStart ? `dd.doneShopping.${uid}.${weekStart}` : null
  const [answered, setAnswered] = useState(true)
  const [busy, setBusy] = useState(false)
  const [undo, setUndo] = useState<{ ids: string[]; handoffId: string | null } | null>(null)

  useEffect(() => {
    if (!key) return
    try { setAnswered(!!localStorage.getItem(key)) } catch { setAnswered(false) }
  }, [key])

  const open = items.filter((i) => !i.have)
  const ticked = open.filter((i) => i.checked)
  const ready = !!key && !sentThisWeek && !answered && ticked.length >= 5 && ticked.length / Math.max(1, open.length) >= 0.6

  useEffect(() => { if (ready) track('list_cta_seen', { id: 'done_shopping', page: 'grocery-list', n: ticked.length }) }, [ready]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!undo) return
    const t = setTimeout(() => setUndo(null), 15000)
    return () => clearTimeout(t)
  }, [undo])

  function remember(v: string) { try { if (key) localStorage.setItem(key, v) } catch { /* ignore */ } setAnswered(true) }

  async function yes() {
    if (!weekStart) return
    setBusy(true)
    const ids = ticked.map((i) => i.id)
    track('cta_tap', { id: 'done_shopping_yes', page: 'grocery-list', n: ids.length })
    let handoffId: string | null = null
    try {
      const r = await fetch('/api/handoff/in-store', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ itemCount: ids.length, estTotal, weekStart }) })
      const j = await r.json().catch(() => ({}))
      handoffId = typeof j.id === 'string' ? j.id : null
      // The page's "List sent to your phone… Clear what you bought" banner is for the text-me path; this send is
      // already cleared, so that banner skips it (same 'keep' key it reads).
      if (handoffId) { try { localStorage.setItem(`dd.send.${handoffId}`, 'keep') } catch { /* ignore */ } }
    } catch { /* still clear the list */ }
    await onClear(ids)
    remember('yes')
    setUndo({ ids, handoffId })
    setBusy(false)
  }

  async function doUndo() {
    if (!undo) return
    track('cta_tap', { id: 'done_shopping_undo', page: 'grocery-list', n: undo.ids.length })
    if (undo.handoffId) await fetch('/api/handoff/in-store', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: undo.handoffId }) }).catch(() => {})
    await onUndo(undo.ids)
    setUndo(null)
  }

  if (!ready && !undo) return null
  return (
    <div className="fixed bottom-2 sm:bottom-4 inset-x-0 z-50 px-3 sm:px-4 print:hidden native-raise">
      <div className="mx-auto max-w-2xl rounded-2xl border border-primary/30 bg-background/95 backdrop-blur shadow-xl px-4 sm:px-5 py-3" role="status" aria-live="polite">
        {undo ? (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">Cleared {undo.ids.length} item{undo.ids.length === 1 ? '' : 's'}. Nice shopping!</p>
            <button type="button" onClick={doUndo} className="min-h-[44px] px-4 rounded-full border border-border text-sm font-semibold">Undo</button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Done shopping?</p>
              <p className="text-xs text-muted-foreground">Clear the {ticked.length} item{ticked.length === 1 ? '' : 's'} you ticked off. The rest stay on your list.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { track('cta_tap', { id: 'done_shopping_no', page: 'grocery-list' }); remember('no') }} className="min-h-[44px] px-4 rounded-full border border-border text-sm font-semibold">Not yet</button>
              <button type="button" onClick={yes} disabled={busy} className="min-h-[44px] px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">Clear what I bought</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

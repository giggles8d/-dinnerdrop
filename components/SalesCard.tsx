'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Tag, Camera, Link2, FileText, X, Loader2 } from 'lucide-react'
import type { SaleItem, WeeklySales } from '@/lib/sales'

/**
 * "This week's sales" — load the store flyer (photos, a link, or pasted text) and the
 * planner builds the week around it. Family members can also text a photo of the flyer.
 */
export default function SalesCard({ compact = false, onChange }: { compact?: boolean; onChange?: () => void }) {
  const [sets, setSets] = useState<WeeklySales[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [tab, setTab] = useState<'photo' | 'link' | 'text' | null>(null)
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [store, setStore] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/sales', { cache: 'no-store' })
      const j = await r.json()
      setSets(j.sets ?? [])
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  async function submit(payload: Record<string, unknown>) {
    setBusy(true); setMsg(null)
    try {
      const r = await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, store: store.trim() || undefined }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Import failed')
      if (!j.ok) { setMsg(j.note || 'No sale items found.'); return }
      setMsg(`Loaded ${j.count} sale items${j.store ? ` from ${j.store}` : ''}${j.merged ? ' (added to this week’s flyer)' : ''}. The next menu is built around them.`)
      setUrl(''); setText(''); setTab(null)
      await load(); onChange?.()
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import failed')
    } finally { setBusy(false) }
  }

  async function onPhotos(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 6)
    if (!files.length) return
    const images = await Promise.all(files.map((f) => new Promise<string>((res) => { const rd = new FileReader(); rd.onload = () => res(String(rd.result)); rd.readAsDataURL(f) })))
    await submit({ images })
    if (fileRef.current) fileRef.current.value = ''
  }

  async function remove(id: string) {
    await fetch(`/api/sales?id=${id}`, { method: 'DELETE' })
    await load(); onChange?.()
  }

  const total = sets.reduce((n, s) => n + s.items.length, 0)

  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Tag className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-foreground">This week&apos;s sales</h2>
        {!loading && total > 0 && <span className="text-xs text-muted-foreground">{total} items{sets[0]?.store ? ` · ${sets.map((s) => s.store).filter(Boolean).join(', ')}` : ''}</span>}
        <div className="ml-auto flex gap-1.5">
          {([['photo', Camera, 'Flyer photos'], ['link', Link2, 'Ad link'], ['text', FileText, 'Paste text']] as const).map(([k, Icon, label]) => (
            <button key={k} type="button" onClick={() => (k === 'photo' ? fileRef.current?.click() : setTab(tab === k ? null : k))} disabled={busy}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${tab === k ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-foreground border-border hover:border-primary/50'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
          <input ref={fileRef} type="file" accept="image/*" multiple capture="environment" onChange={onPhotos} className="hidden" />
        </div>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Snap the store flyer (or text a photo of it to DinnerDrop) and the planner builds the week around what&apos;s on sale. Sale items are tagged on the grocery list.
      </p>

      {tab && (
        <div className="mb-3 space-y-2">
          <input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Store (optional, e.g. Wegmans)" className="w-full sm:w-64 rounded-lg border border-input px-3 py-2 text-sm" />
          {tab === 'link' && (
            <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) submit({ url: url.trim() }) }} className="flex gap-2">
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… the weekly ad page or PDF" className="flex-1 rounded-lg border border-input px-3 py-2 text-sm" />
              <button type="submit" disabled={busy || !url.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Load'}</button>
            </form>
          )}
          {tab === 'text' && (
            <form onSubmit={(e) => { e.preventDefault(); if (text.trim()) submit({ text: text.trim() }) }} className="space-y-2">
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder={'Paste the ad text — e.g.\nBoneless chicken thighs $1.99/lb\nStrawberries 2 for $5\n…'} className="w-full rounded-lg border border-input px-3 py-2 text-sm" />
              <button type="submit" disabled={busy || !text.trim()} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">{busy ? 'Reading…' : 'Load sales'}</button>
            </form>
          )}
        </div>
      )}
      {busy && tab !== 'link' && tab !== 'text' && <p className="text-sm text-muted-foreground mb-2"><Loader2 className="inline w-4 h-4 animate-spin mr-1" />Reading the flyer…</p>}
      {msg && <p className="text-sm text-foreground mb-2">{msg}</p>}

      {!loading && sets.length === 0 && !busy && (
        <p className="text-sm text-muted-foreground">No flyer loaded for this week yet.</p>
      )}
      {sets.map((s) => (
        <div key={s.id} className="mt-2 rounded-xl bg-secondary/50 border border-primary/10 p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">{s.store || 'Store flyer'}</span>
            <span className="text-xs text-muted-foreground">{s.items.length} items{s.valid_to ? ` · through ${s.valid_to.slice(5).replace('-', '/')}` : ''}{s.added_by ? ` · from ${s.added_by}` : ''}</span>
            <button type="button" onClick={() => remove(s.id)} aria-label="Remove" className="ml-auto text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
          </div>
          {!compact && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {s.items.slice(0, 14).map((i: SaleItem) => <span key={i.name} className="rounded-full bg-white border border-border px-2 py-0.5 text-[11px] text-foreground">{i.name} <span className="text-primary font-semibold">{i.price}</span></span>)}
              {s.items.length > 14 && <span className="text-[11px] text-muted-foreground self-center">+{s.items.length - 14} more</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

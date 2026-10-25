'use client'

import { useEffect, useRef, useState } from 'react'

const MAX_SHOTS = 12

/** Downsize a screenshot in the browser (long phone screenshots are 2-4 MB each; a dozen must fit in one request). */
async function shrink(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bmp.width, bmp.height))
    const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale)
    const c = document.createElement('canvas'); c.width = w; c.height = h
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    const blob: Blob | null = await new Promise((res) => c.toBlob(res, 'image/jpeg', quality))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[a-z0-9]+$/i, '') + '.jpg', { type: 'image/jpeg' })
  } catch { return file }
}
import { Receipt, Loader2, Check, X } from 'lucide-react'

interface Result { store: string | null; total: number | null; items: number; bought: number; replaced: number; refunded: number; missing: number; restored: string[]; matchedHandoff: boolean }

/**
 * "Upload your receipt": screenshot(s) of the Instacart / Kroger order → what was actually bought.
 * Anything the store didn't have goes back on the active list; the real total tunes price estimates.
 * Renders only when /api/receipts/upload says the feature is on for this account.
 */
export default function ReceiptUpload({ onDone }: { onDone?: (r: Result) => void }) {
  const [enabled, setEnabled] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [mode, setMode] = useState<'shots' | 'text'>('text')
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/receipts/upload').then((r) => r.json()).then((j) => setEnabled(!!j?.enabled)).catch(() => setEnabled(false))
  }, [])
  if (!enabled) return null

  async function submit() {
    if (busy) return
    if (mode === 'text' ? text.trim().length < 40 : !files.length) return
    setBusy(true); setError(null)
    try {
      let r: Response
      if (mode === 'text') {
        r = await fetch('/api/receipts/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      } else {
        const fd = new FormData()
        let shots = await Promise.all(files.slice(0, MAX_SHOTS).map((f) => shrink(f)))
        if (shots.reduce((n, f) => n + f.size, 0) > 3.8 * 1024 * 1024) shots = await Promise.all(files.slice(0, MAX_SHOTS).map((f) => shrink(f, 1200, 0.7)))
        shots.forEach((f) => fd.append('images', f))
        r = await fetch('/api/receipts/upload', { method: 'POST', body: fd })
      }
      const j = await r.json()
      if (!r.ok) { setError(j?.error || 'Something went wrong.'); return }
      setResult(j as Result); setFiles([]); setText('')
      onDone?.(j as Result)
    } catch { setError('Something went wrong. Try again.') } finally { setBusy(false) }
  }

  return (
    <div className="mt-6 p-5 rounded-xl border border-border bg-card print:hidden">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center"><Receipt className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-semibold text-foreground">Got your groceries? Upload the receipt.</p>
          <p className="text-sm text-muted-foreground mt-0.5">Most accurate: open the order&rsquo;s receipt page, select all, copy, and paste the text here. Or upload screenshots (up to 12 for a big order). We&rsquo;ll mark what came, put anything the store didn&rsquo;t have back on your list, and use the real total to sharpen next week&rsquo;s estimates. Uploading the same order again replaces the earlier read.</p>

          {result ? (
            <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium text-foreground flex items-center gap-1.5"><Check className="w-4 h-4 text-primary" /> Got {result.store ? `your ${result.store} receipt` : 'your receipt'}{result.total ? ` — $${result.total.toFixed(2)}` : ''}</p>
              <ul className="mt-1.5 text-muted-foreground space-y-0.5">
                <li>{result.bought} bought as planned{result.replaced ? ` · ${result.replaced} replaced` : ''}{result.refunded ? ` · ${result.refunded} refunded` : ''}</li>
                {result.restored.length > 0
                  ? <li className="text-foreground"><b>Back on your list:</b> {result.restored.join(', ')} — send just those to another store below.</li>
                  : <li>Nothing was missing — your list is clear.</li>}
                {!result.matchedHandoff && <li className="text-xs">We couldn&rsquo;t find a recent order to match this to, so only the total and pantry were updated.</li>}
              </ul>
              <button type="button" onClick={() => setResult(null)} className="mt-2 text-xs text-primary underline">Upload another</button>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="w-full flex gap-1 text-xs">
                <button type="button" onClick={() => setMode('text')} className={`px-2.5 py-1 rounded-md border ${mode === 'text' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'}`}>Paste receipt text</button>
                <button type="button" onClick={() => setMode('shots')} className={`px-2.5 py-1 rounded-md border ${mode === 'shots' ? 'border-primary text-primary bg-primary/5' : 'border-border text-muted-foreground'}`}>Screenshots</button>
              </div>
              {mode === 'text' && (
                <>
                  <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} placeholder="Paste everything from the receipt page — items, replacements, totals." className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <button type="button" onClick={submit} disabled={busy || text.trim().length < 40} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading…</> : 'Read receipt'}
                  </button>
                </>
              )}
              {mode === 'shots' && (<>
              <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { const picked = Array.from(e.target.files ?? []); setFiles(picked.slice(0, MAX_SHOTS)); setError(picked.length > MAX_SHOTS ? `Only the first ${MAX_SHOTS} screenshots will be used.` : null) }} />
              <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="px-3 py-1.5 rounded-md border border-border bg-background text-sm font-medium hover:bg-muted">
                {files.length ? `${files.length} screenshot${files.length === 1 ? '' : 's'} chosen` : 'Choose screenshot(s)'}
              </button>
              {files.length > 0 && (
                <>
                  <button type="button" onClick={submit} disabled={busy} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-60">
                    {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading…</> : 'Upload receipt'}
                  </button>
                  <button type="button" onClick={() => { setFiles([]); if (inputRef.current) inputRef.current.value = '' }} disabled={busy} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Clear"><X className="w-4 h-4" /></button>
                </>
              )}
              </>)}
              {error && <p className="w-full text-sm text-destructive">{error}</p>}
              {busy && <p className="w-full text-xs text-muted-foreground">Reading the receipt usually takes 15–40 seconds for a big order.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

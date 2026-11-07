'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, Mic, MicOff, X, Check, Loader2 } from 'lucide-react'
import type { Meal } from '@/types'

const EXAMPLES = 'Kielbasa and pierogies with onions fried in butter\nBoxed scalloped potatoes with cut-up ham and peas\nChicken in the frying pan with Italian dressing, a veggie and potatoes'

type Img = { base64: string; mediaType: 'image/jpeg'; preview: string }

/** Shrink a photo in the browser so it uploads fast (long side 1280px, JPEG). */
async function shrink(file: File): Promise<Img> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
    const scale = Math.min(1, 1280 / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    const data = c.toDataURL('image/jpeg', 0.8)
    return { base64: data.split(',')[1], mediaType: 'image/jpeg', preview: data }
  } finally { URL.revokeObjectURL(url) }
}

type SpeechRec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>; resultIndex: number }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }

/**
 * "Add your family's own dinners": say it how you'd say it (type, talk, or snap a photo of the box / plate /
 * recipe card). We write it up THEIR way, show a preview, and save the ones they approve to favorites.
 */
export default function FamilyRecipes({ onSaved, compact = false }: { onSaved?: (names: string[]) => void; compact?: boolean }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState<Img[]>([])
  const [busy, setBusy] = useState<'' | 'preview' | 'save'>('')
  const [error, setError] = useState('')
  const [done, setDone] = useState('')
  const [preview, setPreview] = useState<Meal[] | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [listening, setListening] = useState(false)
  const [canTalk, setCanTalk] = useState(false)
  const recRef = useRef<SpeechRec | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
    setCanTalk(!!(w.SpeechRecognition || w.webkitSpeechRecognition))
  }, [])

  function toggleMic() {
    if (listening) { recRef.current?.stop(); return }
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = 'en-US'; rec.interimResults = false; rec.continuous = true
    const startText = text.trim()
    let said = ''
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) said += (said ? ' ' : '') + e.results[i][0].transcript.trim()
      setText((startText ? startText + '\n' : '') + said)
    }
    rec.onend = () => setListening(false)
    rec.onerror = () => setListening(false)
    recRef.current = rec
    setListening(true)
    rec.start()
  }

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return
    setError('')
    try {
      const next = await Promise.all(Array.from(files).slice(0, 4 - images.length).map(shrink))
      setImages((cur) => [...cur, ...next].slice(0, 4))
    } catch { setError("That photo couldn't be opened. Try another one.") }
  }

  async function runPreview() {
    setBusy('preview'); setError(''); setDone('')
    try {
      const res = await fetch('/api/family-recipes/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, images: images.map(({ base64, mediaType }) => ({ base64, mediaType })) }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      setPreview(data.meals as Meal[]); setOpen(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Something went wrong.') }
    finally { setBusy('') }
  }

  async function save() {
    if (!preview?.length) return
    setBusy('save'); setError('')
    try {
      const res = await fetch('/api/family-recipes/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meals: preview }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save.')
      const saved: string[] = data.saved ?? []
      setDone(saved.length ? `Saved ${saved.length === 1 ? `"${saved[0]}"` : `${saved.length} family recipes`} to your favorites. They'll come up in your weekly plans and votes.` : 'Those are already in your favorites.')
      setPreview(null); setText(''); setImages([])
      onSaved?.(saved)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save.') }
    finally { setBusy('') }
  }

  const rename = (i: number, name: string) => setPreview((p) => p ? p.map((m, j) => (j === i ? { ...m, name } : m)) : p)
  const drop = (i: number) => setPreview((p) => { const n = p ? p.filter((_, j) => j !== i) : p; return n && n.length ? n : null })

  return (
    <div className={`rounded-2xl border border-primary/20 bg-primary/5 ${compact ? 'p-4' : 'p-5'}`}>
      <h2 className="text-lg font-heading font-bold text-foreground">Add your family&apos;s own dinners</h2>
      <p className="text-sm text-muted-foreground mt-1">
        No recipe needed. Say it the way you&apos;d tell a friend, one dinner per line. Boxed stays boxed. We&apos;ll write it up your way.
      </p>

      {!preview && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Tab' && !text.trim()) { e.preventDefault(); setText(EXAMPLES) } }}
            rows={4}
            placeholder={EXAMPLES}
            className="mt-3 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {!text.trim() && (
            <button type="button" onClick={() => setText(EXAMPLES)} className="mt-1 text-xs font-semibold text-primary hover:underline">Use these examples (then edit them to match how you make them)</button>
          )}
          {images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((im, i) => (
                <div key={i} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={im.preview} alt="" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  <button onClick={() => setImages((c) => c.filter((_, j) => j !== i))} aria-label="Remove photo" className="absolute -top-1.5 -right-1.5 rounded-full bg-background border border-border p-0.5"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {canTalk && (
              <button type="button" onClick={toggleMic}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium ${listening ? 'border-red-400 bg-red-50 text-red-700' : 'border-border bg-background text-foreground hover:bg-muted/40'}`}>
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}{listening ? 'Stop' : 'Say it'}
              </button>
            )}
            <button type="button" onClick={() => fileRef.current?.click()} disabled={images.length >= 4}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-50">
              <Camera className="w-4 h-4" />Snap the box, plate or recipe card
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
            <button type="button" onClick={runPreview} disabled={busy !== '' || (!text.trim() && !images.length)}
              className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              {busy === 'preview' ? <><Loader2 className="w-4 h-4 animate-spin" />Writing it up…</> : 'Write it up'}
            </button>
          </div>
          {listening && <p className="mt-2 text-xs text-red-700">Listening… say each dinner, then tap Stop.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Tip: your family can text these too: &quot;save this: tacos with the Old El Paso kit&quot; to the DinnerDrop number.</p>
        </>
      )}

      {preview && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">Here&apos;s what we wrote up. Fix a name if you like, remove any you don&apos;t want, then save.</p>
          {preview.map((m, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <input value={m.name} onChange={(e) => rename(i, e.target.value)} maxLength={60}
                  className="flex-1 min-w-0 bg-transparent font-heading font-semibold text-foreground border-b border-transparent focus:border-primary focus:outline-none" />
                <button onClick={() => drop(i)} aria-label={`Remove ${m.name}`} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
              </div>
              {m.original && <p className="text-xs text-muted-foreground mt-0.5">From: &ldquo;{m.original}&rdquo;</p>}
              <p className="text-xs text-muted-foreground mt-1">{m.prepTime + m.cookTime} min · {m.servings} servings · about ${m.estimatedCost.toFixed(0)}</p>
              {m.familyNote && <p className="text-xs text-amber-700 mt-1">Note: {m.familyNote}</p>}
              <button onClick={() => setOpen(open === i ? null : i)} className="text-xs font-semibold text-primary mt-1.5 hover:underline">{open === i ? 'Hide recipe' : 'See recipe'}</button>
              {open === i && (
                <div className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
                  <ul className="space-y-0.5">{m.ingredients.map((g, k) => <li key={k}>• {[g.quantity, g.unit, g.name].filter(Boolean).join(' ')}</li>)}</ul>
                  <ol className="space-y-1 list-decimal pl-4">{m.steps.map((s, k) => <li key={k}>{s}</li>)}</ol>
                  {m.swaps?.length ? <p className="sm:col-span-2 text-xs text-muted-foreground">Easy swaps: {m.swaps.join(' · ')}</p> : null}
                </div>
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            <button onClick={save} disabled={busy !== ''} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50">
              {busy === 'save' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Save to my favorites
            </button>
            <button onClick={() => setPreview(null)} disabled={busy !== ''} className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/40">Back</button>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      {done && <p className="mt-3 text-sm text-foreground">✅ {done}</p>}
    </div>
  )
}

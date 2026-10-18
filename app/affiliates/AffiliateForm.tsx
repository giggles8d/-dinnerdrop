'use client'

import { useState } from 'react'

export default function AffiliateForm() {
  const [form, setForm] = useState({ name: '', email: '', platform: '', audience: '', url: '', notes: '', website: '' })
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('busy'); setErr('')
    const res = await fetch('/api/affiliates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok) { setErr(j.error || 'Something went wrong.'); setState('error'); return }
    setState('done')
  }

  if (state === 'done') return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
      <p className="font-semibold text-foreground">Application received.</p>
      <p className="text-sm text-muted-foreground mt-1">We reply within a few days with your link. Check your inbox for a confirmation.</p>
    </div>
  )

  return (
    <form onSubmit={submit} className="rounded-2xl border border-border bg-white p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block text-sm"><span className="font-medium">Name</span><input required value={form.name} onChange={set('name')} className="mt-1 w-full rounded-lg border border-input px-3 py-2" /></label>
        <label className="block text-sm"><span className="font-medium">Email</span><input required type="email" value={form.email} onChange={set('email')} className="mt-1 w-full rounded-lg border border-input px-3 py-2" /></label>
        <label className="block text-sm"><span className="font-medium">Where&apos;s your audience?</span>
          <select value={form.platform} onChange={set('platform')} className="mt-1 w-full rounded-lg border border-input px-3 py-2 bg-white">
            <option value="">Pick one</option>
            {['Instagram', 'TikTok', 'YouTube', 'Blog / website', 'Newsletter', 'Facebook group', 'Podcast', 'Pinterest', 'Other'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label className="block text-sm"><span className="font-medium">Audience size</span>
          <select value={form.audience} onChange={set('audience')} className="mt-1 w-full rounded-lg border border-input px-3 py-2 bg-white">
            <option value="">Pick one</option>
            {['Under 1,000', '1,000–10,000', '10,000–50,000', '50,000–250,000', '250,000+'].map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm"><span className="font-medium">Link to your page or channel</span><input value={form.url} onChange={set('url')} placeholder="https://" className="mt-1 w-full rounded-lg border border-input px-3 py-2" /></label>
      <label className="block text-sm"><span className="font-medium">Anything else</span><textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Who follows you, what you'd make, questions." className="mt-1 w-full rounded-lg border border-input px-3 py-2" /></label>
      <input value={form.website} onChange={set('website')} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <button disabled={state === 'busy'} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">{state === 'busy' ? 'Sending…' : 'Apply'}</button>
    </form>
  )
}

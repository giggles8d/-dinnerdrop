'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

/** In-app account deletion: type DELETE, then everything is removed and billing stops. */
export default function DeleteAccount() {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function del(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setMsg('')
    try {
      const r = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: text.trim().toUpperCase() }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok || !j.ok) { setMsg(j.error || 'Something went wrong. Please try again.'); setBusy(false); return }
      await createClient().auth.signOut().catch(() => {})
      window.location.href = '/login?deleted=1'
    } catch {
      setMsg('Network error. Please try again.'); setBusy(false)
    }
  }

  return (
    <div>
      <h2 className="font-heading font-semibold text-foreground mb-1">Delete account</h2>
      <p className="text-xs text-muted-foreground mb-2">Permanently deletes your account, meal plans, favorites, pantry, grocery lists and household texting. Any subscription is canceled right away. This can&apos;t be undone.</p>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 rounded-md border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/5">Delete my account</button>
      ) : (
        <form onSubmit={del} className="space-y-2 max-w-sm">
          <label className="block text-xs text-foreground">Type <span className="font-semibold">DELETE</span> to confirm</label>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoComplete="off" className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm" />
            <button type="submit" disabled={busy || text.trim().toUpperCase() !== 'DELETE'} className="px-4 py-2 rounded-md bg-destructive text-white text-sm font-semibold disabled:opacity-50">{busy ? 'Deleting…' : 'Delete'}</button>
          </div>
          <button type="button" onClick={() => { setOpen(false); setText(''); setMsg('') }} className="text-xs text-muted-foreground underline">Cancel</button>
          {msg && <p className="text-xs text-destructive">{msg}</p>}
        </form>
      )}
    </div>
  )
}

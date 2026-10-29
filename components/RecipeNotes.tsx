'use client'
import { useEffect, useMemo, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { createClient } from '@/lib/supabase'

// Same normalization as lib/recipe-library normalizeName (kept inline: that module is server-side).
const normalizeName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')

/**
 * The family's own note on a dinner ("half the chili powder", "kids liked it over rice"),
 * saved per dinner name so it shows up every time that dinner comes back (Mealime Pro had this).
 */
export default function RecipeNotes({ recipeName }: { recipeName: string }) {
  const supabase = useMemo(() => createClient(), [])
  const key = normalizeName(recipeName)
  const [userId, setUserId] = useState<string | null>(null)
  const [saved, setSaved] = useState('')
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user || !live) return
      setUserId(session.user.id)
      const { data } = await supabase.from('recipe_notes').select('note').eq('user_id', session.user.id).eq('recipe_key', key).maybeSingle()
      if (live && data?.note) { setSaved(data.note); setDraft(data.note) }
    })()
    return () => { live = false }
  }, [supabase, key])

  async function save() {
    if (!userId) return
    setStatus('saving')
    const note = draft.trim().slice(0, 2000)
    const res = note
      ? await supabase.from('recipe_notes').upsert({ user_id: userId, recipe_key: key, recipe_name: recipeName, note, updated_at: new Date().toISOString() }, { onConflict: 'user_id,recipe_key' })
      : await supabase.from('recipe_notes').delete().eq('user_id', userId).eq('recipe_key', key)
    if (res.error) { setStatus('error'); return }
    setSaved(note)
    setEditing(false)
    setStatus('saved')
  }

  if (!userId) return null
  return (
    <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5"><StickyNote className="w-3.5 h-3.5" /> Your notes</h2>
        {!editing && <button onClick={() => { setDraft(saved); setEditing(true); setStatus('idle') }} className="text-xs font-semibold text-amber-800 hover:underline">{saved ? 'Edit' : 'Add a note'}</button>}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={2000} autoFocus
            placeholder="e.g. Half the chili powder for the kids · Double the sauce · Great with rice"
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-300" />
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={status === 'saving'} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50">{status === 'saving' ? 'Saving…' : 'Save note'}</button>
            <button onClick={() => { setEditing(false); setDraft(saved) }} className="text-xs text-muted-foreground hover:underline">Cancel</button>
            {status === 'error' && <span className="text-xs text-destructive">Couldn&apos;t save — try again.</span>}
          </div>
        </div>
      ) : saved ? (
        <p className="text-sm text-foreground whitespace-pre-wrap">{saved}</p>
      ) : (
        <p className="text-xs text-muted-foreground">Jot down what you changed or what the family said — it&apos;ll be here next time this dinner comes up.</p>
      )}
      {status === 'saved' && !editing && <p className="text-[11px] text-amber-800 mt-1">Saved — you&apos;ll see it whenever this dinner is on your plan.</p>}
    </section>
  )
}

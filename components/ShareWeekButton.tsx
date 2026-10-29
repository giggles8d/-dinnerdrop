'use client'
import { useState } from 'react'
import { Share2 } from 'lucide-react'
import { nativeShare } from '@/lib/native'

/** "Share this week" → a read-only page of this week's dinners for the family group chat. */
export default function ShareWeekButton() {
  const [state, setState] = useState<'idle' | 'busy' | 'copied' | 'error'>('idle')
  async function share() {
    setState('busy')
    try {
      const r = await fetch('/api/share-week', { method: 'POST' })
      const j = await r.json()
      if (!j.url) throw new Error('no url')
      const text = "Here's what's for dinner this week 🍽️"
      if (await nativeShare({ title: 'Our dinners this week', text, url: j.url })) { setState('idle'); return }
      await navigator.clipboard.writeText(`${text} ${j.url}`)
      setState('copied')
      setTimeout(() => setState('idle'), 3000)
    } catch { setState('error') }
  }
  return (
    <button onClick={share} disabled={state === 'busy'} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50">
      <Share2 className="w-4 h-4" />
      {state === 'copied' ? 'Link copied — paste it in the family chat' : state === 'error' ? 'Try again' : 'Share this week'}
    </button>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { MessageSquareText, X } from 'lucide-react'
import { track } from '@/lib/activation'

/**
 * "Add your family by text" on the grocery list, right after a family's first send (Sarah, Nov 25 2026, week-two
 * review #6). Shown once: the first list visit after the first send (the same visit, via refreshKey, or the next one
 * within 7 days). Recorded as list_cta_seen { id: 'family_text_card' }, so it never comes back on any device.
 * Only for families with Family access, a join code, and nobody in the household texting yet. It shares the existing
 * join link (/go/family/<code>): each person taps it, types their name and texts JOIN. Dismissible.
 */
export default function FamilyTextCard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [joinUrl, setJoinUrl] = useState<string | null>(null)
  const [show, setShow] = useState(false)
  const [shared, setShared] = useState<string | null>(null)

  useEffect(() => {
    if (show) return
    let cancelled = false
    fetch('/api/texting/quick-setup', { cache: 'no-store' }).then((r) => r.json()).then((j: { family?: boolean; joinUrl?: string | null; noFamilyPhones?: boolean; firstSentAt?: string | null; familyCardSeen?: boolean }) => {
      if (cancelled) return
      const recentFirstSend = !!j.firstSentAt && Date.now() - Date.parse(j.firstSentAt) < 7 * 86400000
      if (j.family && j.joinUrl && j.noFamilyPhones && recentFirstSend && !j.familyCardSeen) {
        setJoinUrl(j.joinUrl)
        setShow(true)
        track('list_cta_seen', { id: 'family_text_card', page: 'grocery-list' })
      }
    }).catch(() => {})
    return () => { cancelled = true }
  }, [refreshKey, show])

  async function share() {
    if (!joinUrl) return
    track('cta_tap', { id: 'family_text_share', page: 'grocery-list' })
    const text = 'Help me pick dinners this week? Tap to get the ideas by text and vote:'
    try {
      if (navigator.share) { await navigator.share({ title: 'Family dinner vote', text, url: joinUrl }); setShared('Sent! When they text JOIN, they get the dinner ideas.'); return }
    } catch { return /* cancelled */ }
    try { await navigator.clipboard.writeText(`${text} ${joinUrl}`); setShared('Link copied. Paste it in your family group chat.') }
    catch { setShared(joinUrl) }
  }

  function dismiss() {
    track('cta_tap', { id: 'family_text_dismiss', page: 'grocery-list' })
    setShow(false)
  }

  if (!show) return null
  return (
    <div className="mb-6 rounded-2xl border border-primary/20 bg-secondary/40 p-5 relative print:hidden">
      <button type="button" onClick={dismiss} aria-label="Not now" className="absolute top-2 right-2 w-11 h-11 flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted"><X className="w-4 h-4" /></button>
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><MessageSquareText className="w-5 h-5" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-heading font-bold text-foreground text-lg pr-8">Add your family by text</p>
          <p className="text-sm text-muted-foreground mt-0.5">Send them one link. Each person taps it, types their name and texts JOIN. Then they vote on next week&apos;s dinners and can text <span className="font-semibold text-foreground">ADD milk</span> onto this list. No app to install.</p>
          {shared ? (
            <p className="mt-3 text-sm font-medium text-primary break-all">{shared}</p>
          ) : (
            <button type="button" onClick={share} className="mt-3 inline-flex min-h-[44px] items-center px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Send the family a link</button>
          )}
        </div>
      </div>
    </div>
  )
}

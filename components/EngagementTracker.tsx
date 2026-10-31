'use client'

import { useEffect, useRef } from 'react'
import { track, trackOnce } from '@/lib/activation'

/**
 * What happens on the screen between the funnel milestones: did the plan render, how far they scrolled,
 * whether a grocery-list / Instacart button ever came into view, how long they stayed, and whether they
 * backgrounded the app or actually left. Renders nothing. Buttons to watch carry data-track="<id>".
 */
export default function EngagementTracker({ page, ready }: { page: 'dashboard' | 'grocery-list'; ready: boolean }) {
  const start = useRef(Date.now())
  const maxScroll = useRef(0)
  const hidden = useRef(false)
  const closed = useRef(false)

  // The thing they came for is on screen.
  useEffect(() => { if (ready) trackOnce('plan_seen', { page, t: secs(start.current) }) }, [ready, page])

  useEffect(() => {
    const marks = [25, 50, 75, 100] as const
    const seen = new Set<number>()
    const onScroll = () => {
      const doc = document.documentElement
      const total = Math.max(1, doc.scrollHeight - window.innerHeight)
      const pct = Math.min(100, Math.round(((window.scrollY || doc.scrollTop) / total) * 100))
      if (pct > maxScroll.current) maxScroll.current = pct
      for (const m of marks) if (pct >= m && !seen.has(m)) { seen.add(m); trackOnce(`scroll_${m}` as 'scroll_25', { page }) }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    // Dwell marks.
    const timers = [30, 60, 120].map((s) => setTimeout(() => trackOnce(`dwell_${s}s` as 'dwell_30s', { page, scroll: maxScroll.current }), s * 1000))

    // Tracked buttons entering the viewport, and taps on them.
    const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { trackOnce('list_cta_seen', { page, id: (e.target as HTMLElement).dataset.track || 'cta', t: secs(start.current) }); io?.unobserve(e.target) }
    }, { threshold: 0.6 }) : null
    const observeAll = () => document.querySelectorAll<HTMLElement>('[data-track]').forEach((el) => io?.observe(el))
    observeAll()
    const mo = typeof MutationObserver !== 'undefined' ? new MutationObserver(observeAll) : null
    mo?.observe(document.body, { childList: true, subtree: true })
    const onTap = (ev: Event) => {
      const el = (ev.target as HTMLElement | null)?.closest<HTMLElement>('[data-track]')
      if (el) track('cta_tap', { page, id: el.dataset.track || 'cta', t: secs(start.current), scroll: maxScroll.current })
    }
    document.addEventListener('click', onTap, true)

    // Backgrounded vs. gone.
    const onVis = () => {
      if (document.visibilityState === 'hidden') { hidden.current = true; trackOnce('page_hidden', { page, t: secs(start.current), scroll: maxScroll.current }) }
    }
    const onHide = () => {
      if (closed.current) return
      closed.current = true
      track('page_closed', { page, t: secs(start.current), scroll: maxScroll.current, hidden: hidden.current }, { beacon: true })
    }
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('scroll', onScroll); timers.forEach(clearTimeout); io?.disconnect(); mo?.disconnect()
      document.removeEventListener('click', onTap, true); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', onHide)
    }
  }, [page])

  return null
}

function secs(from: number): number { return Math.round((Date.now() - from) / 1000) }

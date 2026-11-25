'use client'
/**
 * Black Friday 2026 banner (Sarah, Nov 25 2026). Shows until Mon Nov 30 11:59 PM ET to families not already paying,
 * links to /subscribe (yearly is 50% off the first year there) and to /gift (50% off). Dismissible per device.
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { BF_SALE, blackFridayOpen } from '@/lib/bf-sale'
import { track } from '@/lib/activation'

const KEY = `dd.bf.${BF_SALE.id}.dismissed`

export default function BlackFridayBanner({ page }: { page: string }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!blackFridayOpen()) return
    try { if (localStorage.getItem(KEY)) return } catch { /* ignore */ }
    let live = true
    ;(async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('subscription_status').eq('id', user.id).maybeSingle()
      const st = (p?.subscription_status as string | null) ?? 'free'
      if (live && st !== 'active' && st !== 'trialing') { setShow(true); track('cta_tap', { id: 'bf_banner_seen', page }) }
    })().catch(() => {})
    return () => { live = false }
  }, [page])
  if (!show) return null
  const dismiss = () => { try { localStorage.setItem(KEY, '1') } catch { /* ignore */ } setShow(false) }
  return (
    <div className="mb-6 rounded-xl border border-accent/60 bg-accent/15 p-4 print:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest uppercase text-foreground/70">Black Friday</p>
          <p className="text-base font-semibold text-foreground mt-1">Family is 50% off your first year: {BF_SALE.yearlyPrice} instead of {BF_SALE.yearlyFull}.</p>
          <p className="text-sm text-muted-foreground mt-1">Family texting, a profile for each person, Kroger cart. Ends {BF_SALE.deadlineLabel}. Cancel anytime.</p>
        </div>
        <button onClick={dismiss} aria-label="Hide this offer" className="shrink-0 min-h-[44px] min-w-[44px] -mr-2 -mt-2 text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href={`/subscribe?plan=yearly&utm_source=app&utm_medium=banner&utm_campaign=bf2026&utm_content=${page}`} onClick={() => track('cta_tap', { id: 'bf_banner_tap', page })} className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-semibold">Get 50% off</Link>
        <Link href={`/gift?utm_source=app&utm_medium=banner&utm_campaign=bf2026&utm_content=${page}`} onClick={() => track('cta_tap', { id: 'bf_gift_tap', page })} className="text-sm font-semibold text-primary underline underline-offset-4">Or give it as a gift, also 50% off</Link>
      </div>
    </div>
  )
}

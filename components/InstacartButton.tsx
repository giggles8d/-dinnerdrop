'use client'

import { useState } from 'react'
import { openExternal, tapHaptic } from '@/lib/native'
import { track } from '@/lib/activation'
import { fireCartSent } from '@/lib/cart-conversion'
import { SEND_VARIANT } from '@/lib/send-variant'
import InAppBrowserNotice, { inAppBrowserName } from '@/components/InAppBrowserNotice'
import type { GroceryCategory, GroceryItem } from '@/types'

interface InstacartButtonProps {
  groceryList: Record<GroceryCategory, GroceryItem[]>
  estTotal?: number
  weekStart?: string
  /** For split orders: the store this subset is for (shown on the button and in the list title). */
  store?: string
  /** Called after the list was handed to Instacart (not on the fallback search). */
  onSent?: () => void
  /** Pinned-bar version: no helper line under the button. */
  compact?: boolean
  /** The family's stores (Settings → Stores), to warn about limited-brand stores like Aldi. */
  familyStores?: string[]
}

/** Stores that carry few national brands, so Instacart substitutes more ("Close Match" items). */
const LIMITED_BRAND = /\b(aldi|lidl|save[- ]a[- ]lot|trader joe|costco|sam'?s club|bj'?s)\b/i

/**
 * Instacart CTA.
 *
 * Built to the Instacart Developer Platform CTA design spec (Dark variant):
 *   - Pill button, height 46px, padding 16px / 18px
 *   - Background #003D29, foreground text #FAF1E5
 *   - Official full-color carrot logo (#FF7009 / #0AAD0A), 22px
 * Docs: https://docs.instacart.com/developer_platform_api/guide/concepts/design/cta_design
 *
 * Copy (Sarah, Nov 25 2026, send_feel_v1): "Save my list to Instacart" instead of "Shop ingredients", with "You'll
 * check prices and edit before you pay." under it, so the tap doesn't read as spending money (62% of families who
 * saw the button sent nowhere). Instacart's spec lists "Shop ingredients" and "Shop on Instacart" as its A/B-tested
 * copy; it neither requires nor forbids other text (checked Nov 25 2026). Colors, size, logo and the "Powered by
 * Instacart" line are unchanged. The text is true: the link opens a list on Instacart; nothing is bought until checkout.
 */
export default function InstacartButton({ groceryList, estTotal, weekStart, store, onSent, compact, familyStores }: InstacartButtonProps) {
  const limited = [store, ...(familyStores ?? [])].filter((s): s is string => !!s && LIMITED_BRAND.test(s))
  const limitedName = limited[0]?.replace(/\b\w/g, (c) => c.toUpperCase())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Inside Facebook/Instagram's browser, when the Instacart tab was blocked: the notice, with the link to try here.
  const [iabLink, setIabLink] = useState<string | null>(null)

  async function handleSendToInstacart() {
    tapHaptic()
    const tappedAt = Date.now()
    setLoading(true)
    setError(null)
    setIabLink(null)

    try {
      const res = await fetch('/api/instacart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groceryList, estTotal, weekStart, store }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Could not create your Instacart list. Please try again.')
        return
      }

      // Instacart didn't build the list (after a retry): don't open a one-item search the family would mistake
      // for their list — keep them here to try again (Nov 21 2026 review).
      if (data.fallback) {
        setError("Instacart didn't answer just now, so your list wasn't saved. Tap the button again in a moment, or send it to Walmart below.")
        track('cta_tap', { id: 'instacart_api_failed', variant: SEND_VARIANT })
        return
      }
      if (data.link) {
        const how = await openExternal(data.link)
        // Measure how often the browser blocks the Instacart tab (Nov 21 2026): meta.ms = tap-to-open wait.
        track('cta_tap', { id: how === 'blocked' ? 'instacart_tab_blocked' : 'instacart_tab_opened', how, ms: Date.now() - tappedAt, variant: SEND_VARIANT }, { beacon: how === 'blocked' })
        fireCartSent(store ? `Instacart · ${store}` : 'Instacart', estTotal)
        // Blocked inside an app's built-in browser (Nov 25 2026): explain and offer Safari/Chrome, or Instacart here.
        // onSent waits for their choice, so the button and this notice stay on screen.
        if (how === 'blocked' && inAppBrowserName(navigator.userAgent || '')) { setIabLink(data.link); return }
        onSent?.()
        // Blocked: open Instacart in this tab instead, so the tap still gets them there. Only runs when the new tab failed.
        if (how === 'blocked') window.location.href = data.link
      } else {
        setError('No shopping link returned. Please try again.')
      }
    } catch (err) {
      console.error('Error creating Instacart link:', err)
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <button data-track="instacart_button" data-track-variant={SEND_VARIANT}
        onClick={handleSendToInstacart}
        disabled={loading}
        style={{ backgroundColor: '#003D29', color: '#FAF1E5', height: '46px', paddingLeft: '18px', paddingRight: '18px' }}
        className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg whitespace-nowrap ${compact ? 'text-sm' : 'text-base'}`}
        aria-label={store ? `Save my ${store} list to Instacart` : 'Save my list to Instacart'}
      >
        {/* Official Instacart carrot mark (from Instacart logo kit), 22px tall */}
        <svg width="18" height="22" viewBox="0 0 42.3 52.9" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M36.4,8.6c-2.3,0-4,1-5.5,3.2l-4.4,6.4V0H15.9v18.2l-4.4-6.4C9.9,9.6,8.2,8.6,5.9,8.6C2.4,8.6,0,11.2,0,14.4c0,2.7,1.3,4.5,4,6.3l17.1,11l17.1-11c2.7-1.8,4-3.5,4-6.3C42.3,11.2,39.9,8.6,36.4,8.6z" fill="#0AAD0A" />
          <path d="M21.1,34.4c10.2,0,18.5,7.6,18.5,18.5h-37C2.6,42,11,34.4,21.1,34.4z" fill="#FF7009" />
        </svg>
        <span>{loading ? 'Saving your list…' : store ? `Save my ${store} list` : 'Save my list to Instacart'}</span>
      </button>

      {!compact && (
        <>
          <p className="text-sm text-foreground">You&apos;ll check prices and edit before you pay.</p>
          <p className="text-[11px] text-muted-foreground">Opens Instacart in a new tab. Powered by Instacart.</p>
        </>
      )}
      {/* One short line that opens on tap, so the warning doesn't sit above the list (Nov 25 2026). */}
      {!compact && limitedName && (
        <details className="text-[12px] text-amber-900">
          <summary className="cursor-pointer min-h-[44px] flex items-center underline underline-offset-2 decoration-amber-400">Shopping {limitedName}? Check items marked Close Match</summary>
          <p className="mt-1 text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            {limitedName} carries fewer brands, so Instacart swaps more items (e.g. queso fresco for cotija). Check anything marked <b>Close Match</b> and tap <b>Show alternatives</b> before checkout.
          </p>
        </details>
      )}

      {iabLink && (
        // In the pinned bar there's no room under the button: the notice floats just above the bar.
        <div className={compact ? 'fixed inset-x-3 bottom-24 z-50 mx-auto max-w-2xl shadow-xl rounded-xl' : ''}>
          <InAppBrowserNotice instacartLink={iabLink} onContinue={() => onSent?.()} />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

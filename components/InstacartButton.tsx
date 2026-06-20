'use client'

import { useState } from 'react'
import type { GroceryCategory, GroceryItem } from '@/types'

interface InstacartButtonProps {
  groceryList: Record<GroceryCategory, GroceryItem[]>
}

/**
 * Instacart "Shop ingredients" CTA.
 *
 * Built to the Instacart Developer Platform CTA design spec (Dark variant):
 *   - Pill button, height 46px, padding 16px / 18px
 *   - Background #003D29, foreground text #FAF1E5
 *   - Official full-color carrot logo (#FF7009 / #0AAD0A), 22px
 *   - Approved button copy: "Shop ingredients"
 * Docs: https://docs.instacart.com/developer_platform_api/guide/concepts/design/cta_design
 */
export default function InstacartButton({ groceryList }: InstacartButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSendToInstacart() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/instacart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groceryList }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Could not create your Instacart list. Please try again.')
        return
      }

      if (data.link) {
        if (data.fallback) {
          setError('Instacart had a hiccup — opening a search instead.')
        }
        window.open(data.link, '_blank', 'noopener,noreferrer')
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
      <button
        onClick={handleSendToInstacart}
        disabled={loading}
        style={{ backgroundColor: '#003D29', color: '#FAF1E5', height: '46px', paddingLeft: '18px', paddingRight: '18px' }}
        className="inline-flex items-center justify-center gap-2 rounded-full font-semibold text-base hover:opacity-90 disabled:opacity-50 transition-opacity shadow-lg"
        aria-label="Shop ingredients on Instacart"
      >
        {/* Official Instacart carrot mark — full-color (#FF7009 / #0AAD0A), 22px */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.6 18.4a2.6 2.6 0 0 0 3.68 0l8.06-8.06-3.68-3.68-8.06 8.06a2.6 2.6 0 0 0 0 3.68z" fill="#FF7009" />
          <path d="M14.2 3.1c1.6-1.2 3.6-1 4.9.3 1.3 1.3 1.5 3.3.3 4.9l-1.1 1.4-5.5-5.5 1.4-1.1z" fill="#0AAD0A" />
        </svg>
        <span>{loading ? 'Creating your list…' : 'Shop ingredients'}</span>
      </button>

      <p className="text-[11px] text-muted-foreground">
        Opens Instacart in a new tab. Powered by Instacart.
      </p>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

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
        {/* Official Instacart carrot mark (from Instacart logo kit), 22px tall */}
        <svg width="18" height="22" viewBox="0 0 42.3 52.9" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
          <path d="M36.4,8.6c-2.3,0-4,1-5.5,3.2l-4.4,6.4V0H15.9v18.2l-4.4-6.4C9.9,9.6,8.2,8.6,5.9,8.6C2.4,8.6,0,11.2,0,14.4c0,2.7,1.3,4.5,4,6.3l17.1,11l17.1-11c2.7-1.8,4-3.5,4-6.3C42.3,11.2,39.9,8.6,36.4,8.6z" fill="#0AAD0A" />
          <path d="M21.1,34.4c10.2,0,18.5,7.6,18.5,18.5h-37C2.6,42,11,34.4,21.1,34.4z" fill="#FF7009" />
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

'use client'

import { useState } from 'react'
import type { GroceryCategory, GroceryItem } from '@/types'

interface InstacartButtonProps {
  groceryList: Record<GroceryCategory, GroceryItem[]>
}

/**
 * Instacart "Shop with Instacart" button.
 *
 * Branding follows Instacart Developer Platform requirements:
 *  - Instacart carrot mark
 *  - Brand green (#43B02A)
 *  - Explicit "Get Recipe Ingredients" / "Get Ingredients" intent
 *
 * Docs: https://docs.instacart.com/developer_platform_api/guide/tutorials_and_guides/branding
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
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-[#43B02A] text-white font-semibold text-base hover:bg-[#3a9a24] disabled:opacity-50 transition-colors shadow-lg"
        aria-label="Get ingredients on Instacart"
      >
        {/* Instacart carrot mark (inline SVG so we don't have to ship an asset) */}
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19.6 4.4c-1.4-1.4-3.5-1.5-5-.4l-1.7 1.3 5.8 5.8 1.3-1.7c1.1-1.5 1-3.6-.4-5z"
            fill="#FF8200"
          />
          <path
            d="M12.4 6.4 4 12.8c-1.4 1-1.7 3-.5 4.4l3.3 3.3c1.4 1.2 3.4.9 4.4-.5l6.4-8.4-5.2-5.2z"
            fill="#FFFFFF"
          />
          <path d="M15 9l-6 4.5L10 15l6-4.5L15 9z" fill="#43B02A" />
        </svg>
        <span>{loading ? 'Creating your list…' : 'Get Ingredients on Instacart'}</span>
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

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AccountPage() {
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function redirectToPortal() {
      try {
        const res = await fetch('/api/stripe/customer-portal', { method: 'POST' })
        const data = await res.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          setError(data.error ?? 'Unable to open billing portal.')
        }
      } catch {
        setError('Network error. Please try again.')
      }
    }
    redirectToPortal()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" />
            </svg>
          </div>
          <p className="text-foreground font-semibold mb-2">Couldn&apos;t open billing portal</p>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-primary underline text-sm hover:no-underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">Opening billing portal&hellip;</p>
      </div>
    </div>
  )
}

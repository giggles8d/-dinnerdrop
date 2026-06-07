'use client'

import { useState } from 'react'

// Blog newsletter signup — "The Sunday Drop" (biweekly).
export default function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setStatus('sending')
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="border border-gray-200 rounded-xl p-6 text-center bg-[#fef9ee]">
        <p className="font-bold text-[#1a5c38]">You&apos;re in! 🎉</p>
        <p className="text-sm text-gray-500 mt-1">
          The Sunday Drop lands in your inbox every other Sunday.
        </p>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 rounded-xl p-6 text-center">
      <p className="font-bold text-[#1a5c38] mb-1">The Sunday Drop 🥕</p>
      <p className="text-sm text-gray-500 mb-4">
        5 dinner ideas + one smart grocery tip, every other Sunday. Free.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a5c38]"
        />
        <button
          type="submit"
          disabled={status === 'sending'}
          className="px-5 py-2 rounded-lg bg-[#1a5c38] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {status === 'sending' ? 'Joining…' : 'Join free'}
        </button>
      </form>
      {status === 'error' && (
        <p className="text-xs text-red-600 mt-2">Something went wrong — please try again.</p>
      )}
    </div>
  )
}

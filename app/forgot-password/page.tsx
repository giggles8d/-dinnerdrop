'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent('/reset-password')}`,
    })

    setLoading(false)
    if (resetError) {
      // Never reveal whether the email exists — show success either way (Supabase will silently
      // do nothing for non-existent emails). Only surface real errors (rate limit etc.).
      if (resetError.message.toLowerCase().includes('rate')) {
        setError('Too many attempts. Try again in a few minutes.')
        return
      }
      // For any other error, still show the generic success state to avoid leaking user info
    }
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-heading font-bold text-foreground">Reset your password</h1>
          <p className="mt-2 text-muted-foreground">
            Enter your email and we&apos;ll send you a link to set a new one.
          </p>
        </div>

        {submitted ? (
          <div className="space-y-4">
            <div className="bg-primary/10 text-foreground p-4 rounded-md">
              <p className="font-medium">📬 Check your email</p>
              <p className="text-sm text-muted-foreground mt-2">
                If an account exists for <strong>{email}</strong>, a password reset link is on its way.
                The link expires in 1 hour. (Also check your spam folder — it may land there.)
              </p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="text-primary hover:underline font-medium">
                Back to sign in
              </Link>
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Sending reset link...' : 'Send reset link'}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Remembered it?{' '}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

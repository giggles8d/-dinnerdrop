'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { AlertCircle, Clock, CheckCircle, CreditCard } from 'lucide-react'

interface Profile {
  subscription_status: string | null
  trial_ends_at: string | null
  full_name: string | null
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at, full_name')
        .eq('id', user.id)
        .single()

      setProfile(data as Profile)
      setLoading(false)

      // Auto-redirect active/past_due users straight to portal � same as before
      const status = data?.subscription_status
      if (status === 'active' || status === 'past_due') {
        openPortal()
      }
    }
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function openPortal() {
    setPortalLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/customer-portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error ?? 'Unable to open billing portal.')
        setPortalLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setPortalLoading(false)
    }
  }

  function getTrialDaysRemaining(): number {
    if (!profile?.trial_ends_at) return 7
    const ends = new Date(profile.trial_ends_at)
    const now = new Date()
    return Math.max(0, Math.ceil((ends.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading your account�</p>
        </div>
      </div>
    )
  }

  const status = profile?.subscription_status ?? 'free'
  const daysLeft = getTrialDaysRemaining()
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there'

  // active/past_due ? portal redirect is fired in useEffect; show spinner while it happens
  if (status === 'active' || status === 'past_due') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Opening billing portal�</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-lg">
        <div className="mb-8">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Account</p>
          <h1 className="text-3xl font-heading font-bold text-foreground">Hi, {firstName}</h1>
        </div>

        {error && (
          <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Trialing */}
        {status === 'trialing' && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f5ef' }}>
                <Clock className="w-5 h-5" style={{ color: '#1a5c38' }} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Beta trial active</p>
                <p className="text-xs text-muted-foreground">6 months free, then $9/month</p>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ backgroundColor: '#f0faf4', border: '1px solid #bbf7d0' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#1a5c38' }}>
                {daysLeft > 30
                  ? `${daysLeft} days remaining in your beta`
                  : daysLeft > 7
                  ? `${daysLeft} days left � you�re locked in!`
                  : daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left in your trial`
                  : 'Your trial ends today'}
              </p>
              <p className="text-xs" style={{ color: '#166534' }}>
                We�ll email you 7 days before billing starts. Cancel anytime.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                Unlimited weekly meal plans
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                One-tap grocery cart handoff
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                Budget optimization + pantry subtraction
              </div>
            </div>

            <div className="pt-2 border-t border-border">
              <button
                onClick={openPortal}
                disabled={portalLoading}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                {portalLoading ? 'Opening�' : 'Manage billing ?'}
              </button>
            </div>
          </div>
        )}

        {/* Free / no subscription */}
        {(status === 'free' || !status) && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Free plan</p>
                <p className="text-xs text-muted-foreground">1 meal plan per month</p>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-secondary border border-border">
              <p className="text-sm font-semibold text-foreground mb-1">
                ?? Beta spots still available
              </p>
              <p className="text-xs text-muted-foreground">
                First 100 families get 6 months completely free � no credit card required.
              </p>
            </div>

            <Link
              href="/subscribe?coupon=BETA100"
              className="block text-center px-4 py-3 rounded-xl text-primary-foreground font-semibold transition-colors"
              style={{ backgroundColor: '#1a5c38' }}
            >
              Claim 6 months free ?
            </Link>

            <p className="text-xs text-center text-muted-foreground">
              $0 today � No credit card � Cancel anytime
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ? Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

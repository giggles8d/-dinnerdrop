'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { isNativeApp } from '@/lib/native'
import DeleteAccount from '@/components/DeleteAccount'
import { AlertCircle, Clock, CheckCircle, CreditCard, LogOut } from 'lucide-react'

interface Profile {
  subscription_status: string | null
  trial_ends_at: string | null
  full_name: string | null
  is_beta_member: boolean | null
  family_until: string | null
  referral_code: string | null
}

export default function AccountPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [claimLoading, setClaimLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email ?? null)

      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_status, trial_ends_at, full_name, is_beta_member, family_until, referral_code')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Account profile load failed:', profileError)
        setError('We had trouble loading your plan details. Refresh to try again.')
      }
      setProfile((data as Profile) ?? null)
      setLoading(false)

      // Auto-redirect active/past_due users straight to portal — same as before
      const status = data?.subscription_status
      // Never bounce into Stripe from inside the iOS/Android app (guideline 3.1.1).
      if ((status === 'active' || status === 'past_due') && !isNativeApp()) {
        openPortal()
      }
    }
    loadProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  // 2026-10-16: the founding (free) offer is fulfilled. Free users start the
  // standard 14-day trial via Stripe Checkout — same route /subscribe uses.
  async function startTrial() {
    setClaimLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setError(data.error || 'Something went wrong starting your trial. Please try again.')
    } catch {
      setError('Something went wrong starting your trial. Please try again.')
    }
    setClaimLoading(false)
  }

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
          <p className="text-muted-foreground text-sm">Loading your account&hellip;</p>
        </div>
      </div>
    )
  }

  const status = profile?.subscription_status ?? 'free'
  const daysLeft = getTrialDaysRemaining()
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || 'there'
  const trialEndDate = profile?.trial_ends_at
    ? new Date(profile.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const isFoundingMember = profile?.is_beta_member === true
  const familyCreditUntil = profile?.family_until && new Date(profile.family_until) > new Date()
    ? new Date(profile.family_until).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  const inApp = isNativeApp()

  // active/past_due — portal redirect is fired in useEffect; show spinner while it happens
  if ((status === 'active' || status === 'past_due') && !inApp) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Opening billing portal&hellip;</p>
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
          {userEmail && (
            <p className="text-sm text-muted-foreground mt-1">
              Signed in as <span className="font-medium text-foreground">{userEmail}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-3 mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Native app: plan status only — nothing that sells or prices the subscription. */}
        {inApp && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f5ef' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#1a5c38' }} />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  {status === 'active' || status === 'trialing' || familyCreditUntil || isFoundingMember ? 'Family plan' : 'Free plan'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {familyCreditUntil ? `Family features are on through ${familyCreditUntil}.` : status === 'trialing' && trialEndDate ? `Trial through ${trialEndDate}.` : status === 'active' || isFoundingMember ? 'Family features are on.' : 'Weekly plans, grocery list and one-tap Instacart cart.'}
                </p>
              </div>
            </div>
            <DeleteAccount />
          </div>
        )}

        <div className={inApp ? 'hidden' : ''}>
        {/* Trialing */}
        {status === 'trialing' && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f5ef' }}>
                <Clock className="w-5 h-5" style={{ color: '#1a5c38' }} />
              </div>
              <div>
                <p className="font-semibold text-foreground">{isFoundingMember ? 'Family — free for your first year' : 'Family — free trial'}</p>
                <p className="text-xs text-muted-foreground">{isFoundingMember ? 'A thank-you for being one of the first families in. Then $4.99/month only if you keep it.' : '$4.99/month after your trial. Cancel anytime.'}</p>
              </div>
            </div>

            <div className="rounded-xl p-4" style={{ backgroundColor: '#f0faf4', border: '1px solid #bbf7d0' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: '#1a5c38' }}>
                {isFoundingMember
                  ? `Family is free through ${trialEndDate ?? 'October 18, 2027'}`
                  : daysLeft > 0
                    ? `${daysLeft} free day${daysLeft === 1 ? '' : 's'} left${trialEndDate ? ` · first charge on ${trialEndDate}` : ''}`
                    : 'Your free period ends today'}
              </p>
              <p className="text-xs" style={{ color: '#166534' }}>
                {isFoundingMember
                  ? 'Nothing to do and nothing to add. We email you well before the year is up, and you can cancel in one tap below.'
                  : 'We email you three days before any charge. Cancel in one tap below.'}
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
                {portalLoading ? 'Opening…' : 'Manage billing →'}
              </button>
            </div>
          </div>
        )}

        {/* Free + founding member — everything unlocked, nothing to claim */}
        {(status === 'free' || !status) && isFoundingMember && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e8f5ef' }}>
                <CheckCircle className="w-5 h-5" style={{ color: '#1a5c38' }} />
              </div>
              <div>
                <p className="font-semibold text-foreground">Family — free for your first year</p>
                <p className="text-xs text-muted-foreground">Through {trialEndDate ?? 'October 18, 2027'} · No card on file · A thank-you for being one of the first families in</p>
              </div>
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
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                Family texting, per-person profiles, text reminders, Kroger cart push, priority support
              </div>
            </div>
          </div>
        )}

        {familyCreditUntil && (
          <div className="bg-white rounded-2xl border border-primary/30 p-5">
            <p className="font-semibold text-foreground">Family credit through {familyCreditUntil}</p>
            <p className="text-xs text-muted-foreground mt-1">From a referral. Kroger cart push and family texting are on until then, no charge.</p>
          </div>
        )}

        {profile?.referral_code && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <p className="font-semibold text-foreground">Give a month, get a month</p>
            <p className="text-xs text-muted-foreground mt-1 mb-2">When a family you invite starts Family, you both get 30 days of Family free.</p>
            <code className="block text-xs bg-muted rounded-md px-3 py-2 break-all">https://www.dinnerdrop.app/start?ref={profile.referral_code}</code>
          </div>
        )}

        {/* Free / no subscription — claim in place, no signup round-trip */}
        {(status === 'free' || !status) && !isFoundingMember && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Free plan</p>
                <p className="text-xs text-muted-foreground">Unlimited weekly plans, grocery list, and one-tap Instacart cart</p>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-secondary border border-border">
              <p className="text-sm font-semibold text-foreground mb-1">
                Add the whole household with Family
              </p>
              <p className="text-xs text-muted-foreground">
                Family texting, per-person profiles, text reminders, Kroger cart push, priority support. $4.99/month or $39/year after a 14-day free trial. Nothing charged today — cancel anytime from this page.
              </p>
            </div>

            <button
              onClick={startTrial}
              disabled={claimLoading}
              className="block w-full text-center px-4 py-3 rounded-xl text-primary-foreground font-semibold transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#1a5c38' }}
            >
              {claimLoading ? 'Opening secure checkout…' : 'Try Family free for 14 days →'}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              $0 today · Payments by Stripe · Cancel anytime
            </p>
          </div>
        )}

        {/* Canceled subscription */}
        {status === 'canceled' && (
          <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Family canceled</p>
                <p className="text-xs text-muted-foreground">You&apos;re on the Free plan — planning and your Instacart cart still work</p>
              </div>
            </div>

            <div className="rounded-xl p-4 bg-secondary border border-border">
              <p className="text-sm font-semibold text-foreground mb-1">
                Want to come back?
              </p>
              <p className="text-xs text-muted-foreground">
                Restart Family anytime for the Kroger cart push, priority support, and new family features first.
              </p>
            </div>

            <Link
              href="/subscribe"
              className="block text-center px-4 py-3 rounded-xl text-primary-foreground font-semibold transition-colors"
              style={{ backgroundColor: '#1a5c38' }}
            >
              Restart Family →
            </Link>

            <p className="text-xs text-center text-muted-foreground">
              $4.99/month or $39/year · Cancel anytime
            </p>
          </div>
        )}

        </div>

        <div className="mt-6 flex items-center justify-center gap-6">
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to dashboard
          </Link>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

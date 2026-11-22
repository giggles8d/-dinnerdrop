'use client'

/**
 * The card ask when free Family days end (Nov 22 2026 review, Sarah approved: "14 days of Family free for everyone,
 * then ask for a card"). Before this, a family whose free days ran out saw only the generic "Try Family free"
 * banner, which never said their Family had ended or what stopped.
 *
 * Shows on the dashboard:
 *  - 'ending': free days end within 3 days (matches the 3-days-before email, lib/trial-ending.ts)
 *  - 'ended':  free days have ended and there's no card on file
 * "Not now" hides it for 7 days on this device. Hidden in the native app (it can't open /subscribe), like the
 * dashboard's other upgrade banner. Mount it where the dashboard shows that banner, and don't show both at once:
 *
 *   <FamilyEndedBanner familyUntil={profile.family_until} subscriptionStatus={subscriptionStatus} isFoundingMember={isFoundingMember} />
 *   {!isSubscribed && subscriptionStatus !== 'past_due' && planCount > 0 && !familyEndedBannerMode({ familyUntil, subscriptionStatus, isFoundingMember }) && ( ...existing banner... )}
 */
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, X } from 'lucide-react'
import { familyState } from '@/lib/access'

const DISMISS_KEY = 'dd_family_ended_dismissed'
const COOLDOWN_MS = 7 * 86400000
const SOON_MS = 3 * 86400000
// Same as lib/stripe FAMILY_PRICING (not imported: that file pulls the Stripe SDK into the browser bundle).
const PRICE = '$4.99 a month or $39 a year'

export interface FamilyEndedBannerProps {
  familyUntil: string | null | undefined
  subscriptionStatus: string | null | undefined
  isFoundingMember?: boolean | null
}

/** Which version would show (ignoring a "Not now" dismissal), so the dashboard can hide its generic banner. */
export function familyEndedBannerMode(p: FamilyEndedBannerProps, now = Date.now()): 'ending' | 'ended' | null {
  const state = familyState({ subscription_status: p.subscriptionStatus, is_beta_member: p.isFoundingMember, family_until: p.familyUntil ?? null }, new Date(now))
  if (state === 'free_days_ended') return 'ended'
  if (state === 'free_days' && p.familyUntil && Date.parse(p.familyUntil) - now <= SOON_MS) return 'ending'
  return null
}

function dateLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function FamilyEndedBanner({ familyUntil, subscriptionStatus, isFoundingMember }: FamilyEndedBannerProps) {
  const [mode, setMode] = useState<'ending' | 'ended' | null>(null)
  useEffect(() => {
    let dismissedAt = 0
    try { dismissedAt = Number(window.localStorage.getItem(DISMISS_KEY) || 0) } catch { /* storage blocked: show it */ }
    if (Date.now() - dismissedAt < COOLDOWN_MS) { setMode(null); return }
    setMode(familyEndedBannerMode({ familyUntil, subscriptionStatus, isFoundingMember }))
  }, [familyUntil, subscriptionStatus, isFoundingMember])
  if (!mode || !familyUntil) return null

  const price = PRICE
  const date = dateLabel(familyUntil)
  const title = mode === 'ending' ? `Your free Family days end ${date}` : 'Your free Family days have ended'
  const body = mode === 'ending'
    ? `Planning and your grocery cart stay free. Add a card to keep family texting, a profile for each person and cook-night reminders. Family is ${price}.`
    : `You're on the free plan: weekly dinners, the grocery list, and Instacart and Walmart carts. Family texting, profiles for each person, cook-night reminders and the Kroger cart push are off. Add a card to turn them back on. Family is ${price}.`
  const cta = mode === 'ending' ? 'Keep Family' : 'Add a card, keep Family'

  function dismiss() {
    try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* fine */ }
    setMode(null)
  }

  return (
    <div className="web-only relative mb-6 px-5 py-4 rounded-xl bg-foreground text-primary-foreground">
      <button type="button" onClick={dismiss} aria-label="Not now" className="absolute top-3 right-3 p-1 text-primary-foreground/60 hover:text-primary-foreground">
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <Sparkles className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-primary-foreground/70 mt-1 leading-relaxed">{body}</p>
          <div className="flex flex-wrap items-center gap-4 mt-3">
            <Link href={`/subscribe?from=${mode === 'ending' ? 'family_ending' : 'family_ended'}`} className="text-xs font-semibold text-accent underline underline-offset-2">
              {cta} &rarr;
            </Link>
            <button type="button" onClick={dismiss} className="text-xs text-primary-foreground/60 hover:text-primary-foreground">
              Not now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

# DinnerDrop — Conversion Tracking Setup Plan
**Day 2, Hour 11 | Generated: 2026-05-04**
**Status: READY TO IMPLEMENT — blocked on Sarah's Google Ads + Meta Pixel IDs**

---

## Overview

This document defines the full conversion tracking strategy for DinnerDrop — covering
Google Ads, Meta Pixel, and the implementation plan for all three conversion events
in the Next.js 14 App Router codebase.

**Implementation approach: Direct gtag.js + fbq.js — no GTM required**
Rationale: DinnerDrop has no existing tag infrastructure. GTM adds unnecessary
complexity for a single-app launch. Direct Script tags in layout.tsx plus a
ConversionTracker client component gives full control with fewer failure points.

---

## Conversion Funnel Map

```
[User lands on /beta]
       |
[Clicks "Join Beta" → /subscribe?coupon=BETA100]
       |
[Stripe Checkout session created] ← checkout_initiated (micro-conversion)
       |
[Stripe success → /dashboard?subscribed=true]
       |
[trial_start fires here] ← PRIMARY CONVERSION (Google Ads + Meta Pixel)
       |
[7 days later — trial expires, first $9 charge]
       |
[Stripe webhook: customer.subscription.updated → status=active]
       |
[paid_conversion fires here] ← HIGH-VALUE (server-side CAPI, Week 2)
```

---

## Event Definitions

### Event 1: trial_start (PRIMARY — fire on all ad platforms)
- **When:** User lands on `/dashboard?subscribed=true` (Stripe success redirect)
- **Where:** `app/(app)/dashboard/page.tsx` — existing `useEffect` on `searchParams`
- **Value:** $0 (beta users pay nothing for 6 months; trains Google/Meta on converters)
- **Google Ads conversion name:** `beta_signup`
- **Meta Pixel event:** `Purchase` with `{value: 0, currency: 'USD'}`
- **Why this trigger:** The dashboard already detects `?subscribed=true` and
  refreshes subscription status. ConversionTracker piggybacks on the same hook
  with zero new complexity.


### Event 2: checkout_initiated (MICRO — optional, improves Meta learning)
- **When:** `/api/stripe/create-checkout-session` returns a Stripe URL successfully
- **Where:** Client-side in `app/subscribe/page.tsx`
- **Google Ads:** Do NOT fire (wastes conversion budget on non-completions)
- **Meta Pixel event:** `InitiateCheckout` — helps Meta optimize for checkout starters
- **Priority:** Low — implement only after `trial_start` is confirmed working

### Event 3: paid_conversion (HIGH-VALUE — server-side only)
- **When:** Stripe webhook fires `customer.subscription.updated` with `status = 'active'`
  (this is the post-trial first-charge event, NOT the trial start)
- **Where:** `app/api/stripe/webhook/route.ts`
- **Method:** Google Ads Conversion API + Meta CAPI (both server-side)
- **Value:** $9.00 (first real charge)
- **Priority:** Week 2 — requires CAPI credentials beyond just a Pixel ID

---

## Webhook Bug — Fix Required (Separate Code Task)

**File:** `app/api/stripe/webhook/route.ts`

**Current behavior (broken):**
`checkout.session.completed` sets `subscription_status = 'active'`

**Correct behavior:**
- `checkout.session.completed` → set `'trialing'` (trial has started, no payment yet)
- `customer.subscription.updated` → set `'active'` when Stripe status = active (post-trial)
- `customer.subscription.deleted` → set `'canceled'` (already correct)

**Impact of bug:**
1. All beta users appear as `'active'` from day 1 in Supabase
2. The upgrade banner (`!isSubscribed && planCount > 0`) never shows to trial users
3. Trial-to-paid funnel tracking is impossible — can't distinguish trial from paid

**Fix for `checkout.session.completed` handler:**
```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  const customerId = session.customer as string
  // subscription field is set = trial; null = immediate payment
  const newStatus = session.subscription ? 'trialing' : 'active'
  if (customerId) {
    await supabase
      .from('profiles')
      .update({ subscription_status: newStatus })
      .eq('stripe_customer_id', customerId)
  }
  break
}
```

This is a non-breaking fix — deploy as a standalone commit.

---

## Implementation: Step 1 — Analytics Components

Create two files in `components/`:

### components/Analytics.tsx (server component — reads env vars safely)
```tsx
import AnalyticsClient from './AnalyticsClient'

export default function Analytics() {
  return (
    <AnalyticsClient
      googleAdsId={process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? ''}
      googleAdsLabel={process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL ?? ''}
      metaPixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID ?? ''}
    />
  )
}
```


### components/AnalyticsClient.tsx (client component — loads scripts)
```tsx
'use client'

import Script from 'next/script'

interface Props {
  googleAdsId: string
  googleAdsLabel: string
  metaPixelId: string
}

export default function AnalyticsClient({ googleAdsId, googleAdsLabel, metaPixelId }: Props) {
  if (!googleAdsId && !metaPixelId) return null

  return (
    <>
      {googleAdsId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`}
            strategy="afterInteractive"
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer=window.dataLayer||[];
                function gtag(){dataLayer.push(arguments);}
                gtag('js',new Date());
                gtag('config','${googleAdsId}');
              `,
            }}
          />
        </>
      )}
      {metaPixelId && (
        <Script
          id="meta-pixel"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
              n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
              s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)
              }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
              fbq('init','${metaPixelId}');
              fbq('track','PageView');
            `,
          }}
        />
      )}
    </>
  )
}
```

**Why server + client split?**
Next.js 14 App Router does not interpolate `process.env` inside `<Script>` tags
at runtime in client components. Passing env vars as props from a server component
is the correct pattern — the server reads the env vars at request time and passes
the resolved strings to the client component.

---

## Implementation: Step 2 — ConversionTracker Component

### components/ConversionTracker.tsx
```tsx
'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void
    fbq: (...args: unknown[]) => void
  }
}

interface Props {
  event: 'trial_start' | 'initiate_checkout'
}

export default function ConversionTracker({ event }: Props) {
  useEffect(() => {
    if (event === 'trial_start') {
      // Google Ads — fires beta_signup conversion
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: `${process.env.NEXT_PUBLIC_GOOGLE_ADS_ID}/${process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL}`,
          value: 0.0,
          currency: 'USD',
        })
      }
      // Meta Pixel — Purchase event (value=0 signals beta signup intent)
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Purchase', {
          value: 0,
          currency: 'USD',
          content_name: 'DinnerDrop Beta',
          content_type: 'product',
        })
      }
    }

    if (event === 'initiate_checkout') {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'InitiateCheckout')
      }
    }
  }, [event])

  return null
}
```


---

## Implementation: Step 3 — Wire into layout.tsx

**File:** `app/layout.tsx`

Add `<Analytics />` to the root layout inside `<body>`. This loads the scripts
on every page with `afterInteractive` priority (after hydration — does not block LCP).

```tsx
import Analytics from '@/components/Analytics'

// Inside RootLayout return:
<html lang="en">
  <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
  </head>
  <body className="antialiased">
    <Analytics />
    {children}
  </body>
</html>
```

---

## Implementation: Step 4 — Wire ConversionTracker into dashboard/page.tsx

**File:** `app/(app)/dashboard/page.tsx`

The existing `useEffect` already watches `searchParams.get('subscribed') === 'true'`.
Add `ConversionTracker` as a conditional render — it fires once on landing from Stripe,
never re-fires because the `?subscribed=true` param disappears on any subsequent navigation.

```tsx
import ConversionTracker from '@/components/ConversionTracker'

// At the TOP of DashboardContent's return statement, before other JSX:
{searchParams.get('subscribed') === 'true' && (
  <ConversionTracker event="trial_start" />
)}
```

---

## Environment Variables Required from Sarah

| Variable | Where to find it | Needed before... |
|---|---|---|
| `NEXT_PUBLIC_GOOGLE_ADS_ID` | Google Ads → Tools → Conversions → Tag details (format: AW-XXXXXXXXX) | Google Ads go-live |
| `NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL` | Same page — the string after the `/` in the send_to value | Google Ads go-live |
| `NEXT_PUBLIC_META_PIXEL_ID` | Meta BM → Events Manager → Pixels → your pixel → Settings | Meta ads go-live |

**How to add to Vercel:**
1. Go to https://vercel.com → DinnerDrop project → Settings → Environment Variables
2. Add each variable with Value = the ID string, Environment = Production + Preview
3. Click Save — Vercel auto-triggers a redeploy

**Local testing:** Also add all three to `.env.local` in the repo root (already in .gitignore).

---

## Verification Steps (after IDs added and code deployed)

### Google Ads Verification
1. Install "Google Tag Assistant" Chrome extension
2. Navigate to https://dinnerdrop.app
3. Confirm `AW-XXXXXXXXX` tag fires on every page (PageView)
4. Navigate to https://dinnerdrop.app/dashboard?subscribed=true
5. Confirm conversion event fires in Tag Assistant output

### Meta Pixel Verification
1. Install "Meta Pixel Helper" Chrome extension
2. Navigate to https://dinnerdrop.app
3. Confirm `PageView` fires on load
4. Navigate to https://dinnerdrop.app/dashboard?subscribed=true
5. Confirm `Purchase` event fires (value=0 expected)

### End-to-End Stripe Test
1. Use Stripe test card: 4242 4242 4242 4242 / any future expiry / any CVC
2. Complete checkout with coupon BETA100 (once Sarah creates it in Stripe)
3. Confirm redirect lands on `/dashboard?subscribed=true`
4. Confirm both Google and Meta pixels fire in browser extensions
5. Confirm Supabase `profiles.subscription_status` = `'trialing'` (after webhook bug fix)

---

## Phase 2: Server-Side Conversion API (Week 2)

Once 10+ paid conversions occur (post-trial first charge), add server-side tracking
for higher fidelity data and iOS-privacy resilience:

### Google Ads Conversion API
- **Trigger:** `customer.subscription.updated` webhook → status=active
- **Requires:** gclid (Google Click ID) — store at Stripe checkout creation time
  by adding `client_reference_id: gclid` to checkout session params
- **Package:** `google-ads-api` npm package
- **Value:** 9.00 USD

### Meta Conversions API (CAPI)
- **Trigger:** Same `customer.subscription.updated` → active
- **Requires:** `access_token` from Meta BM → Events Manager → Settings
- **Package:** `facebook-nodejs-business-sdk` npm package
- **Deduplication:** Generate a UUID at checkout, pass as `eventID` to both
  the client-side `fbq('track', 'Purchase', {...}, {eventID: uuid})` call
  and the server-side CAPI event — Meta uses this to deduplicate
- **Value:** 9.00 USD, currency: USD

Both require additional credentials from Sarah. Document as a separate implementation
task when first paid conversion occurs (estimated Day 14+).

---

## Summary Table

| Task | File | Status | Blocker |
|---|---|---|---|
| Analytics server component | components/Analytics.tsx | Code spec complete | Google/Meta IDs |
| AnalyticsClient component | components/AnalyticsClient.tsx | Code spec complete | IDs (env vars) |
| ConversionTracker component | components/ConversionTracker.tsx | Code spec complete | IDs (for testing) |
| Wire Analytics into layout | app/layout.tsx | Code spec complete | Nothing (can ship now, graceful fallback if IDs absent) |
| Wire ConversionTracker into dashboard | app/(app)/dashboard/page.tsx | Code spec complete | Nothing |
| Webhook bug fix (trialing vs active) | app/api/stripe/webhook/route.ts | Separate code task | Nothing — ship now |
| InitiateCheckout (Meta) | app/subscribe/page.tsx | Phase 2 | Pixel ID |
| Server-side CAPI (Google + Meta) | app/api/stripe/webhook/route.ts | Week 2 | CAPI creds + 10+ conversions |

**Bottom line:** Cowork can implement the full client-side tracking stack (Steps 1–4)
in a single 20-minute code session. The implementation is non-breaking — if env vars
are absent, the Analytics component returns null and no scripts load. Once Sarah
provides the three IDs and adds them to Vercel, tracking goes live on the next deploy.

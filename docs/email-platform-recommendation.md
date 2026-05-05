# DinnerDrop — Email Platform Recommendation

**Task:** Day 2 Hour 19 — Choose and specify email platform for trial-to-paid sequence
**Date:** 2026-05-04
**Status:** DECISION MADE — Resend

---

## The Decision: Resend

**Resend** is the correct choice for DinnerDrop. No other evaluation is needed.

Reasoning: DinnerDrop sends event-triggered transactional emails from a Next.js + Supabase codebase.
Volume is low (100 beta users x 3 emails = 300 emails/month at launch). The team is a single developer
building in TypeScript. Resend is the only major email API built specifically for this stack — it has
official Supabase and Vercel integrations, ships a React Email SDK so templates live as `.tsx` files in
the repo, and the free tier (3,000 emails/month) covers all of beta and early growth at zero cost.

---

## Platform Comparison (2026 data)

| Platform | Free Tier | Paid Entry | Pricing Model | Supabase Integration | Next.js 14 | Verdict |
|---|---|---|---|---|---|---|
| **Resend** | 3,000 emails/mo, 100/day | $20/mo (50k emails) | Per email sent | Official partner | App Router native | **PICK THIS** |
| Loops.so | 4,000 sends/mo, 1,000 contacts | $49/mo (5k contacts) | Per contact | Via API | Yes | Overkill — marketing SaaS tool |
| Postmark | 100 emails/mo (dev only) | $15/mo (10k emails) | Per email sent | No official integration | Yes | Tiny free tier, wrong fit |
| Mailchimp | 500 contacts, 1k emails/mo | $13/mo | Per contact | No | REST API only | Marketing-first, wrong category |
| ConvertKit | 10k subscribers free | $25/mo | Per subscriber | No | REST API only | Creator/newsletter tool |

### Why Not Loops.so

Loops is the second-best developer-focused option. At 5,000 beta users it would make sense
(contact-based pricing becomes cheaper than per-send at high automation volume). At 100 beta users,
Resend at free tier vs Loops at $49/month = $49/month wasted. Re-evaluate Loops at 2,000+ active trial users.

### Why Not Postmark

Postmark deliverability is excellent, but the 100 email/month free tier is unusable for testing,
and there is no official Supabase integration. Resend matches deliverability for transactional at this scale.

---

## Cost Projection

| Month | Beta Users | Emails Sent | Resend Cost |
|---|---|---|---|
| May 2026 | 0–100 | 0–300 | **Free** |
| Jun 2026 | 0–100 | 0–300 | **Free** |
| Month 6 (convert) | ~50 paid | ~150 | **Free** |
| Growth (1,000 users) | ~1,000 | ~3,000 | **Free tier limit** |
| Growth (2,000 users) | ~2,000 | ~6,000 | **$20/month** |

Resend stays free through all of beta. Upgrade to Pro ($20/month) only when active trial users exceed ~1,000.

---

## Implementation Plan

### Step 1 — Sarah: Create Resend Account (5 minutes, auth gate)

1. Go to **https://resend.com** — Sign up with info@dinnerdrop.app
2. Verify email
3. Go to **API Keys** — Create key — name it `dinnerdrop-production`
4. Copy the key (starts with `re_`)
5. Go to Vercel Dashboard — dinnerdrop project — Settings — Environment Variables
6. Add: `RESEND_API_KEY` = the key (all environments)
7. Add: `RESEND_FROM_EMAIL` = `DinnerDrop <info@dinnerdrop.app>` (all environments)
8. In Resend dashboard: go to **Domains** — Add `dinnerdrop.app` — follow DNS steps (adds 2 TXT records in Cloudflare)

That is the only thing Sarah must do. Everything below is Cowork's job once the key is in Vercel.

---

### Step 2 — Cowork: Install Package

```bash
npm install resend @react-email/components
```

---

### Step 3 — Cowork: Email Templates

Create `emails/` directory at repo root with 3 template files:

- `emails/TrialDay3.tsx` — "How are your dinners going?" (Email 1 from email-sequence-v1.md)
- `emails/TrialDay6.tsx` — "One day left in your free trial" (Email 2)
- `emails/TrialDay7.tsx` — "Your DinnerDrop trial ends tonight" (Email 3)

Template structure (same pattern for all 3):

```tsx
import {
  Html, Head, Body, Container, Heading, Text, Button, Hr, Section
} from '@react-email/components'

interface TrialDay3Props {
  firstName: string
  unsubscribeUrl: string
}

export default function TrialDay3({ firstName, unsubscribeUrl }: TrialDay3Props) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: '#f9fafb', fontFamily: 'Arial, sans-serif' }}>
        <Container style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
          <Section style={{ backgroundColor: '#1a5c38', padding: '20px', borderRadius: '8px 8px 0 0' }}>
            <Heading style={{ color: '#ffffff', margin: 0, fontSize: '22px' }}>DinnerDrop</Heading>
          </Section>
          <Section style={{ backgroundColor: '#ffffff', padding: '32px', borderRadius: '0 0 8px 8px' }}>
            <Text>Hi {firstName},</Text>
            {/* Full copy from email-sequence-v1.md Email 1 */}
            <Button
              href="https://dinnerdrop.app/subscribe?coupon=BETA100"
              style={{ backgroundColor: '#1a5c38', color: '#ffffff', padding: '12px 24px',
                       borderRadius: '6px', textDecoration: 'none' }}>
              Keep my DinnerDrop access
            </Button>
            <Hr />
            <Text style={{ fontSize: '12px', color: '#9ca3af' }}>
              <a href={unsubscribeUrl}>Unsubscribe</a> · DinnerDrop · info@dinnerdrop.app
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

---

### Step 4 — Cowork: Email Send API Route

Create `app/api/email/send-trial/route.ts`:

```typescript
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { render } from '@react-email/render'
import TrialDay3 from '@/emails/TrialDay3'
import TrialDay6 from '@/emails/TrialDay6'
import TrialDay7 from '@/emails/TrialDay7'

const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_CONFIG = {
  1: { subject: 'How are your dinners going this week?', Template: TrialDay3 },
  2: { subject: 'One day left in your free trial', Template: TrialDay6 },
  3: { subject: 'Your DinnerDrop trial ends tonight', Template: TrialDay7 },
} as const

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-cron-secret')
  if (authHeader !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, userEmail, firstName, emailNumber } = await request.json()

  if (!userId || !userEmail || !emailNumber || !(emailNumber in EMAIL_CONFIG)) {
    return NextResponse.json({ error: 'Invalid params' }, { status: 400 })
  }

  const config = EMAIL_CONFIG[emailNumber as keyof typeof EMAIL_CONFIG]
  const unsubscribeUrl = `https://dinnerdrop.app/unsubscribe?uid=${userId}`

  const html = await render(
    config.Template({ firstName: firstName || 'there', unsubscribeUrl })
  )

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'DinnerDrop <info@dinnerdrop.app>',
    to: userEmail,
    subject: config.subject,
    html,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error }, { status: 500 })
  }

  return NextResponse.json({ success: true, emailId: data?.id })
}
```

---

### Step 5 — Cowork: Daily Cron Route

Create `app/api/cron/email-sequences/route.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Called by Vercel Cron daily at 10:00 AM EST
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const results = []

  for (const [daysAgo, emailNumber] of [[3, 1], [6, 2], [7, 3]] as const) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() - daysAgo)
    const dateStr = targetDate.toISOString().split('T')[0]

    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, first_name, trial_starts_at, email_sequence_sent')
      .eq('subscription_status', 'trialing')
      .gte('trial_starts_at', `${dateStr}T00:00:00Z`)
      .lt('trial_starts_at', `${dateStr}T23:59:59Z`)

    if (error) { console.error(`Day-${daysAgo} query error:`, error); continue }

    for (const user of (users || [])) {
      const sentEmails: number[] = user.email_sequence_sent || []
      if (sentEmails.includes(emailNumber)) continue

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/email/send-trial`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.CRON_SECRET! },
          body: JSON.stringify({ userId: user.id, userEmail: user.email,
                                 firstName: user.first_name, emailNumber }),
        }
      )

      if (res.ok) {
        await supabase.from('profiles')
          .update({ email_sequence_sent: [...sentEmails, emailNumber] })
          .eq('id', user.id)
        results.push({ userId: user.id, emailNumber, status: 'sent' })
      } else {
        results.push({ userId: user.id, emailNumber, status: 'failed' })
      }
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
```

---

### Step 6 — Cowork: Vercel Cron Config

Add `vercel.json` to repo root (create if missing):

```json
{
  "crons": [
    {
      "path": "/api/cron/email-sequences",
      "schedule": "0 14 * * *"
    }
  ]
}
```

`0 14 * * *` = 10:00 AM EST (UTC-4) daily.

---

### Step 7 — Supabase Migration

Run this SQL migration (Cowork adds to `supabase/migrations/`):

```sql
-- Add email sequence tracking to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trial_starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sequence_sent INTEGER[] DEFAULT '{}';

-- Backfill trial_starts_at from created_at for existing trial users
UPDATE profiles
SET trial_starts_at = created_at
WHERE subscription_status = 'trialing'
  AND trial_starts_at IS NULL;
```

---

### Step 8 — Required Environment Variables

| Variable | Source | Notes |
|---|---|---|
| `RESEND_API_KEY` | Resend dashboard | Sarah must create account and add to Vercel |
| `RESEND_FROM_EMAIL` | Set manually | `DinnerDrop <info@dinnerdrop.app>` — after domain verified |
| `CRON_SECRET` | Generate: `openssl rand -hex 32` | Add to Vercel; secures cron route |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Settings > API | May already be in Vercel env |
| `NEXT_PUBLIC_SITE_URL` | Set manually | `https://dinnerdrop.app` |

---

## Full Launch Sequence

1. **Sarah** creates Resend account + adds RESEND_API_KEY to Vercel (5 min — auth gate)
2. **Cowork** installs `resend` + `@react-email/components` packages
3. **Cowork** creates `emails/TrialDay3.tsx`, `TrialDay6.tsx`, `TrialDay7.tsx` from email-sequence-v1.md copy
4. **Cowork** creates `app/api/email/send-trial/route.ts`
5. **Cowork** creates `app/api/cron/email-sequences/route.ts`
6. **Cowork** adds `vercel.json` with cron schedule
7. **Cowork** adds Supabase migration for new columns
8. **Cowork** runs `next build` — commit — push
9. **Sarah** verifies dinnerdrop.app domain in Resend dashboard (adds 2 TXT records to Cloudflare — guided in Resend UI)
10. First emails fire next morning at 10 AM for any users in day 3, 6, or 7 of trial

---

## Day 2 Hour 20 Preview

Next run implements the Resend integration code (Steps 2–8 above). All code can be written now.
The email route will return 500 until RESEND_API_KEY is in Vercel — but deploy and code will be ready.

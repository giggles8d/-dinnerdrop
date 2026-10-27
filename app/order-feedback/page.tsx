import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Thanks — DinnerDrop', robots: { index: false } }

const COPY: Record<string, { title: string; body: string; cta: string; href: string }> = {
  ordered: {
    title: 'Glad it worked!',
    body: 'One more step makes next week better: upload a photo of your receipt. DinnerDrop learns your real prices and what was out of stock, and anything that didn’t come goes back on next week’s list.',
    cta: 'Upload my receipt',
    href: '/grocery-list#receipt-upload',
  },
  pricey: {
    title: 'Thanks for telling us',
    body: 'Lower your dinner budget in Settings and next week’s dinners will be planned to cost less. You can also swap any dinner for a cheaper one before you send the list.',
    cta: 'Change my budget',
    href: '/settings',
  },
  missing: {
    title: 'Sorry about that',
    body: 'Reply to the email and tell us what was missing or wrong. We read every reply and use it to fix the list. If you upload your receipt, DinnerDrop puts the missing items back on next week’s list for you.',
    cta: 'Upload my receipt',
    href: '/grocery-list#receipt-upload',
  },
  not_yet: {
    title: 'No problem',
    body: 'Your list is saved. Send it to your cart whenever you’re ready, in one tap.',
    cta: 'Go to my list',
    href: '/grocery-list',
  },
}

export default function OrderFeedbackPage({ searchParams }: { searchParams: { a?: string } }) {
  const c = COPY[searchParams.a ?? ''] ?? { title: 'Thanks!', body: 'Your answer helps us make next week’s list better.', cta: 'Go to DinnerDrop', href: '/dashboard' }
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-6 text-center">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">DinnerDrop</p>
        <h1 className="text-2xl font-bold mb-3">{c.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{c.body}</p>
        <Link href={c.href} className="inline-block rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">{c.cta}</Link>
      </div>
    </main>
  )
}

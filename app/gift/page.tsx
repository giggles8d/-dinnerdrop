import type { Metadata } from 'next'
import PublicHeader from '@/components/site/PublicHeader'
import GiftForm from './GiftForm'

const title = 'Give the Gift of Dinner, Handled — DinnerDrop Gift Subscriptions'
const description = 'Give a busy family months of planned weeknight dinners: 5 dinners a week for their family and budget, one grocery list, one tap to Instacart. No card needed for them.'

export const metadata: Metadata = {
  title, description,
  openGraph: { title, description, url: 'https://dinnerdrop.app/gift', siteName: 'DinnerDrop', type: 'website' },
  alternates: { canonical: 'https://dinnerdrop.app/gift' },
}

export default function GiftPage({ searchParams }: { searchParams: { canceled?: string } }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader active="gift" />
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Gift DinnerDrop 🎁</p>
        <h1 className="text-3xl sm:text-5xl font-heading font-bold text-foreground leading-tight mb-4">Give a family their weeknights back</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          For the new parents, the friend who just started back at work, or the family that&apos;s always asking &ldquo;what&apos;s for dinner?&rdquo;
          DinnerDrop Family plans 5 dinners a week for their family and budget, builds one grocery list, and sends it to their Instacart cart in one tap.
          It starts when they sign up — no card needed on their end, nothing to cancel.
        </p>
        {searchParams.canceled && <p className="mb-6 text-sm rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900">Checkout was canceled — nothing was charged. Your details are still below.</p>}
        <GiftForm />
        <section className="mt-12 grid sm:grid-cols-3 gap-4 text-sm">
          {[
            ['What they get', 'Family plan: per-person preferences, family texting & voting, Kroger cart push, reminders, cook mode — on top of the free planner.'],
            ['How it works', 'You get a gift code and a link right away (we can email it to them too). They sign up with the link and the months are added.'],
            ['Already a member?', 'If they already use DinnerDrop for free, the gift adds Family months to their account.'],
          ].map(([h, t]) => (
            <div key={h} className="rounded-xl border border-border p-4"><p className="font-semibold text-foreground mb-1">{h}</p><p className="text-muted-foreground">{t}</p></div>
          ))}
        </section>
      </main>
    </div>
  )
}

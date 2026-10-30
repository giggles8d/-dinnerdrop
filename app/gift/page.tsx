import type { Metadata } from 'next'
import PublicHeader from '@/components/site/PublicHeader'
import GiftForm from './GiftForm'

const title = 'Give the Gift of Dinner, Handled — DinnerDrop Gift Subscriptions'
const description = 'Give a busy family months of planned weeknight dinners: 5 dinners a week for their family and budget, one grocery list, one tap to Instacart.'

export const metadata: Metadata = {
  title, description,
  openGraph: { title, description, url: 'https://www.dinnerdrop.app/gift', siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png'] },
  alternates: { canonical: 'https://www.dinnerdrop.app/gift' },
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

        <section className="mt-12 space-y-8 text-sm text-muted-foreground leading-relaxed max-w-2xl">
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Who a DinnerDrop gift is for</h2>
            <p>New parents who haven&apos;t cooked a real dinner in weeks. A friend going back to work after leave. Your own kids setting up their first apartment. Grandparents who still cook for the whole family on Sundays. Anyone whose evenings are spent deciding what to eat instead of eating.</p>
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">What&apos;s included</h2>
            <p>Every week, DinnerDrop plans five weeknight dinners around their household: how many people, what they like, what they won&apos;t touch, allergies, cook time and a weekly budget. It merges the ingredients into one grocery list and sends that list to their Instacart cart in a single tap, or straight into a Kroger cart. The Family plan adds per-person preferences, texting the week&apos;s options to the family and letting everyone vote, reminders, cook mode and a printable fridge sheet.</p>
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">How gifting works</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Choose 3, 6 or 12 months above and pay once. There is no renewal and nothing for them to cancel.</li>
              <li>You get a gift code and a sign-up link right away. We can email it to them right after checkout, or send it to you with a printable card to hand over yourself.</li>
              <li>They sign up with the link (no card needed) and the months are added. If they already use DinnerDrop, the months attach to their account.</li>
            </ol>
          </div>
          <div>
            <h2 className="text-xl font-heading font-bold text-foreground mb-2">Common questions</h2>
            <p className="mb-2"><span className="font-semibold text-foreground">Does the gift cover groceries?</span> No. DinnerDrop plans the week and fills the cart; they pay the store on Instacart or Kroger as usual.</p>
            <p className="mb-2"><span className="font-semibold text-foreground">Can I gift someone outside the US?</span> Instacart and Kroger are US services, so the grocery handoff works in the US only. The planner itself works anywhere.</p>
            <p><span className="font-semibold text-foreground">Something go wrong?</span> Write to <a href="mailto:sarah@dinnerdrop.app" className="underline">sarah@dinnerdrop.app</a> — Sarah, the founder, reads every message.</p>
          </div>
        </section>
      </main>
    </div>
  )
}

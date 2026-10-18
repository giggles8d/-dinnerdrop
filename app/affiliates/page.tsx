import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import AffiliateForm from './AffiliateForm'

export const metadata: Metadata = {
  title: 'DinnerDrop Affiliate Program — earn 30% recommending a dinner planner parents keep',
  description: 'Creators, bloggers and newsletter writers: earn 30% of the first year of every Family subscription you refer. 60-day cookie, monthly payouts, a free product to recommend.',
  alternates: { canonical: 'https://www.dinnerdrop.app/affiliates' },
  openGraph: { title: 'DinnerDrop Affiliate Program', description: 'Earn 30% of the first year of every Family subscription you refer.', url: 'https://www.dinnerdrop.app/affiliates', siteName: 'DinnerDrop', type: 'website' },
}

const TERMS = [
  ['30% for a year', 'Of every Family subscription you send ($4.99/mo or $39/yr), for the first 12 months of that subscription.'],
  ['60-day cookie', 'A family who clicks your link and starts Family within 60 days counts as yours.'],
  ['Monthly payouts', 'PayPal or bank transfer, net-30, $25 minimum.'],
  ['Free to recommend', 'DinnerDrop is free to start — no card — so your audience can try what you\'re describing in under a minute.'],
]

export default function AffiliatesPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-3xl flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-foreground">DinnerDrop</Link>
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Back to home</Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Affiliate program</p>
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-3">Recommend the dinner planner the whole family votes on. Earn 30%.</h1>
        <p className="text-lg text-muted-foreground mb-10">If your audience is parents who are tired of the 5pm dinner question, this is an easy one to share: answer a short quiz, get a week of dinners, one tap sends the groceries to the cart. Free to start, Family is $4.99 a month.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          {TERMS.map(([t, d]) => (
            <div key={t} className="rounded-2xl border border-border bg-white p-5">
              <p className="font-heading font-semibold text-foreground">{t}</p>
              <p className="text-sm text-muted-foreground mt-1">{d}</p>
            </div>
          ))}
        </div>

        <h2 className="text-xl font-heading font-bold text-foreground mb-2">Who it&apos;s for</h2>
        <ul className="list-disc pl-5 text-muted-foreground space-y-1 mb-10 text-sm">
          <li>Family, parenting and busy-mom creators on Instagram, TikTok and YouTube</li>
          <li>Meal-prep, budget-cooking and picky-eater bloggers</li>
          <li>Newsletter writers and Facebook-group admins with a parent audience</li>
          <li>Teachers, coaches and pediatric practices who recommend tools to families</li>
        </ul>

        <h2 className="text-xl font-heading font-bold text-foreground mb-2">What you get</h2>
        <p className="text-sm text-muted-foreground mb-10">Your own link and dashboard, ready-to-post screenshots and short clips of the cart filling up, a week of sample dinners to show, and a free Family account so you can run it yourself.</p>

        <h2 className="text-xl font-heading font-bold text-foreground mb-4">Apply</h2>
        <AffiliateForm />

        <p className="text-xs text-muted-foreground mt-8">Separate from this program, DinnerDrop may earn a commission when families shop through Instacart or Kroger — see our <Link href="/disclosure" className="underline">disclosure</Link>. Affiliate payouts are made under a written agreement sent on approval.</p>
      </main>
    </div>
  )
}

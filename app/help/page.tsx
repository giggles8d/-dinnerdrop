import type { Metadata } from 'next'
import Link from 'next/link'
import HelpForm from './HelpForm'

export const metadata: Metadata = {
  title: 'DinnerDrop Help — Instacart, Swaps, Servings, Billing & Contact',
  description: 'Quick answers on Instacart carts, swapping dinners, servings, allergies, family texting and billing — plus a direct line to Sarah, DinnerDrop\'s founder.',
  alternates: { canonical: 'https://www.dinnerdrop.app/help' },
}

const FAQ: Array<[string, string]> = [
  ['My items didn’t add to the Instacart cart', 'Open DinnerDrop in Safari or Chrome rather than inside Facebook or Instagram, then tap Shop ingredients. Instacart sign-in often fails inside those apps’ built-in browsers. If it still won’t add, send us a screenshot below.'],
  ['Instacart swapped some items', 'Instacart picks the closest product at your store; limited-brand stores like Aldi swap more. On the Instacart page, tap "Show alternatives" on anything marked Close Match before checkout.'],
  ['How do I change a dinner?', 'On your dashboard tap any dinner and choose Swap this meal, or heart dinners in the Recipe library so they rotate in. Mark a dinner cooked to fade it off the list.'],
  ['How do I change servings, allergies or diets?', 'Servings: the − / + on any recipe. Allergies, dislikes and each person’s safe foods: Settings → Household. Diets (vegetarian, gluten-free, low-carb, paleo…): Settings → Food.'],
  ['How does family texting work?', 'With Family, DinnerDrop texts the week’s dinner options to everyone you add; they reply with numbers and the top picks become the week. Anyone can text "ADD milk" to put things on the list.'],
  ['Billing, trial and cancelling', 'Free is free forever. Family is $4.99/month or $39/year after a 14-day trial, and you can cancel in one tap from Account. Nothing is charged for your groceries by DinnerDrop; you pay the store on Instacart or Kroger.'],
  ['Delete my account', 'Account → Delete account removes your plans, lists and profile. Or email sarah@dinnerdrop.app and we’ll do it.'],
]

const faqLd = {
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <div className="container mx-auto px-4 py-10 max-w-2xl">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Help</p>
        <h1 className="text-3xl font-heading font-bold text-foreground mb-2">Need a hand?</h1>
        <p className="text-muted-foreground mb-8">Quick answers below, or write to Sarah, DinnerDrop&apos;s founder. She reads every message.</p>
        <section className="mb-10 space-y-2">
          {FAQ.map(([q, a]) => (
            <details key={q} className="rounded-xl border border-border bg-card px-4 py-3 group">
              <summary className="cursor-pointer font-semibold text-foreground text-sm list-none flex justify-between items-center">{q}<span className="text-muted-foreground group-open:rotate-45 transition-transform">+</span></summary>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a}</p>
            </details>
          ))}
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-heading font-bold text-foreground mb-1">Write to Sarah</h2>
          <p className="text-sm text-muted-foreground mb-4">Or email <a href="mailto:sarah@dinnerdrop.app" className="underline">sarah@dinnerdrop.app</a>.</p>
          <HelpForm />
        </section>
        <p className="mt-8 text-xs text-muted-foreground"><Link href="/dashboard" className="underline">Back to my week</Link></p>
      </div>
    </div>
  )
}

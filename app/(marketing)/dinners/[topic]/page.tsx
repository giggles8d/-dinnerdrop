import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import SampleWeek from '@/components/SampleWeek'
import { getSampleWeek, sampleWeekTotal } from '@/lib/sample-weeks'

/**
 * Dietary / situation landing pages (Tier 1.6): each one shows a real-format
 * example week for that situation with Recipe schema, then the free CTA.
 */

interface Topic {
  slug: string
  week: string
  title: string
  h1: string
  intro: string
  description: string
  bullets: string[]
  faq: Array<{ q: string; a: string }>
}

const TOPICS: Topic[] = [
  {
    slug: 'gluten-free-family-dinners',
    week: 'glutenfree',
    title: 'Gluten-Free Family Dinners, Planned Weekly — Free',
    h1: 'Gluten-free family dinners, planned for you every week',
    intro: 'Five naturally gluten-free dinners a week, built around your family size, budget, and cook time — with one grocery list that goes straight into your Instacart cart. No specialty aisle, no reading every label twice.',
    description: 'Weekly gluten-free dinner plans for families: five naturally gluten-free dinners, one combined grocery list, and a one-tap Instacart cart. Free, no card.',
    bullets: [
      'Every dinner is built gluten-free from the start — rice, potatoes, corn tortillas, tamari instead of soy sauce — rather than a regular recipe with swaps bolted on.',
      'Mixed households: the plan feeds everyone the same dinner, so nobody cooks twice.',
      'Dietary needs stack: gluten-free plus dairy-free, nut allergies, vegetarian, and more, on every plan.',
      'Always check labels — sauces, broths, and seasoning mixes vary by brand. DinnerDrop picks ingredients that are usually gluten-free; your store’s packaging is the final word.',
    ],
    faq: [
      { q: 'Does it avoid cross-contamination ingredients like oats?', a: 'Plans avoid wheat, barley, and rye outright and lean on naturally gluten-free staples. If you need certified-GF oats or a specific brand, add it as a dietary note and swap any dinner in one tap.' },
      { q: 'Can I combine gluten-free with other needs?', a: 'Yes. Gluten-free, dairy-free, vegetarian, vegan, nut-free, and keto can all be set together; every plan respects all of them.' },
    ],
  },
  {
    slug: 'picky-eater-dinners',
    week: 'kid',
    title: 'Picky-Eater Dinners the Whole Family Eats — Planned Weekly, Free',
    h1: 'Dinners your picky eater will actually eat, planned every week',
    intro: 'Familiar flavors, one safe thing on every plate, and build-your-own nights so kids feel in control. Five dinners a week around your budget and cook time, with the grocery list already in your cart.',
    description: 'Weekly dinner plans for families with picky eaters: familiar, deconstructed, build-your-own dinners with one grocery list and a one-tap Instacart cart. Free, no card.',
    bullets: [
      'Swap any dinner in one tap. DinnerDrop learns what your family keeps and what it skips, and plans around it.',
      'Deconstructed by default: tacos, bowls, and sheet-pan dinners where every component is visible and optional.',
      'Keep the winners: favorite any dinner and it rotates back in instead of being replaced by something new every week.',
      'Five dinners, not seven. A leftover night and a takeout night are part of real life, so the plan leaves room for them.',
    ],
    faq: [
      { q: 'What if my kids only eat five things?', a: 'Add those five as favorites (type the names; DinnerDrop rebuilds them as full recipes) and the planner builds weeks around them, introducing one new dinner at a time.' },
      { q: 'Does it handle different preferences in one house?', a: 'Family size and dietary needs shape every plan today, and per-person preferences — each kid’s likes, won’t-eats, and allergies — are rolling out to Family plan members first.' },
    ],
  },
  {
    slug: 'dinners-under-30-minutes',
    week: 'fast',
    title: 'Weeknight Dinners Under 30 Minutes, Planned Weekly — Free',
    h1: 'Weeknight dinners under 30 minutes, planned for you',
    intro: 'Set your cook time once — 20 minutes, 30 minutes, whatever your weeknights allow — and every dinner fits it, prep included. One grocery list, one tap to your Instacart cart.',
    description: 'Weekly plans of weeknight dinners under 30 minutes (or under 20), built to your family size and budget, with one grocery list and a one-tap Instacart cart. Free, no card.',
    bullets: [
      'Times are total, from first chop to the table, not just the cook step.',
      'Shortcuts that hold up: rotisserie chicken, microwave rice, refrigerated tortellini, bagged salad kits.',
      'Leftover-aware pairs: Tuesday’s chicken becomes Thursday’s flatbreads.',
      'Busy-night scheduling — a 15-minute dinner on practice night, a 40-minute one on Sunday — is coming to Family plan members first.',
    ],
    faq: [
      { q: 'Are the times realistic?', a: 'Each recipe lists prep and cook time separately and the plan respects your limit for the total. If one runs long for you, swap it in one tap and the planner learns.' },
      { q: 'Can I set different limits for different nights?', a: 'Per-night cook times are rolling out to Family members first. Today one limit applies to the whole week.' },
    ],
  },
  {
    slug: 'family-dinners-under-100',
    week: 'budget',
    title: 'Family Dinners Under $100 a Week, Planned — Free',
    h1: 'Five family dinners for under $100 a week, planned and in your cart',
    intro: 'Tell DinnerDrop your weekly dinner budget and every plan is built to fit it — overlapping ingredients, pantry staples, and a running estimate before you shop. The list goes straight into your Instacart cart in one tap.',
    description: 'Weekly budget dinner plans for families: five dinners built to your grocery budget with a running estimate, one combined list, and a one-tap Instacart cart. Free, no card.',
    bullets: [
      'Set the number — $75, $100, $150 — and the planner targets it with an estimate per dinner and for the week.',
      'Ingredients overlap on purpose: one bag of rice, one onion, one jar of sauce across several dinners.',
      'Pantry scan: photograph what you have and the plan uses it first.',
      'Store prices and package sizes set the final total; the estimate is honest, not a guarantee.',
    ],
    faq: [
      { q: 'How accurate is the estimate?', a: 'It is a recipe-level estimate at typical US grocery prices, shown before you shop. The Instacart cart shows your store’s real prices before you check out, and you can swap anything.' },
      { q: 'Does it work with Walmart or Aldi?', a: 'The list works anywhere — in store, on your phone. The one-tap cart fills Instacart (which delivers from many chains) or, on the Family plan, Kroger.' },
    ],
  },
]

export function generateStaticParams() {
  return TOPICS.map((t) => ({ topic: t.slug }))
}

export function generateMetadata({ params }: { params: { topic: string } }): Metadata {
  const t = TOPICS.find((x) => x.slug === params.topic)
  if (!t) return {}
  const url = `https://www.dinnerdrop.app/dinners/${t.slug}`
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: url },
    openGraph: { title: t.title, description: t.description, url, siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title: t.title, description: t.description, images: ['/og-image.png'] },
  }
}

export default function TopicPage({ params }: { params: { topic: string } }) {
  const t = TOPICS.find((x) => x.slug === params.topic)
  if (!t) notFound()
  const week = getSampleWeek(t.week)
  if (!week) notFound()
  const total = sampleWeekTotal(week)

  const recipeSchema = week.meals.map((m) => ({
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: m.name,
    author: { '@type': 'Organization', name: 'DinnerDrop' },
    recipeCuisine: m.cuisine,
    recipeYield: `${m.servings} servings`,
    prepTime: `PT${m.prepTime}M`,
    cookTime: `PT${m.cookTime}M`,
    totalTime: `PT${m.prepTime + m.cookTime}M`,
    recipeIngredient: m.ingredients.map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim()),
    recipeInstructions: m.steps.map((s) => ({ '@type': 'HowToStep', text: s })),
    keywords: `${t.slug.replace(/-/g, ' ')}, weeknight dinner, family dinner`,
  }))
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: t.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([...recipeSchema, faqSchema]) }} />
      <header className="border-b border-border bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90">Start free</Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 max-w-6xl">
        <section className="pt-14 pb-10 max-w-3xl">
          <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground leading-tight mb-5">{t.h1}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-6">{t.intro}</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <Link href="/signup" className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md text-center">Start free &mdash; no card needed &rarr;</Link>
            <span className="text-sm text-muted-foreground">Free forever for planning and your Instacart cart.</span>
          </div>
        </section>

        <section className="pb-14">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Example week</p>
          <h2 className="text-2xl font-heading font-bold text-foreground mb-6">Five dinners, about ${Math.round(total)} in groceries, one list</h2>
          <SampleWeek keys={[t.week]} hideToggle />
        </section>

        <section className="pb-14 max-w-3xl">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-5">How DinnerDrop handles it</h2>
          <ul className="space-y-3">
            {t.bullets.map((b) => (
              <li key={b} className="flex gap-3 text-foreground leading-relaxed"><span className="text-primary font-bold">&#10003;</span><span>{b}</span></li>
            ))}
          </ul>
        </section>

        <section className="pb-14 max-w-3xl">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-5">Questions</h2>
          <div className="space-y-4">
            {t.faq.map((f) => (
              <div key={f.q} className="rounded-2xl border border-border p-5">
                <h3 className="font-heading font-semibold text-foreground mb-1">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pb-20 text-center">
          <Link href="/signup" className="inline-block px-10 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 shadow-md">Plan my week free &rarr;</Link>
          <p className="text-sm text-muted-foreground mt-3">Two minutes to set up. Your first week is ready right away.</p>
          <p className="text-sm text-muted-foreground mt-6">
            More: {TOPICS.filter((x) => x.slug !== t.slug).map((x, i) => (
              <span key={x.slug}>{i > 0 ? ' · ' : ''}<Link href={`/dinners/${x.slug}`} className="text-primary underline">{x.h1}</Link></span>
            ))}
          </p>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-heading font-bold text-sm text-primary">DinnerDrop</span>
          <p>&copy; 2026 DinnerDrop</p>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-foreground">About</Link>
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About DinnerDrop — Weeknight Dinners, Handled',
  description: 'DinnerDrop is an AI weekly dinner planner for busy families: 5 personalized dinners, a deduplicated grocery list, and a one-tap handoff to Instacart or Kroger.',
  openGraph: {
    title: 'About DinnerDrop — Weeknight Dinners, Handled',
    description: 'DinnerDrop is an AI weekly dinner planner for busy families: 5 personalized dinners, a deduplicated grocery list, and a one-tap handoff to Instacart or Kroger.',
    url: 'https://dinnerdrop.app/about',
    siteName: 'DinnerDrop',
    type: 'website',
    images: [{ url: 'https://dinnerdrop.app/og-image.png', width: 1200, height: 630 }],
  },
  alternates: { canonical: 'https://dinnerdrop.app/about' },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-3xl flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-foreground">
            DinnerDrop
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4">
          About DinnerDrop
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-10">
          DinnerDrop is an AI weekly dinner planner built for busy families. Tell us your family
          size, budget, cook time, and any dietary needs, and we generate five personalized
          weeknight dinners, build one deduplicated grocery list, and hand it off to your
          Instacart or Kroger cart in a single tap.
        </p>

        <div className="space-y-8 text-sm sm:text-base text-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              Why we built it
            </h2>
            <p>
              The hardest part of dinner isn&apos;t the cooking — it&apos;s the deciding. Every
              week brings the same questions: What do we make? What do we already have? What fits
              the budget? What will the kids actually eat? By 5pm, that decision feels impossible.
              DinnerDrop exists to take it off your plate. You answer a short quiz once, and every
              week you get a plan and a grocery list that already account for your family&apos;s
              tastes, time, and budget.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              How it works
            </h2>
            <p>
              Our planner uses AI to build a week of budget-friendly dinners around your
              preferences, then organizes every ingredient into a clean, categorized grocery
              list. When you&apos;re ready to shop, one tap sends the whole list to Instacart or,
              if you&apos;ve linked your account, straight into your Kroger cart — no retyping, no
              missed items. You can swap any meal you don&apos;t love, and DinnerDrop learns your
              family&apos;s tastes over time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              We write about dinner, too
            </h2>
            <p>
              Beyond the app, we publish practical meal-planning guides, budget dinner ideas, and
              weeknight recipes on the{' '}
              <Link href="/blog" className="text-primary underline">DinnerDrop blog</Link> — the
              same kind of help, in article form, for anyone facing the nightly dinner question.
            </p>
          </section>

          <section className="rounded-2xl border border-border bg-secondary p-6">
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">
              A note from the founder
            </h2>
            <p className="mb-3">
              I started DinnerDrop because I was tired of the 5pm scramble in my own kitchen — the
              open fridge, the takeout guilt, the same handful of meals on repeat. I wanted
              something that did the planning <em>and</em> the list, and then got out of the way.
              That&apos;s what we&apos;re building: a small, honest tool that gives families back a
              little time and a little sanity every week.
            </p>
            <p className="mb-3">
              We&apos;re in our founding-family chapter right now — the first 100 families get six
              months free, and their feedback shapes everything we build next. If you have
              thoughts, I genuinely want to hear them.
            </p>
            <p className="text-muted-foreground">
              — Sarah, Founder ·{' '}
              <a href="mailto:info@dinnerdrop.app" className="text-primary underline">
                info@dinnerdrop.app
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-heading font-semibold text-foreground mb-3">Contact</h2>
            <p>
              Questions, feedback, or press? Email{' '}
              <a href="mailto:info@dinnerdrop.app" className="text-primary underline">
                info@dinnerdrop.app
              </a>
              . You can also read our{' '}
              <Link href="/disclosure" className="text-primary underline">affiliate disclosure</Link>,{' '}
              <Link href="/terms" className="text-primary underline">terms</Link>, and{' '}
              <Link href="/privacy" className="text-primary underline">privacy policy</Link>.
            </p>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/beta"
            className="inline-block px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors shadow-sm"
          >
            Claim my 6 months free &rarr;
          </Link>
        </div>
      </main>
    </div>
  )
}

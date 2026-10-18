import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import HeroClip from '@/components/HeroClip'
import FamilyTextingSection from '@/components/FamilyTextingSection'
import SampleWeek from '@/components/SampleWeek'
import { Sparkles, ShoppingCart, Heart, PiggyBank, Check, Clock3 } from 'lucide-react'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.dinnerdrop.app' },
}

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      <header className="border-b border-border bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            <Link href="/shop" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Shop</Link>
            <Link href="/start" className="hidden md:block px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors" style={{borderColor:'#e8a838',color:'#1a5c38'}}>Pricing</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Start free</Link>
          </div>
        </div>
      </header>

      {/* Hero — photography-led */}
      <section className="relative overflow-hidden" style={{backgroundColor:'#FBF8F1'}}>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-16 pb-20">
            <div>
              <div className="inline-flex items-center gap-2 bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20 mb-6 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-accent inline-block" />
                Free weekly dinner plans + one-tap Instacart cart
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-foreground leading-[1.05] mb-6">
                Dinner,<br />handled.
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl leading-relaxed mb-9">
                Five weeknight dinners planned around your family and your budget. Tap once and your whole list opens in Instacart with every item matched — pick your store, review, check out. Free, no card needed.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link href="/signup" className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                  Start free &mdash; no card needed &rarr;
                </Link>
                <a href="#sample-week" className="px-8 py-4 rounded-xl border-2 border-primary/15 bg-white text-foreground font-semibold text-base hover:border-primary/40 transition-colors">
                  See a sample week
                </a>
              </div>
              <p className="text-sm text-muted-foreground mt-4">Free forever for planning and your Instacart cart &middot; Family plan $4.99/month, 14 days free</p>
            </div>

            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 rotate-1 bg-white">
                <HeroClip className="w-full h-auto block" />
              </div>
              {/* floating proof chips */}
              <div className="absolute -bottom-5 left-6 bg-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 ring-1 ring-black/5">
                <ShoppingCart className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-heading font-bold text-primary leading-none">One tap</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">whole list in your Instacart cart</p>
                </div>
              </div>
              <div className="absolute -top-4 right-6 bg-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 ring-1 ring-black/5">
                <Clock3 className="w-6 h-6 text-accent" />
                <div>
                  <p className="font-heading font-bold text-primary leading-none">5 dinners</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">built to your cook time and budget</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <p className="container mx-auto px-4 max-w-6xl text-xs text-muted-foreground leading-snug py-5">
        <span className="font-semibold text-foreground">How the cart works:</span> DinnerDrop builds the list in your own Instacart or Kroger account. You review every item and check out there at Instacart&apos;s or Kroger&apos;s prices for that store. We never charge your grocery account and never add to the price. Over 200 families plan dinner with DinnerDrop.
      </p>

      {/* Sample week — the product, before any signup */}
      <section id="sample-week" className="container mx-auto px-4 py-20 max-w-6xl">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">See a week</p>
        <h2 className="text-3xl font-heading font-bold text-foreground mb-3 max-w-2xl leading-tight">
          What a week looks like before you ever sign up
        </h2>
        <p className="text-muted-foreground mb-8 max-w-2xl">
          Example weeks for a family of four, in the same format the planner gives you: five dinners, honest total times, and one combined grocery list ready for your cart. Your own week is built around your family, budget, and schedule.
        </p>
        <SampleWeek initial="kid" />
      </section>

      {/* How it works — photo + steps */}
      <section id="how-it-works" className="border-y border-border" style={{backgroundColor:'#FBF8F1'}}>
        <div className="container mx-auto px-4 py-20 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <div className="order-2 lg:order-1">
              <div className="rounded-3xl overflow-hidden shadow-xl ring-1 ring-black/5 -rotate-1">
                <Image
                  src="/home-feature.jpg"
                  alt="Chopped fresh vegetables on a cutting board next to a handwritten weekly dinner plan"
                  width={1200}
                  height={896}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">How it works</p>
              <h2 className="text-4xl font-heading font-bold text-foreground mb-10 leading-tight">
                From nothing to groceries in about two minutes
              </h2>
              <div className="space-y-8">
                {[
                  { step: '1', title: 'Tell us about your family', description: 'Budget, family size, dietary needs, how much time you have to cook. Takes 2 minutes.' },
                  { step: '2', title: 'Get 5 personalized dinners', description: 'AI builds a full week of budget-friendly meals your family will actually eat.' },
                  { step: '3', title: 'One tap. List in your cart.', description: 'Tap Instacart and your full list opens with every item matched — pick a store, review, check out. Family members can push straight to a Kroger cart.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-5">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary text-primary-foreground font-heading font-bold flex items-center justify-center shadow-sm">
                      {item.step}
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-lg text-foreground mb-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20 max-w-6xl">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">What you get</p>
        <h2 className="text-3xl font-heading font-bold text-foreground mb-4 max-w-lg leading-tight">
          Everything a busy family needs. Nothing you don&apos;t.
        </h2>
        <p className="text-muted-foreground mb-12 max-w-2xl">
          Works at any store, not just one chain. Learns what your family keeps and what it skips. Keeps the dinners you come back to in the rotation instead of starting from scratch every week.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { Icon: Sparkles, title: 'AI meal planning', description: 'Personalized to your family size, budget, dietary needs, and how much time you have to cook each night.' },
            { Icon: ShoppingCart, title: 'Auto-cart at Instacart or Kroger', description: 'Your full shopping list lands in your Instacart cart in one tap — or, on Family, straight in your Kroger cart. No retyping. No missed items.' },
            { Icon: Heart, title: 'Picky-eater friendly', description: "Swap any meal you don't love in one tap. DinnerDrop learns your family's tastes over time." },
            { Icon: PiggyBank, title: 'Built to your budget', description: 'Set your weekly food budget. Every plan targets it and shows an estimated total before you shop; store prices and package sizes set the final number.' },
          ].map(({ Icon, title, description }) => (
            <div key={title} className="p-6 rounded-2xl border border-border bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all space-y-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{backgroundColor:'#EAF1EC'}}>
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-heading font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Founder note */}
      <section className="border-y border-border" style={{backgroundColor:'#FBF8F1'}}>
        <div className="container mx-auto px-4 py-20 max-w-3xl">
          <div className="bg-white rounded-3xl shadow-sm ring-1 ring-black/5 p-8 sm:p-12">
            <p className="text-xs font-bold text-primary uppercase tracking-widest mb-6">Why I built DinnerDrop</p>
            <div className="space-y-4 text-foreground">
              <p className="text-lg leading-relaxed">
                Hi, I&apos;m Sarah. For years the hardest part of my week wasn&apos;t cooking &mdash; it was the 5pm scramble of deciding what to make, then realizing we were out of half the ingredients.
              </p>
              <p className="text-lg leading-relaxed">
                I built DinnerDrop so dinner stops being a daily negotiation: it plans the week around your family and your budget, builds the grocery list, and drops it into your cart in one tap.
              </p>
              <p className="text-lg leading-relaxed">
                Planning and the Instacart cart are free for every family, and they always will be. If you want the whole household in on it &mdash; everyone texted the week&apos;s dinners, a shared list, a Kroger cart &mdash; that&apos;s the Family plan, $4.99 a month, with 14 days free to see if it sticks.
              </p>
            </div>
            <p className="mt-8 font-heading text-xl text-primary italic">&mdash; Sarah, founder of DinnerDrop</p>
          </div>
        </div>
      </section>

      <FamilyTextingSection ctaHref={'/signup?redirect=' + encodeURIComponent('/subscribe?auto=1')} />

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-20 max-w-4xl scroll-mt-20">
        <h2 className="text-3xl font-heading font-bold text-center text-foreground mb-3">
          Simple pricing
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Planning and your Instacart cart are free. Family adds the rest of the household.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="p-7 rounded-2xl border border-border bg-white shadow-sm space-y-5">
            <h3 className="font-heading font-semibold text-foreground">Free</h3>
            <p className="text-4xl font-heading font-bold text-foreground">
              $0<span className="text-sm font-sans font-normal text-muted-foreground"> forever</span>
            </p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {['Unlimited weekly dinner plans', 'Deduplicated grocery list', 'One-tap Instacart cart', 'Swap any dinner', 'Pantry scan', 'Favorites and meal history'].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{li}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="block text-center px-4 py-2.5 rounded-xl border border-primary text-primary font-semibold hover:bg-muted transition-colors">
              Start free &mdash; no card
            </Link>
          </div>
          <div className="p-7 rounded-2xl border-2 border-primary bg-white shadow-lg space-y-5 relative">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-accent text-foreground text-xs font-bold rounded-full">
              For the whole family
            </div>
            <h3 className="font-heading font-semibold text-foreground">Family</h3>
            <div>
              <p className="text-4xl font-heading font-bold text-foreground">
                $4.99<span className="text-sm font-sans font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-sm font-semibold mt-1" style={{color:'#1a5c38'}}>
                or $39/year &middot; 14-day free trial &middot; cancel anytime
              </p>
            </div>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {['Everything in Free', 'Family texting: the week’s dinner ideas go to everyone by text, they reply with the numbers they want, the top picks become the week', 'A profile for each person — likes, won’t-eats, allergies, kid-safe foods', 'Anyone can text an item (or a photo of one) onto the grocery list', 'Text reminders on your cook nights', 'Push straight to your Kroger cart', 'Priority support, answered by the founder'].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{li}
                </li>
              ))}
            </ul>
            <Link href={'/signup?redirect=' + encodeURIComponent('/subscribe?auto=1')} className="block text-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Try Family free for 14 days &rarr;
            </Link>
            <p className="text-sm text-muted-foreground leading-snug">
              Card required for the Family trial. $0 today. We email you on day 11, three days before the first charge. Cancel in one tap from Account.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border" style={{backgroundColor:'#FBF8F1'}}>
        <div className="container mx-auto px-4 py-20 max-w-3xl">
          <h2 className="text-3xl font-heading font-bold text-center text-foreground mb-10">Questions parents ask</h2>
          <div className="space-y-4">
            {[
              { q: 'Is it really free?', a: 'Yes. Unlimited weekly dinner plans, the grocery list, and the one-tap Instacart cart are free, with no card. Instacart pays us a small commission when you shop through DinnerDrop, at no extra cost to you — that is what keeps the free plan free.' },
              { q: 'How do I cancel Family?', a: 'From your Account page, in one tap. No calls, no hidden steps. Cancel during the 14-day trial and you pay nothing.' },
              { q: 'Will I be charged by surprise?', a: 'No. We email you on day 11 of a Family trial, three days before the first charge, and Account shows your exact billing date. Payments are processed by Stripe; we never see or store your card number.' },
              { q: 'Does DinnerDrop charge my grocery account?', a: 'Never. It fills the cart in your own Instacart or Kroger account; you review the items and check out there at the store\u2019s normal prices. Nothing is marked up.' },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-2xl ring-1 ring-black/5 p-6">
                <h3 className="font-heading font-semibold text-foreground mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-foreground relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 max-w-5xl text-center relative">
          <h2 className="text-4xl sm:text-5xl font-heading font-bold text-primary-foreground mb-4">Stop staring at the fridge.</h2>
          <p className="text-primary-foreground/60 mb-9 text-lg">Five dinners, planned and in your cart. Free, no card needed.</p>
          <Link href="/signup" className="inline-block px-10 py-4 rounded-xl bg-accent text-foreground font-bold text-base hover:bg-accent/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
            Start free &rarr;
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="container mx-auto px-4 py-6 max-w-6xl flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="font-heading font-bold text-sm text-primary">DinnerDrop</span>
          </div>
          <p>&copy; 2026 DinnerDrop</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
            <Link href="/affiliates" className="hover:text-foreground transition-colors">Affiliates</Link>
            <Link href="/disclosure" className="hover:text-foreground transition-colors">Disclosure</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

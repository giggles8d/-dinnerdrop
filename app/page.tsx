import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import HeroClip from '@/components/HeroClip'
import FamilyTextingSection from '@/components/FamilyTextingSection'
import StorePriceExample from '@/components/StorePriceExample'
import { InstacartCarrot, InstacartBand, PoweredByInstacart } from '@/components/InstacartMark'
import SampleWeek from '@/components/SampleWeek'
import { Sparkles, ShoppingCart, Heart, PiggyBank, Check, MessageSquareText } from 'lucide-react'
import CartOfferBanner from '@/components/CartOfferBanner'
import SocialLinks from '@/components/SocialLinks'

export const metadata: Metadata = {
  alternates: { canonical: 'https://www.dinnerdrop.app' },
}

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <CartOfferBanner />

      <header className="border-b border-border bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            <Link href="/shop" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Shop</Link>
            <Link href="/recipes" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Recipes</Link>
            <Link href="/cookware" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cookware</Link>
            <Link href="/gift" className="hidden md:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Gift</Link>
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
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <PoweredByInstacart />
                <span className="inline-flex items-center gap-2 bg-white text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20 shadow-sm">
                  <MessageSquareText className="w-3.5 h-3.5" />
                  Your family votes on dinner by text
                </span>
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-foreground leading-[1.05] mb-6">
                Dinner,<br />handled.
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl leading-relaxed mb-9">
                DinnerDrop <span className="font-semibold text-foreground">texts everyone in your house</span> the week&apos;s dinner ideas. They reply with the numbers they want &mdash; no app for the kids, no group chat &mdash; and the winners become your week. Then one tap puts the whole list in <span className="font-semibold text-foreground">your Instacart or Walmart cart</span>.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link href="/signup" className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                  Start free &mdash; no card needed &rarr;
                </Link>
                <a href="#sample-week" className="px-8 py-4 rounded-xl border-2 border-primary/15 bg-white text-foreground font-semibold text-base hover:border-primary/40 transition-colors">
                  See a sample week
                </a>
              </div>
              <p className="text-sm text-muted-foreground mt-4 flex items-center gap-2"><InstacartCarrot height={14} /> Family texting free for 14 days, no card &middot; Works with Instacart, Walmart and Kroger &middot; Then $4.99/month, or keep the free plan</p>
            </div>

            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 bg-white">
                <HeroClip className="w-full h-auto block" />
              </div>
              {/* floating proof chips */}
              <div className="absolute -bottom-5 left-6 bg-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 ring-1 ring-black/5">
                <InstacartCarrot height={28} />
                <div>
                  <p className="font-heading font-bold text-primary leading-none">One tap → Instacart or Walmart</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">whole list in your cart, every item matched</p>
                </div>
              </div>
              <div className="absolute -top-4 right-6 bg-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 ring-1 ring-black/5">
                <MessageSquareText className="w-6 h-6 text-accent" />
                <div>
                  <p className="font-heading font-bold text-primary leading-none">&ldquo;2 and 4!&rdquo; &mdash; votes by text</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">everyone picks from their own phone</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <InstacartBand />

      <p className="container mx-auto px-4 max-w-6xl text-xs text-muted-foreground leading-snug py-5">
        <span className="font-semibold text-foreground">How the cart works:</span> DinnerDrop fills the cart in your own Instacart, Walmart or Kroger account. You review every item and check out there at that store&apos;s prices. We never charge your grocery account and never add to the price. Over 400 families plan dinner with DinnerDrop.
        {' '}<span className="font-semibold text-foreground">On your phone:</span> open dinnerdrop.app in Safari or Chrome and tap <em>Add to Home Screen</em> — it works like an app, nothing to download.
      </p>

      {/* Family texting — what makes DinnerDrop different, right after the hero (Sarah, Nov 7 2026) */}
      <FamilyTextingSection ctaHref="/signup" />

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
                  { step: '3', title: 'One tap. It\u2019s in your cart.', description: 'Instacart: your full list opens in your own Instacart account with every item matched — pick any store on it, review, check out. Walmart: every line is matched to a Walmart product, you glance at it, and one tap fills your Walmart cart for pickup or delivery. Family members can push straight to a Kroger cart too.' },
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

      {/* Real store prices — the thing no other planner does */}
      <StorePriceExample ctaHref="/signup" />

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
            { Icon: ShoppingCart, title: 'Instacart and Walmart built in', description: 'One tap opens your full list in your Instacart cart (every store near you) or fills your Walmart cart with every item matched — glance, check out. No retyping, no missed items. On Family it can go straight into your Kroger cart too.' },
            { Icon: Heart, title: 'Picky-eater friendly', description: "Swap any meal you don't love in one tap. DinnerDrop learns your family's tastes over time." },
            { Icon: PiggyBank, title: 'Built to your budget', description: 'Set your weekly food budget. Every plan targets it, builds around your store\u2019s weekly sales, and prices the list at each store you shop so you can pick the cheapest.' },
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
                Planning and the Instacart and Walmart carts are free for every family, and they always will be. If you want the whole household in on it &mdash; everyone texted the week&apos;s dinners, a shared list, a Kroger cart &mdash; that&apos;s the Family plan, $4.99 a month, with 14 days free to see if it sticks.
              </p>
            </div>
            <p className="mt-8 font-heading text-xl text-primary italic">&mdash; Sarah, founder of DinnerDrop</p>
          </div>
        </div>
      </section>


      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-20 max-w-4xl scroll-mt-20">
        <h2 className="text-3xl font-heading font-bold text-center text-foreground mb-3">
          Simple pricing
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Planning and your Instacart or Walmart cart are free. Family adds the rest of the household.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="p-7 rounded-2xl border border-border bg-white shadow-sm space-y-5">
            <h3 className="font-heading font-semibold text-foreground">Free</h3>
            <p className="text-4xl font-heading font-bold text-foreground">
              $0<span className="text-sm font-sans font-normal text-muted-foreground"> forever</span>
            </p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {['Unlimited weekly dinner plans', 'Deduplicated grocery list', 'One-tap Instacart or Walmart cart', 'Swap any dinner', 'Pantry scan', 'Favorites and meal history'].map((li) => (
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
              Every new family gets the first 14 days of Family free with no card. Add a card here to keep it after that: $0 today, we email you on day 11, cancel in one tap from Account.
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
              { q: 'How does the Instacart integration work?', a: 'DinnerDrop is built on the Instacart Developer Platform. When your week is planned, tap “Shop on Instacart” and your full, deduplicated list opens in your own Instacart account with every item already matched to a product — no retyping, no searching item by item. You pick any Instacart store near you (Wegmans, Aldi, Tops, Price Chopper, Target, Costco and more), swap anything you like, and check out there. Instacart handles delivery or pickup and payment; DinnerDrop never sees your card.' },
              { q: 'Is it really free?', a: 'Yes. Unlimited weekly dinner plans, the grocery list, and the one-tap Instacart and Walmart carts are free, with no card. Instacart and Walmart pay us a small commission when you shop through DinnerDrop, at no extra cost to you — that is what keeps the free plan free.' },
              { q: 'How does the Walmart cart work?', a: 'Tap “Shop at Walmart” and DinnerDrop matches every line on your list to a real Walmart product — size, price and all. You can swap any item for an alternative, then one tap puts everything in your Walmart cart. You pick pickup or delivery and check out on Walmart.com; we never see your payment.' },
              { q: 'How do I cancel Family?', a: 'From your Account page, in one tap. No calls, no hidden steps. Cancel during the 14-day trial and you pay nothing.' },
              { q: 'Will I be charged by surprise?', a: 'No. We email you on day 11 of a Family trial, three days before the first charge, and Account shows your exact billing date. Payments are processed by Stripe; we never see or store your card number.' },
              { q: 'Does DinnerDrop charge my grocery account?', a: 'Never. It fills the cart in your own Instacart, Walmart or Kroger account; you review the items and check out there. We add nothing to the price; what you pay is that store\u2019s price plus any of their fees, which can differ from in-store shelf prices.' },
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
          <SocialLinks />
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link href="/blog" className="hover:text-foreground transition-colors">Blog</Link>
            <Link href="/shop" className="hover:text-foreground transition-colors">Shop</Link>
            <Link href="/cookware" className="hover:text-foreground transition-colors">Kitchen essentials</Link>
            <Link href="/dinners/picky-eater-dinners" className="hover:text-foreground transition-colors">Picky-eater dinners</Link>
            <Link href="/dinners/dinners-under-30-minutes" className="hover:text-foreground transition-colors">30-minute dinners</Link>
            <Link href="/dinners/family-dinners-under-100" className="hover:text-foreground transition-colors">Dinners under $100</Link>
            <Link href="/dinners/gluten-free-family-dinners" className="hover:text-foreground transition-colors">Gluten-free dinners</Link>
            <Link href="/dinners/diabetic-friendly-dinners" className="hover:text-foreground transition-colors">Diabetic-friendly dinners</Link>
            <Link href="/dinners/heart-healthy-dinners" className="hover:text-foreground transition-colors">Heart-healthy dinners</Link>
            <Link href="/dinners/mediterranean-family-dinners" className="hover:text-foreground transition-colors">Mediterranean dinners</Link>
            <Link href="/dinners/slow-cooker-family-dinners" className="hover:text-foreground transition-colors">Slow cooker dinners</Link>
            <Link href="/vs/emeals" className="hover:text-foreground transition-colors">DinnerDrop vs eMeals</Link>
            <Link href="/gift" className="hover:text-foreground transition-colors">Give DinnerDrop</Link>
            <Link href="/affiliates" className="hover:text-foreground transition-colors">Affiliates</Link>
            <Link href="/help" className="hover:text-foreground transition-colors">Help</Link>
            <Link href="/disclosure" className="hover:text-foreground transition-colors">Disclosure</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

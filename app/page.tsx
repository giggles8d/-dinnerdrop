import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, ShoppingCart, Heart, PiggyBank, Check, Clock3 } from 'lucide-react'

export default async function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      <a href="/beta" className="block text-center py-2 text-sm font-medium" style={{backgroundColor:'#e8a838',color:'#1a5c38'}}>
        🎉 First 100 families get 6 months free — Claim my 6 months free &rarr;
      </a>
      <header className="border-b border-border bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/blog" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Blog</Link>
            <Link href="/shop" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Shop</Link>
            <Link href="/beta" className="hidden md:block px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors" style={{borderColor:'#e8a838',color:'#1a5c38'}}>6 months free</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/beta" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Claim my 6 months free</Link>
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
                AI dinners + one-tap Instacart cart
              </div>
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-heading font-bold text-foreground leading-[1.05] mb-6">
                Dinner,<br />handled.
              </h1>
              <p className="text-xl text-muted-foreground max-w-xl leading-relaxed mb-9">
                Five budget-friendly weeknight dinners, planned by AI. Tap once — your whole grocery list lands in your Instacart cart, ready to check out. Under 30 minutes every night.
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-3">
                <Link href="/beta" className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
                  Claim my 6 months free &rarr;
                </Link>
                <a href="#how-it-works" className="px-8 py-4 rounded-xl border-2 border-primary/15 bg-white text-foreground font-semibold text-base hover:border-primary/40 transition-colors">
                  See how it works
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-4">First plan is free &middot; No credit card &middot; Cancel anytime</p>
            </div>

            <div className="relative">
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-black/5 rotate-1">
                <Image
                  src="/home-hero.jpg"
                  alt="A family gathered around a weeknight dinner of skillet-roasted chicken, salads and fresh bread"
                  width={1600}
                  height={893}
                  priority
                  className="w-full h-auto object-cover"
                />
              </div>
              {/* floating proof chips */}
              <div className="absolute -bottom-5 left-6 bg-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 ring-1 ring-black/5">
                <PiggyBank className="w-6 h-6 text-primary" />
                <div>
                  <p className="font-heading font-bold text-primary leading-none">$47</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">avg weekly grocery savings</p>
                </div>
              </div>
              <div className="absolute -top-4 right-6 bg-white rounded-2xl shadow-lg px-5 py-3 flex items-center gap-3 ring-1 ring-black/5">
                <Clock3 className="w-6 h-6 text-accent" />
                <div>
                  <p className="font-heading font-bold text-primary leading-none">28 min</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">avg cook time per meal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <p className="container mx-auto px-4 max-w-6xl text-xs text-muted-foreground leading-snug py-5">
        <span className="font-semibold text-foreground">Founding-family offer</span> &mdash; the first 100 families get 6 months free. No credit card to start, and your first plan is free either way.
      </p>

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
                From nothing to groceries in 3 minutes
              </h2>
              <div className="space-y-8">
                {[
                  { step: '1', title: 'Tell us about your family', description: 'Budget, family size, dietary needs, how much time you have to cook. Takes 2 minutes.' },
                  { step: '2', title: 'Get 5 personalized dinners', description: 'AI builds a full week of budget-friendly meals your family will actually eat.' },
                  { step: '3', title: 'One tap. List in your cart.', description: 'Tap Instacart and your full list auto-loads — pick a retailer, check out, done. Or push straight to your Kroger cart from your account.' },
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
        <h2 className="text-3xl font-heading font-bold text-foreground mb-12 max-w-lg leading-tight">
          Everything a busy family needs. Nothing you don&apos;t.
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { Icon: Sparkles, title: 'AI meal planning', description: 'Personalized to your family size, budget, dietary needs, and how much time you have to cook each night.' },
            { Icon: ShoppingCart, title: 'Auto-cart at Instacart or Kroger', description: 'Your full shopping list lands in your Instacart cart in one tap — or syncs straight to your Kroger cart via your account. No retyping. No missed items.' },
            { Icon: Heart, title: 'Picky-eater friendly', description: "Swap any meal you don't love in one tap. DinnerDrop learns your family's tastes over time." },
            { Icon: PiggyBank, title: 'Budget optimization', description: 'Set your weekly food budget. Every plan is built to hit your number — no surprises at checkout.' },
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
                We&apos;re brand new and building this alongside our first 100 families. Join now and you&apos;ll help shape what it becomes &mdash; and get six months free while we do.
              </p>
            </div>
            <p className="mt-8 font-heading text-xl text-primary italic">&mdash; Sarah, founder of DinnerDrop</p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20 max-w-4xl">
        <h2 className="text-3xl font-heading font-bold text-center text-foreground mb-12">
          Simple pricing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="p-7 rounded-2xl border border-border bg-white shadow-sm space-y-5">
            <h3 className="font-heading font-semibold text-foreground">Free</h3>
            <p className="text-4xl font-heading font-bold text-foreground">
              $0<span className="text-sm font-sans font-normal text-muted-foreground">/mo</span>
            </p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {['1 meal plan per month', '5 dinners per plan', 'One-tap cart push to Instacart & Kroger'].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{li}
                </li>
              ))}
            </ul>
            <Link href="/beta" className="block text-center px-4 py-2.5 rounded-xl border border-input text-foreground font-medium hover:bg-muted transition-colors">
              Get started
            </Link>
          </div>
          <div className="p-7 rounded-2xl border-2 border-primary bg-white shadow-lg space-y-5 relative">
            <div className="absolute -top-3 left-6 px-3 py-0.5 bg-accent text-foreground text-xs font-bold rounded-full">
              Most popular
            </div>
            <h3 className="font-heading font-semibold text-foreground">Basic</h3>
            <div>
              <p className="text-4xl font-heading font-bold text-foreground">
                <span className="line-through text-muted-foreground text-2xl">$9</span>{' '}
                <span className="ml-1" style={{color:'#1a5c38'}}>$0</span>
                <span className="text-sm font-sans font-normal text-muted-foreground">/mo</span>
              </p>
              <p className="text-xs font-semibold mt-1" style={{color:'#1a5c38'}}>
                🎉 Founding offer: free for your first 6 months
              </p>
            </div>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {['Unlimited meal plans', '5 dinners per plan', 'Budget optimization', 'Save favorites & meal history'].map((li) => (
                <li key={li} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{li}
                </li>
              ))}
            </ul>
            <Link href="/signup?beta=1" className="block text-center px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors">
              Claim my 6 months free &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-foreground relative overflow-hidden">
        <div className="container mx-auto px-4 py-20 max-w-5xl text-center relative">
          <h2 className="text-4xl sm:text-5xl font-heading font-bold text-primary-foreground mb-4">Stop staring at the fridge.</h2>
          <p className="text-primary-foreground/60 mb-9 text-lg">Your first meal plan is completely free.</p>
          <Link href="/beta" className="inline-block px-10 py-4 rounded-xl bg-accent text-foreground font-bold text-base hover:bg-accent/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5">
            Claim my 6 months free &rarr;
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
            <Link href="/disclosure" className="hover:text-foreground transition-colors">Disclosure</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

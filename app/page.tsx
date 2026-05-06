import Link from 'next/link'

export default async function LandingPage() {
  let spotsRemaining = 100
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dinnerdrop.vercel.app'
    const res = await fetch(`${baseUrl}/api/stripe/beta-spots`, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      spotsRemaining = Number(data.spotsRemaining) || 100
    }
  } catch {}
  return (
    <div className="min-h-screen bg-white">

      <a href="/beta" className="block text-center py-2 text-sm font-medium" style={{backgroundColor:'#e8a838',color:'#1a5c38'}}>
        🎉 Beta: First 100 families get 6 months free &rarr; Claim your spot
      </a>
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/beta" className="px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors" style={{borderColor:'#e8a838',color:'#1a5c38'}}>Beta</Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Try free</Link>
          </div>
        </div>
      </header>
            <section className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-secondary text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            AI meal planning + grocery handoff in one tap
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-heading font-bold text-foreground leading-tight mb-6">
            Dinner,<br />handled.
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl leading-relaxed mb-10">
            Five budget-friendly weeknight dinners, planned by AI, groceries sent straight to your favorite store. Under 30 minutes every night.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Link href="/beta" className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors shadow-sm">
              Claim my 6 months free &rarr;
            </Link>
            <a href="#how-it-works" className="px-8 py-4 rounded-xl border-2 border-border text-foreground font-semibold text-base hover:bg-muted transition-colors">
              See how it works
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">No credit card required &middot; First plan is free</p>
          <div className="mt-6 flex items-start gap-3">
            <div className="flex -space-x-2 flex-shrink-0">
              {['S','J','P'].map(initial => (
                <div key={initial} className="w-7 h-7 rounded-full border-2 border-white bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{initial}</div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground leading-snug max-w-xs pt-1">
              <span className="font-semibold text-foreground">Early families love it</span> &mdash; &ldquo;I used to spend 45 minutes deciding what to cook. Now it&apos;s zero.&rdquo; &mdash; James L.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary">
        <div className="container mx-auto px-4 max-w-5xl py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-heading font-bold text-primary">{spotsRemaining}</p>
              <p className="text-xs text-muted-foreground mt-0.5">beta spots left — 6 months free</p>
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-primary">$47</p>
              <p className="text-xs text-muted-foreground mt-0.5">avg weekly grocery savings</p>
            </div>
            <div>
              <p className="text-2xl font-heading font-bold text-primary">28 min</p>
              <p className="text-xs text-muted-foreground mt-0.5">avg cook time per meal</p>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="container mx-auto px-4 py-20 max-w-5xl">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">How it works</p>
        <h2 className="text-4xl font-heading font-bold text-foreground mb-16 max-w-lg leading-tight">
          From nothing to groceries in 3 minutes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { step: '01', title: 'Tell us about your family', description: 'Budget, family size, dietary needs, how much time you have to cook. Takes 2 minutes.' },
            { step: '02', title: 'Get 5 personalized dinners', description: 'AI builds a full week of budget-friendly meals your family will actually eat.' },
            { step: '03', title: 'One tap to your grocery store', description: 'Your full grocery list, organized and deduplicated, sent straight to your cart for delivery or pickup.' },
          ].map((item) => (
            <div key={item.step} className="space-y-4">
              <p className="text-4xl font-heading font-bold text-primary/20">{item.step}</p>
              <h3 className="font-heading font-bold text-lg text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary border-y border-border">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-10">What families say</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: 'DinnerDrop cut our grocery bill by 30%. The meal plans are actually things my kids will eat.', name: 'Sarah M.', detail: 'Family of 4' },
              { quote: 'I used to spend 45 minutes just deciding what to cook. Now it takes zero minutes.', name: 'James L.', detail: 'Family of 2' },
              { quote: 'The grocery handoff is a game changer. Sunday planning takes 5 minutes now.', name: 'Priya K.', detail: 'Family of 3' },
            ].map((t) => (
              <div key={t.name} className="bg-white p-6 rounded-2xl border border-border space-y-4">
                <p className="text-sm text-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{t.name[0]}</div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Urgency bar */}
      <section className="border-y" style={{backgroundColor:'#fffbeb',borderColor:'#fde68a'}}>
        <div className="container mx-auto px-4 py-5 max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse" />
            <p className="text-sm font-semibold" style={{color:'#92400e'}}>
              {spotsRemaining} of 100 beta spots still available &mdash; 6 months completely free
            </p>
          </div>
          <div className="w-full max-w-xs mx-auto rounded-full h-1.5 mb-3" style={{backgroundColor:'#fde68a'}}>
            <div className="h-1.5 rounded-full" style={{backgroundColor:'#f59e0b',width:`${Math.max(2, 100 - spotsRemaining)}%`}} />
          </div>
          <Link href="/beta" className="text-xs font-bold underline underline-offset-2" style={{color:'#b45309'}}>
            Claim your spot before they&apos;re gone &rarr;
          </Link>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-card border-y border-border">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <h2 className="text-3xl font-heading font-bold text-center text-foreground mb-12">
            Simple pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            <div className="p-6 rounded-lg border border-border bg-background space-y-4">
              <h3 className="font-heading font-semibold text-foreground">Free</h3>
              <p className="text-3xl font-bold text-foreground">
                $0<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>1 meal plan per month</li>
                <li>5 dinners per plan</li>
                <li>Grocery list (no cart push)</li>
              </ul>
              <Link
                href="/signup"
                className="block text-center px-4 py-2 rounded-md border border-input text-foreground font-medium hover:bg-muted transition-colors"
              >
                Get started
              </Link>
            </div>

            <div className="p-6 rounded-lg border-2 border-primary bg-background space-y-4 relative">
              <div className="absolute -top-3 left-6 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                Most popular
              </div>
              <h3 className="font-heading font-semibold text-foreground">Basic</h3>
              <div>
                <p className="text-3xl font-bold text-foreground">
                  <span className="line-through text-muted-foreground">$9</span>
                  <span className="ml-2" style={{color:'#1a5c38'}}>$0</span>
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="text-xs font-semibold mt-0.5" style={{color:'#1a5c38'}}>
                  🎉 Beta offer: free for your first 6 months
                </p>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Weekly meal plans</li>
                <li>5 dinners per plan</li>
                <li>One-tap grocery cart handoff</li>
                <li>Budget optimization</li>
              </ul>
              <Link
                href="/subscribe?coupon=BETA100"
                className="block text-center px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Claim beta — 6 months free &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-foreground">
        <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
          <h2 className="text-4xl font-heading font-bold text-primary-foreground mb-4">Stop staring at the fridge.</h2>
          <p className="text-primary-foreground/60 mb-8 text-lg">Your first meal plan is completely free.</p>
          <Link href="/beta" className="inline-block px-10 py-4 rounded-xl bg-accent text-foreground font-bold text-base hover:bg-accent/90 transition-colors">
            Claim 6 months free &rarr;
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="container mx-auto px-4 py-6 max-w-5xl flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="font-heading font-bold text-sm text-primary">DinnerDrop</span>
          </div>
          <p>&copy; 2026 DinnerDrop</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

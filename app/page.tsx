import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      {/* Nav */}
      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </Link>
            <Link href="/signup" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              Try free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-20 pb-16 max-w-5xl">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-secondary text-primary text-xs font-bold px-3 py-1.5 rounded-full border border-primary/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
            AI-powered meal planning + Instacart in one tap
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-heading font-bold text-foreground leading-[1.05] mb-6">
            Dinner,<br />handled.
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl leading-relaxed mb-10">
            Five budget-friendly weeknight dinners, planned by AI, groceries sent straight to Instacart. Under 30 minutes every night.
          </p>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Link
              href="/signup"
              className="px-8 py-4 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors shadow-sm"
            >
              Get my free meal plan →
            </Link>
            
              href="#how-it-works"
              className="px-8 py-4 rounded-xl border-2 border-border text-foreground font-semibold text-base hover:bg-muted transition-colors"
            >
              See how it works
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-4">No credit card required · First plan is free</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-border bg-secondary">
        <div className="container mx-auto px-4 max-w-5xl py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-heading font-bold text-primary">2,000+</p>
              <p className="text-xs text-muted-foreground mt-0.5">families planning weekly</p>
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

      {/* How it works */}
      <section id="how-it-works" className="container mx-auto px-4 py-20 max-w-5xl">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">How it works</p>
        <h2 className="text-4xl font-heading font-bold text-foreground mb-16 max-w-lg leading-tight">
          From nothing to groceries in 3 minutes
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Tell us about your family',
              description: 'Budget, family size, dietary needs, how much time you have to cook. Takes 2 minutes.',
            },
            {
              step: '02',
              title: 'Get 5 personalized dinners',
              description: 'AI builds a full week of budget-friendly meals your family will actually eat.',
            },
            {
              step: '03',
              title: 'One tap to Instacart',
              description: 'Your full grocery list, organized and deduplicated, sent straight to your cart for delivery or pickup.',
            },
          ].map((item) => (
            <div key={item.step} className="space-y-4">
              <p className="text-4xl font-heading font-bold text-primary/20">{item.step}</p>
              <h3 className="font-heading font-bold text-lg text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-secondary border-y border-border">
        <div className="container mx-auto px-4 py-16 max-w-5xl">
          <p className="text-xs font-bold text-primary uppercase tracking-widest mb-10">What families say</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: 'DinnerDrop cut our grocery bill by 30%. The meal plans are actually things my kids will eat.',
                name: 'Sarah M.',
                detail: 'Family of 4',
              },
              {
                quote: 'I used to spend 45 minutes just deciding what to cook. Now it takes zero minutes.',
                name: 'James L.',
                detail: 'Family of 2',
              },
              {
                quote: 'The Instacart integration is a game changer. Sunday planning takes 5 minutes now.',
                name: 'Priya K.',
                detail: 'Family of 3',
              },
            ].map((t) => (
              <div key={t.name} className="bg-white p-6 rounded-2xl border border-border space-y-4">
                <p className="text-sm text-foreground leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {t.name[0]}
                  </div>
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

      {/* Pricing */}
      <section className="container mx-auto px-4 py-20 max-w-5xl">
        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-4">Pricing</p>
        <h2 className="text-4xl font-heading font-bold text-foreground mb-12">Simple, honest pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <div className="p-8 rounded-2xl border border-border bg-white space-y-6">
            <div>
              <h3 className="font-heading font-bold text-lg text-foreground mb-1">Free</h3>
              <p className="text-4xl font-heading font-bold text-foreground">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0"></span>1 meal plan to try</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0"></span>5 dinners per plan</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0"></span>Grocery list only</li>
            </ul>
            <Link href="/signup" className="block text-center px-4 py-3 rounded-xl border-2 border-border text-foreground font-semibold hover:bg-muted transition-colors">
              Get started free
            </Link>
          </div>

          <div className="p-8 rounded-2xl border-2 border-primary bg-white space-y-6 relative">
            <div className="absolute -top-3.5 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
              Most popular
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-foreground mb-1">Basic</h3>
              <p className="text-4xl font-heading font-bold text-foreground">$9<span className="text-base font-normal text-muted-foreground">/mo</span></p>
              <p className="text-xs text-muted-foreground mt-1">7-day free trial included</p>
            </div>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>Unlimited weekly meal plans</li>
              <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>Instacart cart push</li>
              <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>AI personalization</li>
              <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>Pantry tracker</li>
              <li className="flex items-center gap-2"><span className="w-4 h-4 rounded-full bg-primary flex items-center justify-center flex-shrink-0"><svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg></span>Cancel anytime</li>
            </ul>
            <Link href="/signup" className="block text-center px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors">
              Start free trial →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="bg-foreground">
        <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
          <h2 className="text-4xl font-heading font-bold text-primary-foreground mb-4">
            Stop staring at the fridge.
          </h2>
          <p className="text-primary-foreground/60 mb-8 text-lg">Your first meal plan is completely free.</p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 rounded-xl bg-accent text-foreground font-bold text-base hover:bg-accent/90 transition-colors"
          >
            Get my free meal plan →
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

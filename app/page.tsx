import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">

      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent" />
            <span className="font-heading font-bold text-xl text-primary">DinnerDrop</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Try free</Link>
          </div>
        </div>
      </header>
      {/* Hero */}
      <section className="container mx-auto px-4 py-20 max-w-4xl text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold text-foreground leading-tight">
          Five weeknight dinners.
          <br />
          One grocery run.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Tell us your budget and we&apos;ll plan your week, build your grocery list,
          and send it straight to Instacart.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="px-8 py-3 rounded-md bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
          >
            Get my free meal plan &rarr;
          </Link>
          <a
            href="#how-it-works"
            className="text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            See how it works &darr;
          </a>
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
            { step: '03', title: 'One tap to Instacart', description: 'Your full grocery list, organized and deduplicated, sent straight to your cart for delivery or pickup.' },
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
              { quote: 'The Instacart integration is a game changer. Sunday planning takes 5 minutes now.', name: 'Priya K.', detail: 'Family of 3' },
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
              <p className="text-3xl font-bold text-foreground">
                $9<span className="text-sm font-normal text-muted-foreground">/mo</span>
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Weekly meal plans</li>
                <li>5 dinners per plan</li>
                <li>Instacart cart push</li>
                <li>Budget optimization</li>
              </ul>
              <Link
                href="/signup"
                className="block text-center px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-foreground">
        <div className="container mx-auto px-4 py-16 max-w-5xl text-center">
          <h2 className="text-4xl font-heading font-bold text-primary-foreground mb-4">Stop staring at the fridge.</h2>
          <p className="text-primary-foreground/60 mb-8 text-lg">Your first meal plan is completely free.</p>
          <Link href="/signup" className="inline-block px-10 py-4 rounded-xl bg-accent text-foreground font-bold text-base hover:bg-accent/90 transition-colors">
            Get my free meal plan &rarr;
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

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { COOKWARE, cookwareUrl } from '@/lib/cookware'

const count = COOKWARE.reduce((n, g) => n + g.items.length, 0)
const title = `Kitchen Essentials for Weeknight Family Dinners (${count} Tools) — DinnerDrop`
const description = 'The pots, pans, knives and small appliances that make weeknight family dinners faster — what each one is for, which to buy first, and links to shop them.'

export const metadata: Metadata = {
  title,
  description,
  openGraph: { title, description, url: 'https://dinnerdrop.app/cookware', siteName: 'DinnerDrop', type: 'article' },
  alternates: { canonical: 'https://dinnerdrop.app/cookware' },
}

export default function CookwarePage() {
  const starters = COOKWARE.flatMap((g) => g.items).filter((i) => i.starter)
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 max-w-3xl flex items-center justify-between">
          <Link href="/" className="font-heading text-xl font-bold text-foreground">DinnerDrop</Link>
          <Link href="/recipes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Recipes
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-2">Kitchen essentials</p>
        <h1 className="text-3xl sm:text-5xl font-heading font-bold text-foreground leading-tight mb-4">
          The {count} tools that make weeknight dinners easier
        </h1>
        <p className="text-muted-foreground mb-3">
          You don&apos;t need a fancy kitchen to get dinner on the table. These are the tools DinnerDrop recipes actually call for —
          what each one is for, and which to get first if you&apos;re starting out. Every recipe also lists the cookware it needs,
          so you can set it all out before you start.
        </p>
        <p className="text-xs text-muted-foreground mb-10 border-l-2 border-accent pl-3">
          As an Amazon Associate, DinnerDrop earns from qualifying purchases. Links go to Amazon search results so you can
          compare options and prices; it never changes what you pay. <Link href="/disclosure" className="underline">Disclosure</Link>
        </p>

        <section className="mb-12 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <h2 className="text-lg font-heading font-bold text-foreground mb-1">Start here: the {starters.length}-piece weeknight kit</h2>
          <p className="text-sm text-muted-foreground mb-4">If you&apos;re setting up a kitchen (or replacing the warped, wobbly stuff), these cover nearly every DinnerDrop dinner.</p>
          <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {starters.map((it) => (
              <li key={it.id} className="text-sm flex items-center justify-between gap-3">
                <span className="text-foreground">✓ {it.name}</span>
                <a href={cookwareUrl(it)} target="_blank" rel="sponsored nofollow noopener noreferrer" className="text-xs font-semibold text-primary hover:underline whitespace-nowrap">Amazon →</a>
              </li>
            ))}
          </ul>
        </section>

        {COOKWARE.map((g) => (
          <section key={g.id} id={g.id} className="mb-10">
            <h2 className="text-xl font-heading font-bold text-foreground mb-4 pb-2 border-b border-border">{g.emoji} {g.title}</h2>
            <ul className="space-y-4">
              {g.items.map((it) => (
                <li key={it.id} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{it.name}{it.starter && <span className="ml-2 align-middle rounded-full bg-accent/15 text-accent-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Start here</span>}</p>
                    <p className="text-sm text-muted-foreground">{it.why}</p>
                  </div>
                  <a href={cookwareUrl(it)} target="_blank" rel="sponsored nofollow noopener noreferrer"
                    className="shrink-0 mt-0.5 px-3 py-1.5 rounded-lg border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/5 whitespace-nowrap">
                    See on Amazon
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mt-14 rounded-2xl bg-foreground text-primary-foreground p-6 text-center">
          <h2 className="text-xl font-heading font-bold mb-2">Got the pans. Now, what&apos;s for dinner?</h2>
          <p className="text-sm text-primary-foreground/70 mb-4">DinnerDrop plans 5 dinners for your family and budget and sends the grocery list to your Instacart cart in one tap.</p>
          <Link href="/start?utm_source=cookware&utm_medium=site" className="inline-block px-6 py-3 rounded-xl bg-accent text-accent-foreground font-semibold">Plan my week free →</Link>
        </section>
      </main>
    </div>
  )
}

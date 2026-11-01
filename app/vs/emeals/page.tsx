import type { Metadata } from 'next'
import Link from 'next/link'
import PublicHeader from '@/components/site/PublicHeader'

const title = 'DinnerDrop vs eMeals (2026): free plan, no card, family voting'
const description =
  'DinnerDrop vs eMeals, side by side: free plan with no card vs a card-required trial, $4.99 month-to-month vs $59.99 prepaid, menus built for your family vs one menu per plan.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: 'https://www.dinnerdrop.app/vs/emeals' },
  openGraph: { title, description, url: 'https://www.dinnerdrop.app/vs/emeals', siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png?v=3', width: 1200, height: 630, alt: 'DinnerDrop — Dinner, handled' }] },
  twitter: { card: 'summary_large_image', title, description, images: ['/og-image.png?v=3'] },
}

/** As of Oct 31, 2026 — eMeals' own pages (sources listed on the page). Re-check before changing any number. */
const ROWS: Array<[string, string, string]> = [
  ['Free plan', 'Yes — unlimited weekly plans, $0, for as long as you like', 'No free plan; 14-day free trial'],
  ['Card needed to start', 'No', 'Yes — card or PayPal for the trial'],
  ['Paid plan', 'Family: $4.99 a month (month-to-month) or $39 a year; first 14 days free, no card', '$59.99 a year (shown as $4.99/mo), or $37.50 every 3 months; no month-to-month dinner plan'],
  ['How the menu is made', 'Built for your family: size, budget, allergies, each person’s dislikes, your weekly protein mix', '7 recipes a week from the meal plan you choose (15 plans)'],
  ['Family input', 'Everyone in the house votes on the week’s dinners by text; tastes are learned per person', 'Not offered'],
  ['Grocery handoff', 'One tap to Instacart (any store on Instacart) or straight into a Kroger cart', 'Walmart, Kroger, Instacart, Amazon Fresh, Albertsons/Safeway, H-E-B, Shipt'],
  ['Compare your stores', 'Prices your list at each store you shop and can split it between two', 'Not offered'],
  ['Nutrition', 'On every recipe', 'On 7 of the 15 plans'],
  ['Dinner from what’s in the fridge', 'Snap a photo of the fridge, get dinners you can make', 'Search recipes by an ingredient you have'],
  ['Recipe library', '1,100+ and growing every night', '25,000+'],
  ['Apps', 'Works on any phone or computer; iPhone app coming', 'iPhone and Android apps'],
  ['Breakfast and lunch plans', 'Not yet', 'Paid add-ons'],
]

export default function VsEmealsPage() {
  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">Comparison</p>
        <h1 className="text-4xl sm:text-5xl font-heading font-bold text-foreground leading-tight mb-4">DinnerDrop vs eMeals</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mb-8">
          eMeals has planned dinners since 2003, with 15 meal plans and a team of food writers and dietitians. DinnerDrop plans the week around your own family instead of one menu per plan, and it&apos;s free to use. No card.
        </p>

        <div className="flex flex-wrap gap-3 mb-12">
          <Link href="/signup" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 shadow-sm">Start free — no card</Link>
          <Link href="/start" className="px-6 py-3 rounded-xl border border-border bg-white font-semibold text-foreground hover:bg-muted">See how it works</Link>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-left">
                <th className="px-4 py-3 font-semibold text-foreground w-1/4"> </th>
                <th className="px-4 py-3 font-semibold text-primary w-[37.5%]">DinnerDrop</th>
                <th className="px-4 py-3 font-semibold text-foreground w-[37.5%]">eMeals</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([what, dd, em]) => (
                <tr key={what} className="border-t border-border align-top">
                  <th scope="row" className="px-4 py-3 text-left font-medium text-foreground">{what}</th>
                  <td className="px-4 py-3 text-foreground">{dd}</td>
                  <td className="px-4 py-3 text-muted-foreground">{em}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          eMeals details from eMeals&apos; website, help center and checkout page on October 31, 2026. Prices change, and eMeals sometimes runs promotions; check their site for current offers.
        </p>

        <section className="grid md:grid-cols-2 gap-6 mt-12">
          <div className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">Choose eMeals if…</h2>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>You shop at Walmart for pickup or delivery.</li>
              <li>You want a native Android app today.</li>
              <li>You want breakfast and lunch plans too.</li>
              <li>You&apos;d rather pick from one set menu each week than have one built for you.</li>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-primary/30 bg-card p-6">
            <h2 className="font-heading font-bold text-xl text-foreground mb-3">Choose DinnerDrop if…</h2>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
              <li>You want to try it for real without handing over a card.</li>
              <li>Your house has picky eaters, allergies, or one person who won&apos;t eat fish.</li>
              <li>You want the whole family to vote on dinner instead of arguing about it.</li>
              <li>You shop on Instacart or at Kroger and want the list to land in your cart in one tap.</li>
              <li>You&apos;d rather pay $4.99 a month than $59.99 up front.</li>
            </ul>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-heading font-bold text-2xl text-foreground mb-3">How billing works at DinnerDrop</h2>
          <p className="text-muted-foreground max-w-2xl">
            Planning and the Instacart cart are free, always. Family is free for your first 14 days with no card. To keep it after that, add a card from Account: $4.99 a month or $39 a year. We email you three days before any charge, and you can cancel in one tap.
          </p>
        </section>

        <div className="mt-12 rounded-2xl bg-[#13261c] text-white p-8 text-center">
          <h2 className="font-heading font-bold text-3xl mb-2">Plan this week&apos;s dinners free</h2>
          <p className="text-white/70 mb-6">Five dinners for your family, one grocery list, one tap to your cart. Two minutes to set up.</p>
          <Link href="/signup" className="inline-block px-8 py-3 rounded-xl font-semibold text-[#13261c]" style={{ backgroundColor: '#e8a838' }}>Start free — no card</Link>
        </div>

        <p className="text-[11px] text-muted-foreground mt-10">
          Sources: <a className="underline" href="https://emeals.com/" rel="nofollow noopener">eMeals home page</a> · <a className="underline" href="https://support.emeals.com/portal/en/kb/articles/how-much-does-emeals-cost" rel="nofollow noopener">eMeals pricing</a> · <a className="underline" href="https://support.emeals.com/portal/en/kb/articles/does-emeals-provide-nutritional-information" rel="nofollow noopener">eMeals nutrition information</a> · <a className="underline" href="https://support.emeals.com/portal/en/kb/articles/how-can-i-search-for-recipes-in-the-app" rel="nofollow noopener">eMeals recipe search</a> · eMeals signup and checkout pages (viewed Oct 31, 2026).
          eMeals is a trademark of eMeals, Inc. DinnerDrop is not affiliated with or endorsed by eMeals.
        </p>
      </main>
    </div>
  )
}

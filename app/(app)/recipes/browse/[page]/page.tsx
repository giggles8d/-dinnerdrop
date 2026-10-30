import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { libraryIndex } from '@/lib/recipe-index'
import { COLLECTIONS } from '@/lib/collections'

// Plain, server-rendered index of the whole library, 100 dinners a page, so every recipe is
// reachable by following links (the /recipes page only ships its first 48 cards in the HTML).
export const revalidate = 600
const PER_PAGE = 100

const GUIDES = [
  { href: '/dinners/picky-eater-dinners', label: 'Picky-eater dinners' },
  { href: '/dinners/dinners-under-30-minutes', label: 'Dinners under 30 minutes' },
  { href: '/dinners/family-dinners-under-100', label: 'A week of dinners under $100' },
  { href: '/dinners/gluten-free-family-dinners', label: 'Gluten-free family dinners' },
]

export async function generateMetadata({ params }: { params: { page: string } }): Promise<Metadata> {
  const page = Number(params.page)
  const title = `All family dinner recipes, page ${page} | DinnerDrop`
  const description = `Browse every weeknight dinner in the DinnerDrop library — page ${page}. Real cook times, cost per meal, and a grocery list that lands in your Instacart cart in one tap.`
  const url = `https://www.dinnerdrop.app/recipes/browse/${page}`
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, siteName: 'DinnerDrop', type: 'website', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop' }] } }
}

export default async function BrowsePage({ params }: { params: { page: string } }) {
  const page = Number(params.page)
  if (!Number.isInteger(page) || page < 1) notFound()
  const all = await libraryIndex()
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE))
  if (page > pages) notFound()
  const rows = all.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://www.dinnerdrop.app/' },
      { '@type': 'ListItem', position: 2, name: 'Recipes', item: 'https://www.dinnerdrop.app/recipes' },
      { '@type': 'ListItem', position: 3, name: `All recipes, page ${page}`, item: `https://www.dinnerdrop.app/recipes/browse/${page}` },
    ],
  }
  const Pager = () => (
    <nav aria-label="Pages" className="flex flex-wrap items-center gap-2 text-sm">
      {page > 1 && <Link href={`/recipes/browse/${page - 1}`} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">← Previous</Link>}
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <Link key={p} href={`/recipes/browse/${p}`} aria-current={p === page ? 'page' : undefined} className={`rounded-full px-3 py-1.5 ${p === page ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-muted'}`}>{p}</Link>
      ))}
      {page < pages && <Link href={`/recipes/browse/${page + 1}`} className="rounded-full border border-border px-3 py-1.5 hover:bg-muted">Next →</Link>}
    </nav>
  )
  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/recipes" className="text-sm text-muted-foreground hover:text-foreground">← Recipe library</Link>
        <p className="mt-4 text-xs font-semibold tracking-widest text-primary uppercase">All recipes</p>
        <h1 className="text-3xl font-heading font-bold text-foreground">Every family dinner in the library</h1>
        <p className="text-muted-foreground mt-1 mb-6">{all.length} weeknight dinners, most-kept first. Page {page} of {pages}. Use the <Link href="/recipes" className="underline">recipe library</Link> to filter by protein, cuisine, time, allergens or diet.</p>
        <Pager />
        <ol className="my-6 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm" start={(page - 1) * PER_PAGE + 1}>
          {rows.map((r) => (
            <li key={r.id} className="py-1.5 border-b border-border/60">
              <Link href={`/recipes/${r.slug}`} className="font-medium text-foreground hover:underline">{r.name}</Link>
              <span className="text-muted-foreground"> · {r.time} min{r.cost > 0 ? ` · $${r.cost.toFixed(0)}` : ''}</span>
            </li>
          ))}
        </ol>
        <Pager />
        <section className="mt-10 text-sm">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Collections</h2>
          <ul className="flex flex-wrap gap-2">{COLLECTIONS.map((c) => <li key={c.slug}><Link href={`/recipes/collections/${c.slug}`} className="inline-block rounded-full border border-border px-3 py-1.5 hover:bg-muted">{c.name}</Link></li>)}</ul>
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mt-6 mb-3">Dinner guides</h2>
          <ul className="flex flex-wrap gap-2">{GUIDES.map((g) => <li key={g.href}><Link href={g.href} className="inline-block rounded-full border border-border px-3 py-1.5 hover:bg-muted">{g.label}</Link></li>)}<li><Link href="/cookware" className="inline-block rounded-full border border-border px-3 py-1.5 hover:bg-muted">Kitchen essentials</Link></li></ul>
        </section>
      </div>
    </div>
  )
}

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { getPublishedPosts, getPublishedPostBySlug } from '@/lib/published-posts'
import { AmazonRestock } from '@/components/AmazonRestock'
import { KITCHEN_TOOLS } from '@/lib/amazon-affiliate'

interface Props {
  params: { slug: string }
}

// Re-evaluate hourly so future-dated posts go live automatically on their publish date.
export const revalidate = 3600

export async function generateStaticParams() {
  return getPublishedPosts().map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPublishedPostBySlug(params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://www.dinnerdrop.app/blog/${post.slug}`,
      siteName: 'DinnerDrop',
      type: 'article',
      publishedTime: post.publishDate,
      modifiedTime: post.publishDate < '2026-10-18' ? '2026-10-18' : post.publishDate,
      images: [{ url: 'https://www.dinnerdrop.app/og-image.png?v=4', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['https://www.dinnerdrop.app/og-image.png?v=4'],
    },
    alternates: { canonical: `https://www.dinnerdrop.app/blog/${post.slug}` },
  }
}

// Render markdown-like content: headings, bullets, tables, hr, bold, links, numbered lists
function renderContent(content: string): React.ReactNode[] {
  const blocks = content.split(/\r?\n\r?\n/).filter(Boolean)

  return blocks.map((block, i) => {
    const trimmed = block.trim()

    // H2
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} className="text-2xl font-bold text-gray-900 mt-10 mb-4">
          {trimmed.slice(3)}
        </h2>
      )
    }
    // H3
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={i} className="text-xl font-semibold text-gray-800 mt-8 mb-3">
          {trimmed.slice(4)}
        </h3>
      )
    }
    // Horizontal rule
    if (trimmed === '---') {
      return <hr key={i} className="my-8 border-gray-200" />
    }
    // Markdown table
    if (trimmed.startsWith('|')) {
      const rows = trimmed.split(/\r?\n/).filter(r => r.trim() && !r.match(/^\|[-:\s|]+\|$/))
      return (
        <div key={i} className="overflow-x-auto my-6">
          <table className="w-full text-sm border-collapse rounded-lg overflow-hidden">
            <tbody>
              {rows.map((row, ri) => {
                const cells = row.split('|').filter(c => c.trim())
                return (
                  <tr key={ri} className={ri === 0 ? 'bg-[#1a5c38] text-white' : ri % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    {cells.map((cell, ci) =>
                      ri === 0
                        ? <th key={ci} className="px-4 py-2 text-left font-semibold border border-gray-200">{cell.trim()}</th>
                        : <td key={ci} className="px-4 py-2 border border-gray-200">{cell.trim()}</td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }
    // Pure bullet list
    if (trimmed.startsWith('- ')) {
      const items = trimmed.split(/\r?\n/).filter(Boolean)
      return (
        <ul key={i} className="list-disc list-outside pl-6 space-y-2 my-4 text-gray-700">
          {items.map((item, j) => (
            <li key={j}>{inlineFormat(item.replace(/^-\s*/, ''))}</li>
          ))}
        </ul>
      )
    }
    // Numbered list
    if (/^\d+\./.test(trimmed)) {
      const items = trimmed.split(/\r?\n/).filter(Boolean)
      return (
        <ol key={i} className="list-decimal list-outside pl-6 space-y-2 my-4 text-gray-700">
          {items.map((item, j) => (
            <li key={j}>{inlineFormat(item.replace(/^\d+\.\s*/, ''))}</li>
          ))}
        </ol>
      )
    }
    // Mixed block: bold label + bullets in same paragraph block
    const lines = trimmed.split(/\r?\n/)
    if (lines.some(l => l.startsWith('- '))) {
      return (
        <div key={i} className="my-4">
          {lines.map((line, j) => {
            if (line.startsWith('- ')) {
              return (
                <div key={j} className="flex gap-2 text-gray-700 mb-1 ml-2">
                  <span className="text-[#1a5c38] font-bold shrink-0 mt-0.5">•</span>
                  <span>{inlineFormat(line.slice(2))}</span>
                </div>
              )
            }
            return line.trim()
              ? <p key={j} className="text-gray-700 leading-relaxed mb-2">{inlineFormat(line)}</p>
              : null
          })}
        </div>
      )
    }
    // Regular paragraph
    return (
      <p key={i} className="text-gray-700 leading-relaxed my-4">
        {inlineFormat(trimmed)}
      </p>
    )
  })
}

function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>
    }
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} className="text-[#1a5c38] underline hover:opacity-80"
          {...(/amazon\.com\//.test(linkMatch[2]) ? { target: '_blank', rel: 'sponsored nofollow noopener noreferrer' } : {})}>
          {linkMatch[1]}
        </a>
      )
    }
    return part
  })
}

const STOP = new Set(['dinner', 'dinners', 'ideas', 'family', 'families', 'easy', 'recipes', 'recipe', 'best', 'week', 'with', 'your', 'that', 'what', 'free', 'plan', 'planning', 'meal', 'meals', 'will', 'actually', 'from', 'this', 'they', 'them', 'more', 'make', 'kids', '2026'])

/** Recipe hubs and collections a post is about, picked from its slug and keyword; always ends with the full library. */
function hubsFor(text: string): Array<{ href: string; label: string }> {
  const t = text.toLowerCase()
  const out: Array<{ href: string; label: string }> = []
  const add = (re: RegExp, href: string, label: string) => { if (re.test(t) && !out.some((o) => o.href === href)) out.push({ href, label }) }
  add(/chicken/, '/dinners/easy-chicken-dinners', 'Easy chicken dinners')
  add(/ground.?beef|hamburger/, '/dinners/ground-beef-dinners', 'Ground beef dinners')
  add(/crock|slow.?cooker/, '/dinners/slow-cooker-family-dinners', 'Slow cooker dinners')
  add(/instant.?pot|pressure/, '/recipes/collections/instant-pot', 'Instant Pot dinners')
  add(/30.?minute|quick|fast|busy|weeknight|20.?minute/, '/dinners/dinners-under-30-minutes', '30-minute dinners')
  add(/kid|picky|toddler|family/, '/dinners/kid-friendly-dinners', 'Kid-friendly dinners')
  add(/picky/, '/dinners/picky-eater-dinners', 'Picky-eater dinners')
  add(/cheap|budget|\$|frugal|save|money|grocery/, '/dinners/family-dinners-under-100', 'Cheap family dinners')
  add(/heart|healthy|low.?sodium/, '/dinners/heart-healthy-dinners', 'Heart-healthy dinners')
  add(/diabet|low.?carb|blood.?sugar/, '/dinners/diabetic-friendly-dinners', 'Diabetic-friendly dinners')
  add(/mediterranean/, '/dinners/mediterranean-family-dinners', 'Mediterranean dinners')
  add(/gluten/, '/dinners/gluten-free-family-dinners', 'Gluten-free dinners')
  add(/thanksgiving|leftover/, '/recipes/collections/thanksgiving', 'Thanksgiving-week dinners')
  add(/christmas|holiday/, '/recipes/collections/holiday', 'Holiday dinners')
  add(/game.?day|super.?bowl|football/, '/recipes/collections/game-day', 'Game-day dinners')
  add(/soup|stew|casserole|cozy|winter/, '/recipes/collections/cozy', 'Cozy dinners')
  out.splice(4)
  out.push({ href: '/recipes', label: 'All 1,400+ recipes' })
  return out
}

export default function BlogPostPage({ params }: Props) {
  // Future-dated posts 404 until their publish date (B-04).
  const post = getPublishedPostBySlug(params.slug)
  if (!post) notFound()

  // Internal links to other posts: closest topic first (shared words in the slug), then newest (Nov 21 2026 review:
  // every post showed the same 3 newest posts).
  const words = (s: string) => new Set(s.toLowerCase().replace(/crock.?pot/g, 'slowcooker').replace(/slow.?cooker/g, 'slowcooker').split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w)))
  const textOf = (p: { slug: string; primaryKeyword: string; title: string }) => `${p.slug} ${p.primaryKeyword} ${p.title}`
  const mine = words(textOf(post!))
  const related = getPublishedPosts().filter((p) => p.slug !== post!.slug)
    .map((p, i) => ({ p, i, score: Array.from(words(textOf(p))).filter((w) => mine.has(w)).length }))
    .sort((a, b) => b.score - a.score || a.i - b.i).slice(0, 3).map((x) => x.p)
  const hubs = hubsFor(`${post!.slug} ${post!.primaryKeyword}`)

  // Every published post was reviewed and updated on 2026-10-18 (offer, pricing,
  // store copy). Posts published after that date carry their own publish date.
  const SITE_REVIEW_DATE = '2026-10-18'
  const updatedOn = post!.publishDate < SITE_REVIEW_DATE ? SITE_REVIEW_DATE : post!.publishDate

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post!.title,
    description: post!.description,
    datePublished: post!.publishDate,
    dateModified: updatedOn,
    author: { '@type': 'Organization', name: 'DinnerDrop' },
    publisher: {
      '@type': 'Organization',
      name: 'DinnerDrop',
      logo: { '@type': 'ImageObject', url: 'https://www.dinnerdrop.app/og-image.png?v=4' },
    },
    image: 'https://www.dinnerdrop.app/og-image.png?v=4',
    url: `https://www.dinnerdrop.app/blog/${post!.slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://www.dinnerdrop.app/blog/${post!.slug}` },
  }

  return (
    <main className="min-h-screen bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <div className="bg-[#1a5c38] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/blog" className="text-[#e8a838] text-sm hover:underline mb-4 inline-block">
            &larr; Back to Blog
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-white leading-tight mt-2">
            {post!.title}
          </h1>
          <p className="text-gray-300 mt-3 text-sm">
            {new Date(post!.publishDate).toLocaleDateString('en-US', {
              month: 'long', day: 'numeric', year: 'numeric',
            })}
            {updatedOn !== post!.publishDate && (
              <> &middot; Updated {new Date(updatedOn).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</>
            )}{' '}
            &middot; {post!.readingTimeMinutes} min read
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        {renderContent(post!.content)}

        {/* Affiliate: kitchen tools */}
        <div className="mt-14">
          <AmazonRestock
            groups={[KITCHEN_TOOLS]}
            heading="Stock your kitchen for weeknight dinners"
            subheading="The everyday tools that make these recipes faster — shop them on Amazon."
          />
        </div>

        {/* Make these tonight: the recipe pages this post is about (Nov 21 2026 review: 40 posts linked to 0 recipes). */}
        <div className="mt-14 rounded-2xl border border-[#1a5c38]/20 bg-[#f3f7f4] p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Make these tonight</h2>
          <p className="text-sm text-gray-600 mb-4">Real family recipes with honest cook times, cost per dinner and a one-tap grocery list.</p>
          <div className="flex flex-wrap gap-2">
            {hubs.map((h) => (
              <Link key={h.href} href={h.href} className="inline-flex items-center rounded-full border border-[#1a5c38]/30 bg-white px-4 py-2 text-sm font-semibold text-[#1a5c38] hover:bg-[#1a5c38] hover:text-white transition-colors">{h.label} →</Link>
            ))}
          </div>
        </div>

        {/* Keep reading — internal links for SEO crawl + dwell time */}
        {related.length > 0 && (
          <div className="mt-16">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Keep reading</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/blog/${r.slug}`}
                  className="block rounded-xl border border-gray-200 p-4 hover:border-[#1a5c38] transition-colors"
                >
                  <p className="font-semibold text-gray-900 leading-snug">{r.title}</p>
                  <p className="text-sm text-gray-500 mt-2">{r.readingTimeMinutes} min read</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 bg-[#1a5c38] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to stop the 5pm scramble?
          </h2>
          <p className="text-[#e8a838] mb-6">
            DinnerDrop plans 5 dinners + grocery list in 30 seconds.
            Free, no card needed — your whole list opens in Instacart in one tap.
          </p>
          <Link
            href="/start"
            className="inline-block bg-[#e8a838] text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Start free — no card needed &rarr;
          </Link>
        </div>
      </article>
    </main>
  )
}

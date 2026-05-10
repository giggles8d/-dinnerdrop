import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'
import { getPostBySlug, getAllPostSlugs } from '@/lib/blog-posts'

interface Props {
  params: { slug: string }
}

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = getPostBySlug(params.slug)
  if (!post) return {}
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://dinnerdrop.app/blog/${post.slug}`,
      siteName: 'DinnerDrop',
      type: 'article',
      publishedTime: post.publishDate,
      images: [{ url: 'https://dinnerdrop.app/og-image.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
      images: ['https://dinnerdrop.app/og-image.png'],
    },
    alternates: { canonical: `https://dinnerdrop.app/blog/${post.slug}` },
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
        <a key={i} href={linkMatch[2]} className="text-[#1a5c38] underline hover:opacity-80">
          {linkMatch[1]}
        </a>
      )
    }
    return part
  })
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post!.title,
    description: post!.description,
    datePublished: post!.publishDate,
    author: { '@type': 'Organization', name: 'DinnerDrop' },
    publisher: {
      '@type': 'Organization',
      name: 'DinnerDrop',
      logo: { '@type': 'ImageObject', url: 'https://dinnerdrop.app/og-image.png' },
    },
    image: 'https://dinnerdrop.app/og-image.png',
    url: `https://dinnerdrop.app/blog/${post!.slug}`,
    mainEntityOfPage: { '@type': 'WebPage', '@id': `https://dinnerdrop.app/blog/${post!.slug}` },
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
            })}{' '}
            &middot; {post!.readingTimeMinutes} min read
          </p>
        </div>
      </div>

      {/* Article body */}
      <article className="max-w-3xl mx-auto px-4 py-12">
        {renderContent(post!.content)}

        {/* CTA */}
        <div className="mt-16 bg-[#1a5c38] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to stop the 5pm scramble?
          </h2>
          <p className="text-[#e8a838] mb-6">
            DinnerDrop plans 5 dinners + grocery list in 30 seconds.
            First 100 families get 6 months completely free.
          </p>
          <Link
            href="/beta"
            className="inline-block bg-[#e8a838] text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Claim my free spot &rarr;
          </Link>
        </div>
      </article>
    </main>
  )
}

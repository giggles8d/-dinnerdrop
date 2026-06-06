import Link from 'next/link'
import { getPublishedPosts } from '@/lib/published-posts'

// Re-evaluate hourly so future-dated posts appear automatically on their publish date.
export const revalidate = 3600

export default function BlogIndexPage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-[#1a5c38] py-16 px-4 text-center">
        <h1 className="text-4xl font-bold text-white mb-3">DinnerDrop Blog</h1>
        <p className="text-[#e8a838] text-lg max-w-xl mx-auto">
          Meal planning tips and dinner ideas for busy families
        </p>
      </div>

      {/* Posts */}
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {getPublishedPosts().sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime()).map((post) => (
            <article
              key={post.slug}
              className="border border-gray-200 rounded-xl p-6 hover:border-[#1a5c38] transition-colors"
            >
              <Link href={`/blog/${post.slug}`} className="block group">
                <p className="text-xs text-gray-400 mb-2 uppercase tracking-wide">
                  {new Date(post.publishDate).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  &middot; {post.readingTimeMinutes} min read
                </p>
                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#1a5c38] transition-colors">
                  {post.title}
                </h2>
                <p className="text-gray-600 leading-relaxed">{post.description}</p>
                <span className="inline-block mt-4 text-[#1a5c38] font-semibold text-sm">
                  Read more &rarr;
                </span>
              </Link>
            </article>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 bg-[#1a5c38] rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">
            Ready to stop the 5pm scramble?
          </h2>
          <p className="text-[#e8a838] mb-6">
            DinnerDrop plans 5 dinners + grocery list in 30 seconds. First 100 families get 6 months free.
          </p>
          <Link
            href="/beta"
            className="inline-block bg-[#e8a838] text-white font-bold px-8 py-3 rounded-lg hover:opacity-90 transition-opacity"
          >
            Claim my free spot &rarr;
          </Link>
        </div>
      </div>
    </main>
  )
}

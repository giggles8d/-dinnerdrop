import { Metadata } from 'next'

export const metadata: Metadata = {
  title: {
    template: '%s | DinnerDrop Blog',
    default: 'DinnerDrop Blog — Meal Planning Tips for Busy Families',
  },
  description:
    'Practical meal planning advice, dinner ideas, and AI-powered tips for busy families. ' +
    'Stop the 5pm scramble — plan smarter with DinnerDrop.',
  openGraph: {
    siteName: 'DinnerDrop',
    locale: 'en_US',
    type: 'website',
    images: [{ url: 'https://dinnerdrop.app/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@dinnerdropapp',
    images: ['https://dinnerdrop.app/og-image.png'],
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-14">
          <a href="/" className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span className="font-bold text-lg text-green-900">DinnerDrop</span>
          </a>
          <nav className="flex items-center gap-4 text-sm font-medium text-gray-500">
            <a href="/blog" className="hover:text-gray-900 transition-colors">Blog</a>
            <a href="/beta" className="px-4 py-1.5 rounded-lg bg-green-800 text-white text-sm font-semibold hover:bg-green-700 transition-colors">Claim my 6 months free</a>
          </nav>
        </div>
      </header>
      {children}
    </>
  )
}

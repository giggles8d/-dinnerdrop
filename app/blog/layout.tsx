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
  return <>{children}</>
}

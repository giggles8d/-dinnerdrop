import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dinner, handled. — DinnerDrop Free Trial',
  description:
    '5 dinners planned in 30 seconds. Groceries sent to your store in one tap. Join 100 families getting 6 months completely free.',
  openGraph: {
    title: 'Dinner, handled. — DinnerDrop Free Trial',
    description:
      '5 dinners planned in 30 seconds. One-tap grocery handoff to Walmart, Kroger, Amazon Fresh, Target, or Instacart. 6 months free for beta members.',
    url: 'https://dinnerdrop.app/beta-v2',
    siteName: 'DinnerDrop',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop — Dinner, handled.' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Dinner, handled. — DinnerDrop Free Trial',
    description: '5 dinners planned in 30 seconds. 6 months free for beta members.',
    images: ['/og-image.png'],
  },
  robots: { index: false, follow: false },
}

export default function BetaV2Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

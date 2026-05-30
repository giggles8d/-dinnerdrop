import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Start Your Free Trial — DinnerDrop',
  description: 'Join DinnerDrop free. AI-powered dinner planning for busy families — 5 personalized meals and a grocery list in one tap. 7-day free trial.',
  openGraph: {
    title: 'Start Your Free Trial — DinnerDrop',
    description: 'Get 5 personalized dinners + one-tap grocery list. First 100 beta families get 6 months completely free. $0 today, cancel anytime.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop — Start Free Trial' }],
    url: 'https://dinnerdrop.app/subscribe',
    siteName: 'DinnerDrop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Start Your Free Trial — DinnerDrop',
    description: '5 dinners planned in 30 seconds. One-tap grocery list. 7-day free trial.',
    images: ['/og-image.png'],
  },
}

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

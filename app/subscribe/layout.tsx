import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Start Your Free Trial — DinnerDrop',
  description: 'Join DinnerDrop. AI-powered dinner planning for busy families — 5 personalized meals and a grocery list in your Instacart cart in one tap. 14-day free trial, then $9/month.',
  openGraph: {
    title: 'Start Your Free Trial — DinnerDrop',
    description: 'Get 5 personalized dinners + a one-tap Instacart cart. 14-day free trial, $0 today, cancel anytime.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop — Start Free Trial' }],
    url: 'https://dinnerdrop.app/subscribe',
    siteName: 'DinnerDrop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Start Your Free Trial — DinnerDrop',
    description: '5 dinners planned in 30 seconds. One-tap Instacart cart. Try it free for 14 days.',
    images: ['/og-image.png'],
  },
}

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

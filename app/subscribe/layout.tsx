import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DinnerDrop Family — 14-Day Free Trial',
  description: 'Add the whole household: Kroger cart push, priority support, and new family features first. $4.99/month or $39/year after a 14-day free trial. Cancel anytime.',
  alternates: { canonical: 'https://www.dinnerdrop.app/subscribe' },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'DinnerDrop Family — 14-Day Free Trial',
    description: '$4.99/month or $39/year after a 14-day free trial. $0 today, cancel anytime.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop Family' }],
    url: 'https://www.dinnerdrop.app/subscribe',
    siteName: 'DinnerDrop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DinnerDrop Family — 14-Day Free Trial',
    description: '$4.99/month or $39/year after a 14-day free trial. $0 today, cancel anytime.',
    images: ['/og-image.png'],
  },
}

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

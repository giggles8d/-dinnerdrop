import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Join the Waitlist — DinnerDrop',
  description: 'All 100 beta spots are claimed. Join the waitlist to be first when more open.',
  openGraph: {
    title: 'Join the Waitlist — DinnerDrop',
    description: 'All 100 beta spots are claimed. Join the waitlist to be notified when more open.',
    url: 'https://dinnerdrop.app/waitlist',
    siteName: 'DinnerDrop',
    images: [{ url: 'https://dinnerdrop.app/og-image.png', width: 1200, height: 630 }],
  },
  robots: { index: true, follow: true },
}

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Account — DinnerDrop',
  description: 'Create your DinnerDrop account — founding family offer: 6 months free, no credit card. AI-powered dinner planning for busy families.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

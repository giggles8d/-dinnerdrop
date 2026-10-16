import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Account — DinnerDrop',
  description: 'Create your DinnerDrop account — 14-day free trial of AI-powered dinner planning for busy families. $0 today, cancel anytime.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Account — DinnerDrop',
  description: 'Create your DinnerDrop account and start your free 7-day trial. AI-powered dinner planning for busy families.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

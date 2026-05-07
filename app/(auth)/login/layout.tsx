import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Log In — DinnerDrop',
  description: 'Log in to your DinnerDrop account to access your personalized dinner plans and grocery lists.',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

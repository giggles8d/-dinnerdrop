import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Account — DinnerDrop',
  description: 'Create your free DinnerDrop account — five weeknight dinners planned for your family and your grocery list in your Instacart cart in one tap. No card needed.',
  robots: { index: false, follow: false },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

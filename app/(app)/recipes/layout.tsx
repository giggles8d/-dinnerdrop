import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Family Dinner Recipes With a One-Tap Grocery List | DinnerDrop',
  description: 'Weeknight dinners families actually kept: real photos, honest times, cost per meal, and a grocery list that lands in your Instacart cart in one tap. Browse free.',
  alternates: { canonical: 'https://www.dinnerdrop.app/recipes' },
  openGraph: { title: 'DinnerDrop Recipe Library', description: 'Weeknight dinners families actually kept, each with a one-tap grocery list.', url: 'https://www.dinnerdrop.app/recipes', images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'DinnerDrop' }] },
  twitter: { card: 'summary_large_image', title: 'DinnerDrop Recipe Library', description: 'Weeknight dinners families actually kept, each with a one-tap grocery list.', images: ['/og-image.png'] },
}

export default function RecipesLayout({ children }: { children: React.ReactNode }) {
  return children
}

import type { Metadata } from 'next'

// /deals is a signed-in tool that shows "Loading your stores' ads…" to Google: keep it out of search (Nov 21 2026 review).
export const metadata: Metadata = { title: 'Deals | DinnerDrop', robots: { index: false, follow: true } }

export default function DealsLayout({ children }: { children: React.ReactNode }) {
  return children
}

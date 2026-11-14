'use client'

/**
 * Fast start for families who came from the weekend $5 gift card ad (signup_source.c = 'weekend-receipt', Nov 14
 * 2026: 5 of 6 left the 8-step setup within seconds). They skip setup and see this checklist over a ready week.
 */
import Link from 'next/link'
import { Check } from 'lucide-react'

export default function GiftCardStart({ hasWeek, onPersonalize }: { hasWeek: boolean; onPersonalize: () => void }) {
  const row = (done: boolean, n: number, text: React.ReactNode) => (
    <li className="flex gap-3 items-start">
      <span className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-primary text-primary-foreground' : 'border-2 border-primary/40 text-primary'}`}>
        {done ? <Check className="h-3.5 w-3.5" /> : n}
      </span>
      <span className="text-sm leading-snug text-foreground">{text}</span>
    </li>
  )
  return (
    <div className="mb-5 rounded-2xl border-2 px-5 py-4 shadow-sm" style={{ borderColor: '#e8a33d', backgroundColor: '#fff8e8' }}>
      <p className="text-base font-bold" style={{ color: '#1a5c38' }}>🎁 Your $5 Amazon gift card in 3 steps</p>
      <ol className="mt-3 space-y-2.5">
        {row(hasWeek, 1, <><b>Your dinners are ready.</b> Keep them or tap any dinner to swap it.</>)}
        {row(false, 2, <><b>Shop with Instacart</b> from your grocery list, today or Sunday.</>)}
        {row(false, 3, <><b>Upload the receipt</b> on your grocery list page by Monday 11:59 PM ET.</>)}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Link href="/grocery-list" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90">Go to my grocery list &rarr;</Link>
        <button type="button" onClick={onPersonalize} className="text-sm font-semibold text-primary underline-offset-2 hover:underline">Fit it to my family (optional)</button>
      </div>
      <p className="mt-3 text-xs text-gray-600">Instacart orders only. One $5 Amazon gift card per family, first 50 families, emailed within 7 days.</p>
    </div>
  )
}

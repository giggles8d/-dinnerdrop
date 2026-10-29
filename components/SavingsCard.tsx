'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Savings } from '@/lib/savings'

/** "You've saved about $X vs takeout" — from the weeks this family actually shopped (see lib/savings.ts). */
export default function SavingsCard() {
  const [s, setS] = useState<Savings | null>(null)
  useEffect(() => { fetch('/api/savings', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then(setS).catch(() => {}) }, [])
  if (!s || s.weeks < 1 || s.saved <= 0) return null
  return (
    <div className="mt-4 p-4 rounded-lg border border-emerald-200 bg-emerald-50">
      <p className="text-sm text-emerald-900">
        <span className="text-lg font-heading font-bold">💰 You&apos;ve saved about ${s.saved.toLocaleString()}</span>{' '}
        vs takeout since you started.
      </p>
      <p className="text-xs text-emerald-800/80 mt-1">
        {s.dinners} dinner{s.dinners === 1 ? '' : 's'} from {s.weeks} week{s.weeks === 1 ? '' : 's'} you shopped · about ${s.perServing.toFixed(2)} a serving vs ${s.takeoutPerServing} for takeout.{' '}
        <Link href="/settings" className="underline underline-offset-2">Change takeout cost</Link>
      </p>
    </div>
  )
}

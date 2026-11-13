'use client'

/** Weekend receipt reward banner (lib/receipt-reward). Hidden outside the window. */
import { useEffect, useState } from 'react'
import { receiptRewardOpen, RECEIPT_REWARD_TERMS } from '@/lib/receipt-reward'

export default function ReceiptRewardBanner({ variant = 'app' }: { variant?: 'app' | 'start' }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { setOpen(receiptRewardOpen()) }, [])
  if (!open) return null
  if (variant === 'start') {
    return (
      <div className="mx-auto max-w-2xl mb-5 sm:mb-6 rounded-2xl border-2 px-5 py-4 text-left shadow-sm" style={{ borderColor: '#e8a33d', backgroundColor: '#fff8e8' }}>
        <p className="text-sm font-bold" style={{ color: '#1a5c38' }}>🛒 This weekend only: order your groceries through DinnerDrop, upload the receipt, get a $5 Instacart gift card.</p>
        <p className="text-sm text-gray-700 mt-1">{RECEIPT_REWARD_TERMS}</p>
      </div>
    )
  }
  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <p className="font-semibold">🛒 This weekend: upload your receipt, get a $5 Instacart gift card.</p>
      <p className="mt-1">{RECEIPT_REWARD_TERMS}</p>
    </div>
  )
}

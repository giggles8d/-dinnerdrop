'use client'

import { useEffect, useState } from 'react'
import { isNativeApp } from '@/lib/native'

// Weekend offer (Nov 7–8 2026): first cart by Sunday 11:59 PM ET = 3 months of Family free. Mirrors lib/cart-offer.ts.
const ENDS = Date.parse('2026-11-09T05:00:00Z')

export default function CartOfferBanner({ compact = false }: { compact?: boolean }) {
  const [show, setShow] = useState(false)
  useEffect(() => { setShow(Date.now() < ENDS && !isNativeApp()) }, [])
  if (!show) return null
  return (
    <div className={`w-full text-center ${compact ? 'rounded-xl px-4 py-3' : 'px-4 py-2.5'}`} style={{ backgroundColor: '#fff3c4', color: '#1a5c38' }}>
      <p className={`${compact ? 'text-sm' : 'text-sm sm:text-base'} font-semibold leading-snug`}>
        <span className="uppercase tracking-wide text-xs font-bold mr-2">This weekend only</span>
        Sign up and send your first grocery cart by Sunday night and get <b>3 months of Family free</b>. No card.
      </p>
    </div>
  )
}

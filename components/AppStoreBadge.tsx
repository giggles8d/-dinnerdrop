'use client'

/**
 * "Download on the App Store" link (Apple approved the iPhone app Nov 14 2026). Hidden inside the app itself.
 * Text button (no Apple artwork): black, rounded, like the store badge.
 */
import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { isNativeApp } from '@/lib/native'

export const APP_STORE_URL = 'https://apps.apple.com/app/id6824634810'

export default function AppStoreBadge({ campaign = 'site', className = '' }: { campaign?: string; className?: string }) {
  const [show, setShow] = useState(true)
  useEffect(() => { if (isNativeApp()) setShow(false) }, [])
  if (!show) return null
  return (
    <a
      href={`${APP_STORE_URL}?pt=dinnerdrop&ct=${encodeURIComponent(campaign)}&mt=8`}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-2.5 rounded-xl bg-black px-4 py-2.5 text-white hover:bg-black/85 transition-colors ${className}`}
    >
      <Smartphone className="h-5 w-5" aria-hidden />
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] font-medium opacity-80">Download on the</span>
        <span className="text-[15px] font-semibold">App Store</span>
      </span>
    </a>
  )
}

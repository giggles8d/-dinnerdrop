'use client'

import { useEffect } from 'react'

// Registers the service worker that makes DinnerDrop installable (Add to Home
// Screen on iOS/Android, and the Google Play Trusted Web Activity wrapper).
export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
    if (process.env.NODE_ENV !== 'production') return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {})
  }, [])
  return null
}

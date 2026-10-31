'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { UtensilsCrossed, ShoppingCart, Refrigerator, Package, User, RefreshCw } from 'lucide-react'
import { hideSplash, isNativeApp, tapHaptic } from '@/lib/native'

const TABS = [
  { href: '/dashboard', label: 'Dinners', icon: UtensilsCrossed, match: ['/dashboard', '/recipe', '/plan', '/favorites', '/history', '/recipes'] },
  { href: '/grocery-list', label: 'List', icon: ShoppingCart, match: ['/grocery-list'] },
  { href: '/tonight', label: 'Tonight', icon: Refrigerator, match: ['/tonight'] },
  { href: '/pantry', label: 'Pantry', icon: Package, match: ['/pantry'] },
  { href: '/account', label: 'Me', icon: User, match: ['/account', '/settings', '/join'] },
]

/**
 * The iOS/Android shell's app chrome: a bottom tab bar, pull-to-refresh, and the splash screen
 * held until the first page has painted. Renders nothing on the website.
 */
export default function NativeShell() {
  const pathname = usePathname()
  const router = useRouter()
  const [native, setNative] = useState(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    if (!isNativeApp()) return
    setNative(true)
    // Hold the splash until this page is on screen, then fade it (no white flash of a loading web page).
    const t = setTimeout(() => hideSplash(), 150)
    return () => clearTimeout(t)
  }, [])

  // Pull-to-refresh: a downward drag from the very top reloads the page's data.
  useEffect(() => {
    if (!native) return
    const onStart = (e: TouchEvent) => { startY.current = window.scrollY <= 0 ? e.touches[0].clientY : null }
    const onMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy * 0.5, 90))
      else setPull(0)
    }
    const onEnd = () => {
      if (startY.current == null) return
      if (pull >= 70 && !refreshing) {
        setRefreshing(true); tapHaptic()
        router.refresh()
        setTimeout(() => { setRefreshing(false); setPull(0); window.location.reload() }, 400)
      } else setPull(0)
      startY.current = null
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    return () => { window.removeEventListener('touchstart', onStart); window.removeEventListener('touchmove', onMove); window.removeEventListener('touchend', onEnd) }
  }, [native, pull, refreshing, router])

  if (!native) return null
  const inApp = TABS.some((t) => t.match.some((m) => pathname === m || pathname.startsWith(m + '/')))
  if (!inApp) return null

  return (
    <>
      {(pull > 0 || refreshing) && (
        <div className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none" style={{ top: `calc(env(safe-area-inset-top) + 8px)`, opacity: Math.min(pull / 70, 1) }}>
          <div className="w-9 h-9 rounded-full bg-card shadow-md border border-border flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 text-primary ${refreshing ? 'animate-spin' : ''}`} style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }} />
          </div>
        </div>
      )}
      <nav aria-label="App" className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <ul className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: Icon, match }) => {
            const active = match.some((m) => pathname === m || pathname.startsWith(m + '/'))
            return (
              <li key={href}>
                <Link href={href} onClick={() => tapHaptic()} className={`flex flex-col items-center justify-center gap-0.5 h-14 text-[11px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`} aria-current={active ? 'page' : undefined}>
                  <Icon className="w-6 h-6" strokeWidth={active ? 2.4 : 1.8} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}

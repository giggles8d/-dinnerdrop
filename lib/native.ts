// Helpers for the DinnerDrop native shell (apps/mobile, Capacitor).
// The shell loads www.dinnerdrop.app inside a native WebView and injects
// `window.Capacitor`; on the plain website these are all no-ops.

type CapacitorGlobal = {
  isNativePlatform?: () => boolean
  getPlatform?: () => 'ios' | 'android' | 'web'
  Plugins?: {
    Browser?: { open: (opts: { url: string; presentationStyle?: 'fullscreen' | 'popover' }) => Promise<void> }
    Haptics?: { impact: (opts: { style: 'HEAVY' | 'MEDIUM' | 'LIGHT' }) => Promise<void> }
    Share?: { share: (opts: { title?: string; text?: string; url?: string }) => Promise<unknown> }
    PushNotifications?: {
      requestPermissions: () => Promise<{ receive: string }>
      register: () => Promise<void>
    }
  }
}

function cap(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null
}

export function isNativeApp(): boolean {
  return !!cap()?.isNativePlatform?.()
}

export function nativePlatform(): 'ios' | 'android' | 'web' {
  return cap()?.getPlatform?.() ?? 'web'
}

/** Open an external URL (Stripe, Instacart, Kroger). In the native shell this
 *  uses the system browser sheet so checkout and store carts never render
 *  inside the app WebView; on the web it behaves like window.open / href. */
export async function openExternal(url: string, mode: 'newTab' | 'sameTab' = 'newTab') {
  const browser = cap()?.Plugins?.Browser
  if (isNativeApp() && browser) {
    await browser.open({ url, presentationStyle: 'popover' })
    return
  }
  if (mode === 'sameTab') window.location.href = url
  else window.open(url, '_blank', 'noopener,noreferrer')
}

export async function tapHaptic() {
  try { await cap()?.Plugins?.Haptics?.impact({ style: 'LIGHT' }) } catch { /* no-op on web */ }
}

export async function nativeShare(opts: { title?: string; text?: string; url?: string }): Promise<boolean> {
  const share = cap()?.Plugins?.Share
  if (isNativeApp() && share) {
    try { await share.share(opts); return true } catch { return false }
  }
  if (typeof navigator !== 'undefined' && navigator.share) {
    try { await navigator.share(opts); return true } catch { return false }
  }
  return false
}

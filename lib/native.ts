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
    LocalNotifications?: {
      requestPermissions: () => Promise<{ display: string }>
      checkPermissions: () => Promise<{ display: string }>
      schedule: (opts: { notifications: LocalNotice[] }) => Promise<unknown>
      getPending: () => Promise<{ notifications: Array<{ id: number }> }>
      cancel: (opts: { notifications: Array<{ id: number }> }) => Promise<void>
      addListener: (ev: 'localNotificationActionPerformed', fn: (e: { notification: { extra?: { url?: string } } }) => void) => Promise<unknown>
    }
    Camera?: {
      getPhoto: (opts: { quality?: number; resultType: 'base64' | 'uri' | 'dataUrl'; source?: 'CAMERA' | 'PHOTOS' | 'PROMPT'; width?: number; correctOrientation?: boolean; promptLabelHeader?: string; promptLabelPhoto?: string; promptLabelPicture?: string }) => Promise<{ base64String?: string; format: string }>
    }
    Preferences?: {
      get: (opts: { key: string }) => Promise<{ value: string | null }>
      set: (opts: { key: string; value: string }) => Promise<void>
      remove: (opts: { key: string }) => Promise<void>
    }
  }
}

type LocalNotice = {
  id: number
  title: string
  body: string
  schedule: { at: Date; allowWhileIdle?: boolean }
  extra?: { url?: string }
}

function cap(): CapacitorGlobal | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor ?? null
}

export function isNativeApp(): boolean {
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('DinnerDropApp')) return true
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

/* ---------- native-only features (no-ops on the website) ---------- */

/** Ask once for notification permission in the native shell. */
export async function requestReminderPermission(): Promise<boolean> {
  const ln = cap()?.Plugins?.LocalNotifications
  if (!isNativeApp() || !ln) return false
  try {
    const cur = await ln.checkPermissions()
    if (cur.display === 'granted') return true
    const r = await ln.requestPermissions()
    return r.display === 'granted'
  } catch { return false }
}

const REMINDER_IDS = { min: 41000, max: 41999 }
const DAY_INDEX: Record<string, number> = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }

/**
 * Schedule on-device "Tonight: <dinner>" reminders for the week's plan at the
 * family's chosen time (default 4:30 PM), replacing any earlier ones. Runs
 * entirely on the phone — nothing is sent from the server.
 */
export async function scheduleDinnerReminders(
  meals: Array<{ id?: string; name: string; day: string; prepTime?: number }>,
  opts: { hour?: number; minute?: number; weekStart?: string } = {},
): Promise<number> {
  const ln = cap()?.Plugins?.LocalNotifications
  if (!isNativeApp() || !ln) return 0
  const hour = opts.hour ?? 16, minute = opts.minute ?? 30
  try {
    const pending = await ln.getPending()
    const mine = pending.notifications.filter((n) => n.id >= REMINDER_IDS.min && n.id <= REMINDER_IDS.max)
    if (mine.length) await ln.cancel({ notifications: mine })
    const now = new Date()
    const notes: LocalNotice[] = []
    for (const m of meals) {
      const dow = DAY_INDEX[m.day]
      if (dow == null) continue
      const at = new Date(now)
      at.setHours(hour, minute, 0, 0)
      const delta = (dow - at.getDay() + 7) % 7
      at.setDate(at.getDate() + delta)
      if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 7)
      // Only this plan week (and never more than 7 days out).
      if (at.getTime() - now.getTime() > 7 * 86400000) continue
      const mins = m.prepTime ? ` · ${m.prepTime} min` : ''
      notes.push({
        id: REMINDER_IDS.min + dow,
        title: `Tonight: ${m.name}`,
        body: `${m.day}${mins} — tap for the recipe.`,
        schedule: { at, allowWhileIdle: true },
        extra: { url: m.id ? `/recipe/${m.id}` : '/dashboard' },
      })
    }
    if (notes.length) await ln.schedule({ notifications: notes })
    return notes.length
  } catch { return 0 }
}

/** Cancel every dinner reminder (user turned them off). */
export async function cancelDinnerReminders() {
  const ln = cap()?.Plugins?.LocalNotifications
  if (!isNativeApp() || !ln) return
  try {
    const pending = await ln.getPending()
    const mine = pending.notifications.filter((n) => n.id >= REMINDER_IDS.min && n.id <= REMINDER_IDS.max)
    if (mine.length) await ln.cancel({ notifications: mine })
  } catch { /* no-op */ }
}

/** Route notification taps to the page named in `extra.url`. Call once per app load. */
export function listenForNotificationTaps(go: (url: string) => void) {
  const ln = cap()?.Plugins?.LocalNotifications
  if (!isNativeApp() || !ln) return
  ln.addListener('localNotificationActionPerformed', (e) => { const url = e.notification.extra?.url; if (url) go(url) }).catch(() => {})
}

/** Small on-device key/value store shared with the offline page. */
export async function nativePrefGet(key: string): Promise<string | null> {
  const p = cap()?.Plugins?.Preferences
  if (!isNativeApp() || !p) return null
  try { return (await p.get({ key })).value } catch { return null }
}
export async function nativePrefSet(key: string, value: string) {
  const p = cap()?.Plugins?.Preferences
  if (!isNativeApp() || !p) return
  try { await p.set({ key, value }) } catch { /* no-op */ }
}
export async function nativePrefRemove(key: string) {
  const p = cap()?.Plugins?.Preferences
  if (!isNativeApp() || !p) return
  try { await p.remove({ key }) } catch { /* no-op */ }
}

/**
 * Native camera / photo picker. Returns a File like an <input type=file>
 * would, or null when not in the shell (callers then fall back to the input).
 */
export async function nativePickPhoto(opts: { label?: string; source?: 'CAMERA' | 'PHOTOS' | 'PROMPT' } = {}): Promise<File | null> {
  const cam = cap()?.Plugins?.Camera
  if (!isNativeApp() || !cam) return null
  try {
    const shot = await cam.getPhoto({ quality: 80, resultType: 'base64', source: opts.source ?? 'PROMPT', width: 1600, correctOrientation: true,
      promptLabelHeader: opts.label ?? 'Add a photo', promptLabelPhoto: 'From your photos', promptLabelPicture: 'Take a photo' })
    if (!shot.base64String) return null
    const bin = atob(shot.base64String)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    const type = `image/${shot.format === 'jpg' ? 'jpeg' : shot.format}`
    return new File([bytes], `photo.${shot.format}`, { type })
  } catch { return null } // user cancelled
}

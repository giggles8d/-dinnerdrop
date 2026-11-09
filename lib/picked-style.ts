import { styleByKey } from '@/lib/styles'

/**
 * A plan style picked on a landing page (/dinners/heart-healthy-dinners → /signup?style=heart) is carried through
 * sign-up and pre-picked in the setup walkthrough. Browser storage only; it may be missing, and that's fine.
 */
const KEY = 'dd_picked_style'

export function rememberPickedStyle(key: string | null): void {
  if (!key || !styleByKey(key)) return
  try { localStorage.setItem(KEY, key) } catch { /* private mode */ }
}

export function takePickedStyle(): string | null {
  try {
    const k = localStorage.getItem(KEY)
    return k && styleByKey(k) ? k : null
  } catch { return null }
}

export function clearPickedStyle(): void {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

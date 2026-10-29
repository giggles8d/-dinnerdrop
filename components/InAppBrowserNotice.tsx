'use client'
import { useEffect, useState } from 'react'

/** Facebook / Instagram / Messenger / TikTok and similar apps open links in their own browser. */
export function inAppBrowserName(ua: string): string | null {
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)) return /Messenger/i.test(ua) ? 'Messenger' : 'Facebook'
  if (/Instagram/i.test(ua)) return 'Instagram'
  if (/TikTok|musical_ly|Bytedance|BytedanceWebview/i.test(ua)) return 'TikTok'
  if (/Snapchat/i.test(ua)) return 'Snapchat'
  if (/Pinterest/i.test(ua)) return 'Pinterest'
  if (/\bLine\//i.test(ua)) return 'LINE'
  return null
}

/**
 * Inside an app's built-in browser, signing in to Instacart can fail (Google sign-in is blocked there), so the cart
 * "won't accept anything" (Marion, Oct 2026). Offer a one-tap way out to Safari/Chrome before they shop.
 */
export default function InAppBrowserNotice() {
  const [app, setApp] = useState<string | null>(null)
  const [ios, setIos] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const ua = navigator.userAgent || ''
    setApp(inAppBrowserName(ua))
    setIos(/iPhone|iPad|iPod/i.test(ua))
  }, [])
  if (!app) return null
  const here = typeof window !== 'undefined' ? window.location.href : 'https://www.dinnerdrop.app/grocery-list'
  const u = new URL(here)
  const openHref = ios
    ? `x-safari-https://${u.host}${u.pathname}${u.search}`
    : `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(here)};end`
  return (
    <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900" role="note">
      <p className="font-semibold">You&apos;re in {app}&apos;s browser</p>
      <p className="mt-0.5 text-xs leading-relaxed">Instacart sign-in often fails in here, so items may not add to your cart. Open DinnerDrop in {ios ? 'Safari' : 'Chrome'} first, then tap Shop ingredients.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={openHref} className="inline-flex items-center px-3 py-1.5 rounded-lg bg-amber-900 text-amber-50 text-xs font-semibold">Open in {ios ? 'Safari' : 'Chrome'}</a>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(here); setCopied(true) } catch { /* ignore */ } }} className="inline-flex items-center px-3 py-1.5 rounded-lg border border-amber-400 text-xs font-semibold">{copied ? 'Link copied' : 'Copy link'}</button>
      </div>
      <p className="mt-1.5 text-[11px] text-amber-800">Or tap <b>•••</b> at the top and choose &ldquo;Open in browser&rdquo;. Then sign in to DinnerDrop with the same email.</p>
    </div>
  )
}

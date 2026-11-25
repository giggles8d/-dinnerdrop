'use client'
import { useEffect, useState } from 'react'
import { track } from '@/lib/activation'

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
 * Shown under the Instacart button only when the Instacart tab didn't open inside an app's built-in browser
 * (Sarah, Nov 25 2026, Action 1). It used to sit above the send button for every Facebook/Instagram visitor and told
 * them to leave first: those families sent 31-35% vs 44%, while 16 in-app families sent to Instacart fine. Now the
 * button is tried first; this appears only if the tab is blocked. Tracked: cta_tap 'iab_notice_shown' and
 * 'iab_notice_tap' (meta.how = open_browser | copy | here).
 */
export default function InAppBrowserNotice({ instacartLink, onContinue }: { instacartLink?: string; onContinue?: () => void }) {
  const [app, setApp] = useState<string | null>(null)
  const [ios, setIos] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    const ua = navigator.userAgent || ''
    const name = inAppBrowserName(ua)
    setApp(name)
    setIos(/iPhone|iPad|iPod/i.test(ua))
    if (name) track('cta_tap', { id: 'iab_notice_shown', page: 'grocery-list', app: name })
  }, [])
  if (!app) return null
  const here = typeof window !== 'undefined' ? window.location.href : 'https://www.dinnerdrop.app/grocery-list'
  const u = new URL(here)
  const openHref = ios
    ? `x-safari-https://${u.host}${u.pathname}${u.search}`
    : `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(here)};end`
  const browser = ios ? 'Safari' : 'Chrome'
  const tap = (how: string) => track('cta_tap', { id: 'iab_notice_tap', page: 'grocery-list', app, how }, { beacon: how !== 'copy' })
  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 text-left whitespace-normal" role="alert">
      <p className="font-semibold">Instacart didn&apos;t open in {app}&apos;s browser</p>
      <p className="mt-0.5 text-xs leading-relaxed">Open this page in {browser}, then tap <b>Save my list to Instacart</b> again. Your list stays saved here.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={openHref} onClick={() => tap('open_browser')} className="inline-flex min-h-[44px] items-center px-4 rounded-lg bg-amber-900 text-amber-50 text-xs font-semibold">Open in {browser}</a>
        <button type="button" onClick={async () => { tap('copy'); try { await navigator.clipboard.writeText(here); setCopied(true) } catch { /* ignore */ } }} className="inline-flex min-h-[44px] items-center px-4 rounded-lg border border-amber-400 text-xs font-semibold">{copied ? 'Link copied' : 'Copy link'}</button>
        {instacartLink && (
          <a href={instacartLink} onClick={() => { tap('here'); onContinue?.() }} className="inline-flex min-h-[44px] items-center px-2 text-xs font-semibold underline underline-offset-2">Try Instacart here</a>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-amber-800">Or tap <b>•••</b> at the top and choose &ldquo;Open in browser&rdquo;. Then sign in to DinnerDrop with the same email.</p>
    </div>
  )
}

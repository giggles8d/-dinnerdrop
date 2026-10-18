'use client'
import { useEffect, useRef } from 'react'

/**
 * Homepage hero clip: the grocery list → one tap → the list in an Instacart cart.
 * Silent, looping, honors prefers-reduced-motion (shows the poster frame only).
 * A client component so `muted` is set before play() — React 18 drops the
 * attribute on the server, which blocks autoplay in Safari/Chrome.
 */
export default function HeroClip({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    v.muted = true
    v.defaultMuted = true
    v.play().catch(() => {})
  }, [])
  return (
    <video
      ref={ref}
      className={className}
      poster="/cart-clip-poster.jpg"
      width={1280}
      height={720}
      loop
      muted
      playsInline
      preload="metadata"
      aria-label="DinnerDrop grocery list sent to an Instacart cart in one tap"
    >
      <source src="/cart-clip.webm" type="video/webm" />
      <source src="/cart-clip.mp4" type="video/mp4" />
    </video>
  )
}

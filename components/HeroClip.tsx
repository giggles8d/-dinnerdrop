'use client'
import { useEffect, useRef } from 'react'

/**
 * Homepage hero clip: the grocery list → one tap → the list in an Instacart cart.
 * Silent, looping, honors prefers-reduced-motion (shows the poster frame only).
 * A client component so `muted` is set before play() — React 18 drops the
 * attribute on the server, which blocks autoplay in Safari/Chrome.
 */
interface Props {
  className?: string
  /** Base name under /public, e.g. "cart-clip" → cart-clip.webm, cart-clip.mp4, cart-clip-poster.jpg */
  name?: string
  width?: number
  height?: number
  label?: string
}

export default function HeroClip({ className = '', name = 'cart-clip', width = 1280, height = 720, label = 'DinnerDrop grocery list sent to an Instacart cart in one tap' }: Props) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    v.muted = true
    v.defaultMuted = true
    // Load and play only when the clip is on (or near) the screen (Nov 8 2026: the two clips were 1.4 MB of the
    // homepage's 2.2 MB on a phone, downloaded before anyone scrolled to them). Pauses when scrolled away.
    if (!('IntersectionObserver' in window)) { v.preload = 'auto'; v.play().catch(() => {}); return }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { v.preload = 'auto'; v.play().catch(() => {}) } else if (!v.paused) v.pause()
    }, { rootMargin: '200px 0px' })
    io.observe(v)
    return () => io.disconnect()
  }, [])
  return (
    <video
      ref={ref}
      className={className}
      poster={`/${name}-poster.jpg`}
      width={width}
      height={height}
      loop
      muted
      playsInline
      preload="none"
      aria-label={label}
    >
      <source src={`/${name}.webm`} type="video/webm" />
      <source src={`/${name}.mp4`} type="video/mp4" />
    </video>
  )
}

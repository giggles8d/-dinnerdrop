'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'dd_exit_intent_shown_v1'

export default function ExitIntentModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [hasShown, setHasShown] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(STORAGE_KEY)) return
    setHasShown(false)

    let lastTouchY = 0

    const triggerModal = () => {
      setIsOpen(true)
      setHasShown(true)
      sessionStorage.setItem(STORAGE_KEY, '1')
      if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
        ;(window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'exit_intent_shown', { send_to: 'AW-18170234265' })
      }
    }

    const handleMouseLeave = (e: MouseEvent) => {
      if (hasShown) return
      if (e.clientY <= 0 && e.relatedTarget == null) {
        triggerModal()
      }
    }

    const handleTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? 0
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (hasShown) return
      const currentY = e.touches[0]?.clientY ?? 0
      const delta = currentY - lastTouchY
      if (window.scrollY < 100 && delta > 80) {
        triggerModal()
      }
      lastTouchY = currentY
    }

    const fallbackTimer = setTimeout(() => {
      if (hasShown) return
      if (window.scrollY > window.innerHeight * 0.5) triggerModal()
    }, 45000)

    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      clearTimeout(fallbackTimer)
    }
  }, [hasShown])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 sm:p-8 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="text-center">
          <div className="text-3xl mb-3">👋</div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a5c38' }}>
            Wait — before you go.
          </h2>
          <p className="text-gray-600 text-sm mb-6 leading-relaxed">
            The first 100 families get 6 months of DinnerDrop completely free.<br />
            <strong>$0 charged today. Cancel anytime.</strong>
          </p>

          <Link
            href="/subscribe?coupon=BETA100&utm_source=exit_intent&utm_medium=modal"
            onClick={() => {
              if (typeof window !== 'undefined' && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
                ;(window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', 'exit_intent_cta_click', { send_to: 'AW-18170234265' })
              }
              setIsOpen(false)
            }}
            className="block w-full px-6 py-3 rounded-xl text-white font-bold text-base transition-colors shadow-sm hover:opacity-90 mb-3"
            style={{ backgroundColor: '#1a5c38' }}
          >
            Claim my 6 months free →
          </Link>

          <button
            onClick={() => setIsOpen(false)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            No thanks, maybe later
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useUnsplashPhoto } from '@/lib/use-unsplash-photo'
import { sizedImage, isUnsplash, isDirect } from '@/lib/image-src'

interface MealCardImageProps {
  mealName: string
  dayLabel: string
  imageUrl?: string   // stored once in the recipe library; skips the lookup
}

/**
 * Card photo that never shows broken alt text (Sarah, Oct 29 2026).
 * Unsplash photos come straight from Unsplash at card size, and our 900px WebP copies load as-is.
 * Any older ~1 MB stored photo goes through Vercel's resizer; if that fails (Hobby-plan quota), load the original instead,
 * and if that fails too, show a soft placeholder.
 */
export default function MealCardImage({ mealName, dayLabel, imageUrl }: MealCardImageProps) {
  const lookup = useUnsplashPhoto(imageUrl ? '' : mealName)
  const photo = imageUrl ? { url: imageUrl, alt: `Photo of ${mealName}` } : lookup.photo
  const loading = imageUrl ? false : lookup.loading
  // 0 = best source, 1 = original file, 2 = placeholder. Keyed by URL so a new photo starts fresh.
  const [stage, setStage] = useState<{ url: string; n: number }>({ url: '', n: 0 })
  const n = photo && stage.url === photo.url ? stage.n : 0
  const fail = () => photo && setStage({ url: photo.url, n: n + 1 })

  let img: React.ReactNode = <div className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden>🍽️</div>
  if (loading) img = <div className="absolute inset-0 bg-muted animate-pulse" />
  else if (photo && n === 0 && !isDirect(photo.url)) {
    img = <Image src={photo.url} alt={photo.alt} fill sizes="(max-width: 640px) 100vw, 400px" quality={70} className="object-cover" onError={fail} />
  } else if (photo && n <= 1) {
    // eslint-disable-next-line @next/next/no-img-element
    img = <img src={isUnsplash(photo.url) && n === 0 ? sizedImage(photo.url, 640) : photo.url} alt={photo.alt} loading="lazy" decoding="async"
      onError={() => (isUnsplash(photo.url) && n === 0 ? setStage({ url: photo.url, n: 1 }) : setStage({ url: photo.url, n: 2 }))}
      className="absolute inset-0 h-full w-full object-cover" />
  }

  return (
    <div className="relative h-[200px] w-full overflow-hidden bg-gradient-to-br from-orange-100 to-orange-200">
      {img}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent" />
      <span className="absolute top-3 left-3 text-xs font-medium text-white uppercase tracking-wide drop-shadow-sm">
        {dayLabel}
      </span>
    </div>
  )
}

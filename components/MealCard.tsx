'use client'
import Link from 'next/link'
import { Heart, RefreshCw, Check } from 'lucide-react'
import MealCardImage from './MealCardImage'
import type { Meal } from '@/types'

interface MealCardProps {
  meal: Meal
  isFavorite?: boolean
  onToggleFavorite?: (meal: Meal) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (meal: Meal) => void
}

function getMealId(meal: Meal) {
  return meal.day.toLowerCase()
}

export default function MealCard({ meal, isFavorite, onToggleFavorite, selectable, selected, onSelect }: MealCardProps) {
  function handleClick() {
    localStorage.setItem(`meal-${getMealId(meal)}`, JSON.stringify(meal))
  }

  if (selectable) {
    return (
      <div
        onClick={() => onSelect?.(meal)}
        className={`rounded-xl border-2 bg-card overflow-hidden cursor-pointer transition-all duration-200 select-none
          ${selected
            ? 'border-primary shadow-md scale-[1.02]'
            : 'border-border opacity-70 hover:opacity-90 hover:border-primary/40'
          }`}
      >
        {/* Selection badge */}
        <div className="relative">
          <MealCardImage mealName={meal.name} dayLabel="" />
          <div className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all
            ${selected ? 'bg-primary text-primary-foreground' : 'bg-background/80 border-2 border-muted-foreground/30'}`}>
            {selected && <Check className="w-4 h-4" strokeWidth={3} />}
          </div>
        </div>
        <div className="p-4 space-y-2">
          <h3 className={`text-base font-heading font-semibold leading-tight transition-colors
            ${selected ? 'text-primary' : 'text-card-foreground'}`}>
            {meal.name}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{meal.cookTime} min</span>
            <span>&middot;</span>
            <span>{meal.servings} servings</span>
          </div>
          <div className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border
            ${selected ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-primary border-primary/20'}`}>
            ${meal.estimatedCost.toFixed(2)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden group">
      <Link href={`/recipe/${getMealId(meal)}`} onClick={handleClick} className="block">
        <MealCardImage mealName={meal.name} dayLabel={meal.day} />
      </Link>
      <div className="relative">
        {/* Swap affordance — top-left, revealed on card hover */}
        <Link
          href={`/recipe/${getMealId(meal)}`}
          onClick={handleClick}
          className="absolute top-3 left-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-all z-10 opacity-0 group-hover:opacity-100"
          aria-label="Swap this meal"
          title="Click to swap this meal"
        >
          <RefreshCw className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
        </Link>
        {onToggleFavorite && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggleFavorite(meal)
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors z-10"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite
                  ? 'fill-red-500 text-red-500'
                  : 'text-muted-foreground hover:text-red-400'
              }`}
            />
          </button>
        )}
        <Link
          href={`/recipe/${getMealId(meal)}`}
          onClick={handleClick}
          className="block p-4 space-y-2"
        >
          <h3 className="text-base font-heading font-semibold text-card-foreground leading-tight pr-8 group-hover:text-primary transition-colors">
            {meal.name}
          </h3>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{meal.cookTime} min</span>
            <span>&middot;</span>
            <span>{meal.servings} servings</span>
          </div>
          <div className="inline-block rounded-full bg-secondary text-primary px-3 py-1 text-xs font-semibold border border-primary/20">
            ${meal.estimatedCost.toFixed(2)}
          </div>
        </Link>
      </div>
    </div>
  )
}

'use client'
import Link from 'next/link'
import { Heart, RefreshCw, Check, CheckCircle2 } from 'lucide-react'
import MealCardImage from './MealCardImage'
import type { Meal } from '@/types'
import { timeLabel } from '@/lib/plan'
import { safeBite, cookware } from '@/lib/meal-insights'
import { sideFor } from '@/lib/sides'
import { allergyConflicts } from '@/lib/allergens'
import { useFamilyAllergies } from '@/lib/use-family-allergies'

interface MealCardProps {
  meal: Meal
  isFavorite?: boolean
  onToggleFavorite?: (meal: Meal) => void
  selectable?: boolean
  selected?: boolean
  onSelect?: (meal: Meal) => void
  votes?: { keep: number; skip: number; again: number; voters: string[] }
  /** Picking screen: fresh ingredients this dinner shares with the current picks ("cilantro, limes"). */
  sharesWith?: string[]
  /** This week's plan: tap to mark the dinner cooked (it fades, like crossing it off). */
  onToggleCooked?: (meal: Meal) => void
}

function getMealId(meal: Meal) {
  return meal.day.toLowerCase()
}

export default function MealCard({ meal, isFavorite, onToggleFavorite, selectable, selected, onSelect, votes, sharesWith, onToggleCooked }: MealCardProps) {
  const cooked = !!meal.cookedAt
  const family = useFamilyAllergies()
  const allergyHits = allergyConflicts(meal.ingredients ?? [], family, meal.name)
  const allergyBadge = allergyHits.length ? (
    <div role="alert" className="rounded-md bg-red-50 border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-800">
      ⚠️ {allergyHits.map((c) => `${c.allergy}${c.who.length ? ` (${c.who.join(', ')})` : ''}`).join(' · ')}
    </div>
  ) : null
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
          <MealCardImage mealName={meal.name} dayLabel="" imageUrl={meal.imageUrl} />
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
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground [&>span]:whitespace-nowrap">
            <span>{timeLabel(meal)}</span>
            <span aria-hidden>&middot;</span>
            <span>{meal.servings} servings</span>
            <span aria-hidden>&middot;</span>
            <span title="Pans and pots the steps use">🍳 {cookware(meal).label}</span>
            {meal.nutrition && <><span aria-hidden>&middot;</span><span>{meal.nutrition.calories} cal · {meal.nutrition.protein}g protein</span></>}
          </div>
          {allergyBadge}
          {safeBite(meal) && <div className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Safe bet for the picky one:</span> {safeBite(meal)}</div>}
          <div className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Goes with:</span> {sideFor(meal).name} <span className="opacity-70">({sideFor(meal).minutes} min)</span></div>
          {(meal.tags?.length || meal.fromLibrary) && (
            <div className="flex flex-wrap gap-1">
              {meal.fromLibrary && <span className="rounded-full bg-accent/15 text-accent-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Family favorite</span>}
              {(meal.tags ?? []).slice(0, 3).map(t => t === 'family pick'
                ? <span key={t} title="Your family texted to bring this one back" className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-semibold">❤️ Family pick</span>
                : <span key={t} className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">{t}</span>)}
            </div>
          )}
          {(meal.saleItems?.length ?? 0) > 0 && (
            <div className="text-[11px] text-primary font-medium" title={meal.saleItems!.join(', ')}>🏷️ On sale: {meal.saleItems!.slice(0, 2).join(' · ')}{meal.saleItems!.length > 2 ? ` +${meal.saleItems!.length - 2}` : ''}</div>
          )}
          {(meal.usesPantry?.length ?? 0) > 0 && (
            <div className="text-[11px] text-amber-700 font-medium" title={meal.usesPantry!.join(', ')}>🥫 Uses up: {meal.usesPantry!.slice(0, 2).join(' · ')}{meal.usesPantry!.length > 2 ? ` +${meal.usesPantry!.length - 2}` : ''}</div>
          )}
          {(sharesWith?.length ?? 0) > 0 && (
            <div className="text-[11px] text-emerald-700 font-medium" title="Fresh ingredients this dinner shares with your picks — whole packages get used">🌿 {selected ? 'Shares' : 'Uses the rest of'}: {sharesWith!.slice(0, 2).join(' · ')}{sharesWith!.length > 2 ? ` +${sharesWith!.length - 2}` : ''}</div>
          )}
          <div className={`inline-block rounded-full px-3 py-1 text-xs font-semibold border
            ${selected ? 'bg-primary/10 text-primary border-primary/30' : 'bg-secondary text-primary border-primary/20'}`}>
            ${meal.estimatedCost.toFixed(2)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-border bg-card hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden group ${cooked ? 'opacity-55' : ''}`}>
      <Link href={`/recipe/${getMealId(meal)}`} onClick={handleClick} className="block">
        <MealCardImage mealName={meal.name} dayLabel={meal.day} imageUrl={meal.imageUrl} />
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
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm text-muted-foreground [&>span]:whitespace-nowrap">
            <span>{timeLabel(meal)}</span>
            <span aria-hidden>&middot;</span>
            <span>{meal.servings} servings</span>
            <span aria-hidden>&middot;</span>
            <span title="Pans and pots the steps use">🍳 {cookware(meal).label}</span>
            {meal.nutrition && <><span aria-hidden>&middot;</span><span>{meal.nutrition.calories} cal · {meal.nutrition.protein}g protein</span></>}
          </div>
          {allergyBadge}
          {safeBite(meal) && <div className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Safe bet for the picky one:</span> {safeBite(meal)}</div>}
          <div className="text-[11px] text-muted-foreground"><span className="font-semibold text-foreground">Goes with:</span> {sideFor(meal).name} <span className="opacity-70">({sideFor(meal).minutes} min)</span></div>
          {(meal.tags?.length || meal.fromLibrary) && (
            <div className="flex flex-wrap gap-1">
              {meal.fromLibrary && <span className="rounded-full bg-accent/15 text-accent-foreground px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">Family favorite</span>}
              {(meal.tags ?? []).slice(0, 3).map(t => t === 'family pick'
                ? <span key={t} title="Your family texted to bring this one back" className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 text-[10px] font-semibold">❤️ Family pick</span>
                : <span key={t} className="rounded-full bg-muted text-muted-foreground px-2 py-0.5 text-[10px]">{t}</span>)}
            </div>
          )}
          {(meal.saleItems?.length ?? 0) > 0 && (
            <div className="text-[11px] text-primary font-medium" title={meal.saleItems!.join(', ')}>🏷️ On sale: {meal.saleItems!.slice(0, 2).join(' · ')}{meal.saleItems!.length > 2 ? ` +${meal.saleItems!.length - 2}` : ''}</div>
          )}
          {(meal.usesPantry?.length ?? 0) > 0 && (
            <div className="text-[11px] text-amber-700 font-medium" title={meal.usesPantry!.join(', ')}>🥫 Uses up: {meal.usesPantry!.slice(0, 2).join(' · ')}{meal.usesPantry!.length > 2 ? ` +${meal.usesPantry!.length - 2}` : ''}</div>
          )}
          {votes && (votes.keep + votes.skip + votes.again > 0) && (
            <div className="text-[11px] text-muted-foreground" title={votes.voters.join(', ')}>
              Family: {votes.keep > 0 && <span className="text-primary font-medium">{votes.keep} keep</span>}{votes.keep > 0 && votes.skip > 0 && ' · '}{votes.skip > 0 && <span className="text-destructive font-medium">{votes.skip} skip</span>}{(votes.keep > 0 || votes.skip > 0) && votes.again > 0 && ' · '}{votes.again > 0 && <span className="font-medium">{votes.again} want it again</span>}
            </div>
          )}
          <div className="inline-block rounded-full bg-secondary text-primary px-3 py-1 text-xs font-semibold border border-primary/20">
            ${meal.estimatedCost.toFixed(2)}
          </div>
        </Link>
        {onToggleCooked && (
          <div className="px-4 pb-4 -mt-1">
            <button
              type="button"
              onClick={() => onToggleCooked(meal)}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-3 py-1 border transition-colors ${cooked ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground border-border hover:border-primary/50 hover:text-primary'}`}
              aria-pressed={cooked}
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> {cooked ? 'Cooked' : 'Mark cooked'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { dinnerAllergens, allergyConflicts, ALLERGENS } from '@/lib/allergens'
import { useFamilyAllergies } from '@/lib/use-family-allergies'

const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/** "Contains: Dairy · Gluten · Soy" for any recipe, and a red warning when it hits someone's allergy in this family. */
export default function AllergenNotice({ ingredients, name }: { ingredients: Array<{ name: string }>; name: string }) {
  const family = useFamilyAllergies()
  const found = dinnerAllergens(ingredients)
  const conflicts = allergyConflicts(ingredients, family, name)
  if (!found.length && !conflicts.length) return null
  return (
    <div className="mb-6 space-y-2">
      {conflicts.map((c) => (
        <div key={c.allergy} role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          <p className="font-semibold">⚠️ Contains {c.allergy.toLowerCase()}{c.who.length ? ` — ${list(c.who)} ${c.who.length === 1 ? 'is' : 'are'} allergic` : ' — on your family’s avoid list'}</p>
          <p className="text-xs mt-0.5">From: {c.items.join(', ')}. Swap this dinner or use a safe substitute, and check every label.</p>
        </div>
      ))}
      {found.length > 0 && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Contains:</span>{' '}
          {found.map((f) => ALLERGENS.find((a) => a.key === f.key)!.short).join(' · ')}
          <span className="ml-1">— based on the ingredients; brands vary, so check labels.</span>
        </p>
      )}
    </div>
  )
}

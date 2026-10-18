'use client'

import { useState } from 'react'

const GREEN = '#1a5c38'

// Logged-out "bring your favorites" box. Names are kept in localStorage and the
// favorites page rebuilds them as full recipes right after signup.
export default function MealimeImportForm() {
  const [names, setNames] = useState('')
  const count = names.split(/\r?\n/).map((n) => n.trim()).filter(Boolean).length

  function handleContinue() {
    try { localStorage.setItem('dd_import_names', names) } catch { /* storage unavailable */ }
    window.location.href = '/signup?redirect=%2Ffavorites&utm_source=mealime&utm_medium=import'
  }

  return (
    <div className="rounded-2xl border-2 bg-white p-6 sm:p-8 shadow-sm" style={{ borderColor: GREEN }}>
      <h2 className="text-xl font-bold mb-1" style={{ color: GREEN }}>Bring your Mealime favorites</h2>
      <p className="text-sm text-gray-600 mb-4">
        Type the names of the dinners your family keeps coming back to, one per line. After you sign up (just an email, no card), DinnerDrop writes a new version of each one &mdash; same dish, sized for your family &mdash; and keeps it in your rotation. Your list is saved the moment you finish signup. Want the exact recipe, not a new version? Paste its link, text, or a photo on your Recipes page and it comes in as written.
      </p>
      <textarea
        value={names}
        onChange={(e) => setNames(e.target.value)}
        rows={6}
        placeholder={'Honey garlic chicken thighs\nSheet pan sausage and peppers\nTaco bowls\nOne-pot lemon orzo'}
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
        style={{ ['--tw-ring-color' as string]: GREEN }}
      />
      <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <button
          onClick={handleContinue}
          className="px-8 py-3 rounded-xl text-white font-bold text-base shadow-sm hover:opacity-90"
          style={{ backgroundColor: GREEN }}
        >
          {count > 0 ? `Rebuild ${count} dinner${count === 1 ? '' : 's'} and start free →` : 'Start free and add them later →'}
        </button>
        <p className="text-xs text-gray-500">No card. Up to 15 at a time; add more any time from Favorites.</p>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { extractDinnerNames } from '@/lib/import-parse'

const GREEN = '#1a5c38'

// Logged-out "bring your favorites" box. Names are kept in localStorage and the
// favorites page rebuilds them as full recipes right after signup.
export default function OllieImportForm() {
  const [names, setNames] = useState('')
  const [exportText, setExportText] = useState('')
  const [found, setFound] = useState<number | null>(null)

  function findDinners() {
    const got = extractDinnerNames(exportText)
    const have = names.split(/\r?\n/).map((n) => n.trim()).filter(Boolean)
    const seen = new Set(have.map((n) => n.toLowerCase()))
    const added = got.filter((n) => !seen.has(n.toLowerCase()))
    setNames([...have, ...added].join('\n'))
    setFound(got.length)
  }
  const count = names.split(/\r?\n/).map((n) => n.trim()).filter(Boolean).length

  function handleContinue() {
    try { localStorage.setItem('dd_import_names', names) } catch { /* storage unavailable */ }
    window.location.href = '/signup?redirect=%2Ffavorites&utm_source=ollie&utm_medium=import&code=OLLIE'
  }

  return (
    <div className="rounded-2xl border-2 bg-white p-6 sm:p-8 shadow-sm" style={{ borderColor: GREEN }}>
      <h2 className="text-xl font-bold mb-1" style={{ color: GREEN }}>Bring the dinners your family loved on Ollie</h2>
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
      <details className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
        <summary className="cursor-pointer text-sm font-semibold" style={{ color: GREEN }}>Got the export Ollie texted you? Paste the whole thing here</summary>
        <p className="text-xs text-gray-600 mt-2 mb-2">Paste it as is (text, a list, or the file&apos;s contents). We pick out the dinner names and add them to the list above for you to check. Nothing is sent anywhere until you sign up, and only the dinner names are kept.</p>
        <textarea
          value={exportText}
          onChange={(e) => { setExportText(e.target.value); setFound(null) }}
          rows={5}
          placeholder="Paste Ollie's export here"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
          style={{ ['--tw-ring-color' as string]: GREEN }}
        />
        <div className="mt-2 flex items-center gap-3">
          <button onClick={findDinners} disabled={!exportText.trim()} className="px-4 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap flex-shrink-0 disabled:opacity-40" style={{ backgroundColor: GREEN }}>
            Find my dinners
          </button>
          {found !== null && (
            <p className="text-xs text-gray-600" role="status">
              {found > 0 ? `Found ${found} dinner${found === 1 ? '' : 's'}. Check the list above, delete any that aren't dinners, then continue.` : 'No dinner names found. Type them in the box above instead.'}
            </p>
          )}
        </div>
      </details>
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

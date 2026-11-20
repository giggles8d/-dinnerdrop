/**
 * Settings → Food → "proteins to avoid" (lib/settings PROTEIN_OPTIONS) as words a dinner can be checked against.
 *
 * Nov 19 2026: a family of 5 whose setup says no salmon, shrimp, fish or tofu got Sheet Pan Chili-Lime Tilapia as the
 * Thursday no-vote result (the ballot had it too). Every exclude-words check reads the list as plain substrings, and
 * "tilapia" does not contain "fish" — nor do cod, halibut or mahi mahi. This expands the few chips that name a kind of
 * food rather than one word, so "fish" means every fish and "shrimp" also means prawns. Words stay substrings on
 * purpose (that is how every caller matches), so only safe ones are listed: "ham" would hit hamburger, "sole" casserole.
 */
const EXPANDED: Record<string, string[]> = {
  fish: ['fish', 'salmon', 'tilapia', 'cod', 'halibut', 'mahi', 'tuna', 'trout', 'snapper', 'flounder', 'sea bass', 'branzino', 'mackerel', 'sardine', 'anchov'],
  shrimp: ['shrimp', 'prawn'],
}

/** The avoid-proteins list with each category chip replaced by the words that catch it; other entries pass through. */
export function avoidProteinWords(avoid: readonly string[] | null | undefined): string[] {
  const out: string[] = []
  for (const raw of avoid ?? []) {
    const w = String(raw ?? '').trim()
    if (!w) continue
    for (const x of EXPANDED[w.toLowerCase()] ?? [w]) if (!out.includes(x)) out.push(x)
  }
  return out
}

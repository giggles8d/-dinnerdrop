// First-visit setup: what a brand-new family tells us before their first week is built.
export const GOALS = [
  { key: 'less-deciding', emoji: '🧠', label: 'Stop deciding every night', blurb: 'The plan shows up; you just cook.' },
  { key: 'save-money', emoji: '💵', label: 'Spend less on groceries', blurb: 'Built to your number, ingredients overlap.' },
  { key: 'eat-healthier', emoji: '🥗', label: 'Eat a little healthier', blurb: 'Real food, balanced plates, no diet drama.' },
  { key: 'kids-eat-it', emoji: '🧒', label: 'Dinners the kids actually eat', blurb: 'Familiar favorites, picky-proof.' },
] as const
export type Goal = typeof GOALS[number]['key']
export const GOAL_KEYS = GOALS.map((g) => g.key) as readonly string[]

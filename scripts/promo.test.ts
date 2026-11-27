// Promo code length rules (Sarah, Nov 27 2026): FRIENDS gives 730 days; every other code gives at most 14.
// Run: npx tsx scripts/promo.test.ts
import assert from 'node:assert/strict'
import { LONG_CODES, promoState, promoTooLong, promoUntilMs, type PromoRow } from '../lib/promo'
import { promoLength } from '../lib/promo-length'

const DAY = 86400000
const now = Date.UTC(2026, 10, 27, 15)
const row = (code: string, family_days: number): PromoRow =>
  ({ code, label: code, family_days, max_redemptions: null, redeemed: 0, expires_at: null, active: true })
const daysGiven = (p: PromoRow, currentUntil = 0) => Math.round((promoUntilMs(p, currentUntil, now) - now) / DAY)

// The allow-list is exactly FRIENDS.
assert.deepEqual([...LONG_CODES], ['FRIENDS'])

// FRIENDS: open at 730 days and gives 730 days.
assert.equal(promoTooLong(row('FRIENDS', 730)), false)
assert.equal(promoState(row('FRIENDS', 730)), 'ok')
assert.equal(daysGiven(row('FRIENDS', 730)), 730)
// No stacking: a family with 14 days left gets today + 730, not 744.
assert.equal(daysGiven(row('FRIENDS', 730), now + 14 * DAY), 730)
// Never shortens: a family with 800 days left keeps 800.
assert.equal(daysGiven(row('FRIENDS', 730), now + 800 * DAY), 800)

// Every other code: at 14 days it works and gives 14.
for (const code of ['NURSE', 'FRUIT', 'EMEALS', 'OLLIE', 'MAPLE', 'MEALIME', 'THANKYOU', 'WELCOMEBACK', 'FULLTABLE']) {
  assert.equal(promoState(row(code, 14)), 'ok', `${code} at 14 is open`)
  assert.equal(daysGiven(row(code, 14)), 14, `${code} gives 14`)
  // Set longer in the database by mistake: closed, and capped at 14 even if something calls the math directly.
  for (const d of [15, 90, 730]) {
    assert.equal(promoTooLong(row(code, d)), true, `${code} at ${d} is too long`)
    assert.equal(promoState(row(code, d)), 'expired', `${code} at ${d} is closed`)
    assert.ok(daysGiven(row(code, d)) <= 14, `${code} at ${d} gives at most 14`)
  }
}
// Case matters the same way the database does: codes are stored upper-case, so 'friends' is not on the list.
assert.equal(promoTooLong(row('friends', 730)), true)

// Wording on /start and the share image.
assert.equal(promoLength(14), '14 days')
assert.equal(promoLength(1), '1 day')
assert.equal(promoLength(90), '3 months')
assert.equal(promoLength(30), '1 month')
assert.equal(promoLength(365), '1 year')
assert.equal(promoLength(730), '2 years')
console.log('promo: all checks passed')

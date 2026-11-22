// Trial end follows the family's free Family days (Nov 22 2026 review). Run: npx tsx scripts/trial-date.test.ts
import { trialPlan } from '../lib/trial-date'
let fail = 0
const eq = (name: string, a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) } }
const now = new Date('2026-11-22T20:00:00Z')
const H = 3600 * 1000, D = 24 * H
// Sign-up today, 14 free days: first charge on day 15 (the day free days end), not day 28.
const until = new Date(now.getTime() + 14 * D).toISOString()
eq('free days running', trialPlan(until, now), { trialEnd: Math.floor((now.getTime() + 14 * D) / 1000), firstCharge: new Date(now.getTime() + 14 * D), basis: 'free_days' })
// Day 10 of 14: trial ends at family_until (4 days left).
eq('4 days left', trialPlan(new Date(now.getTime() + 4 * D).toISOString(), now).trialEnd, Math.floor((now.getTime() + 4 * D) / 1000))
// Free days over: no trial, charge now.
eq('over', trialPlan(new Date(now.getTime() - D).toISOString(), now), { trialEnd: null, firstCharge: now, basis: 'free_days_over' })
// Under 48 h left: Stripe minimum (49 h), never earlier than the free days end.
const p = trialPlan(new Date(now.getTime() + 10 * H).toISOString(), now)
eq('min 48h basis', p.basis, 'free_days_min_48h'); eq('min 48h end', p.trialEnd, Math.floor((now.getTime() + 49 * H) / 1000))
// Never had free days: standard 14.
eq('none', trialPlan(null, now).basis, 'standard_14'); eq('none end', trialPlan(null, now).trialEnd, Math.floor((now.getTime() + 14 * D) / 1000))
// Founding family free to Oct 18 2027: trial to then (inside Stripe's 730-day cap).
eq('founding', trialPlan('2027-10-18T04:00:00.000Z', now).trialEnd, Math.floor(Date.parse('2027-10-18T04:00:00.000Z') / 1000))
// Far future capped at 730 days.
eq('cap', trialPlan('2030-01-01T00:00:00Z', now).trialEnd, Math.floor((now.getTime() + 730 * D) / 1000))
if (fail) { console.log(fail + ' failed'); process.exit(1) } else console.log('all trial-date tests pass')

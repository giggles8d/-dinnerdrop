import { resolveTrips, tripInstances, currentKey, currentTrip, shoppingTrip, tonightTrip, voteTripOn, addDays, isClassic } from '../lib/trips'
import { mondayOf } from '../lib/plan'
let fail = 0
const eq = (name: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) } }
// 1) Classic: key must equal mondayOf for every day over a year.
const classic = { weekStart: 'mon' as const, trips: [], cookDays: ['mon','tue','wed','thu','fri'] as any, shopDay: 'sun' as const }
eq('classic', isClassic(classic), true)
for (let i = 0; i < 400; i++) { const d = addDays('2026-01-01', i); eq('classicKey ' + d, currentKey(classic, d), mondayOf(new Date(d + 'T12:00:00Z'))) }
// 2) Sarah's example: week starts Sunday, shop Sun + Wed, cook Mon–Fri.
const two = { weekStart: 'sun' as const, trips: [{ shopDay: 'sun' as const }, { shopDay: 'wed' as const }], cookDays: ['mon','tue','wed','thu','fri'] as any, shopDay: 'sun' as const }
eq('two nights', resolveTrips(two).map((t) => t.nights), [['mon','tue','wed'], ['thu','fri']])
const inst = tripInstances(two, '2026-11-03')
const wk = inst.filter((t) => t.shopDate >= '2026-11-01' && t.shopDate <= '2026-11-07')
eq('two this week', wk.map((t) => [t.shopDate, t.nights.map((n) => n.date), t.key]), [['2026-11-01', ['2026-11-02','2026-11-03','2026-11-04'], '2026-11-02'], ['2026-11-04', ['2026-11-05','2026-11-06'], '2026-11-05']])
eq('current Tue', currentTrip(two, '2026-11-03').key, '2026-11-02')
eq('current Thu', currentTrip(two, '2026-11-05').key, '2026-11-05')
eq('current Sat', currentTrip(two, '2026-11-07').key, '2026-11-09')
eq('shopping Mon', shoppingTrip(two, '2026-11-02').shopDate, '2026-11-04')
eq('tonight Wed', tonightTrip(two, '2026-11-04')?.index, 0)
eq('tonight Sat', tonightTrip(two, '2026-11-07'), null)
eq('vote Tue', voteTripOn(two, '2026-11-03')?.key, '2026-11-05')
eq('vote Sat', voteTripOn(two, '2026-10-31')?.key, '2026-11-02')
// 3) Three trips, moved night: Sun (Mon,Tue), Tue (Wed,Thu), Thu (Fri) with Fri moved to trip 2 explicitly.
const three = { weekStart: 'sun' as const, trips: [{ shopDay: 'sun' as const }, { shopDay: 'tue' as const, nights: ['wed','thu','fri'] as any }, { shopDay: 'thu' as const }], cookDays: ['mon','tue','wed','thu','fri','sat'] as any, shopDay: 'sun' as const }
eq('three nights', resolveTrips(three).map((t) => t.nights), [['mon','tue'], ['wed','thu','fri'], ['sat']])
// 4) Monday week, two trips (not classic): keys are first-night dates, never collide.
const mon2 = { weekStart: 'mon' as const, trips: [{ shopDay: 'sun' as const }, { shopDay: 'wed' as const }], cookDays: ['mon','tue','wed','thu','fri'] as any, shopDay: 'sun' as const }
eq('mon2 classic?', isClassic(mon2), false)
const keys = tripInstances(mon2, '2026-11-03', 4).map((t) => t.key); eq('unique keys', new Set(keys).size, keys.length)
console.log(fail ? `${fail} failures` : 'all trip tests pass')

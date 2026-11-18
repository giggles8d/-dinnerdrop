import { parseInbound, digitRun, splitTwoDigits } from '../lib/texting'
let fail = 0
const eq = (name: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) } }

// Nov 18 2026 (Janice): "135" is picks 1, 3 and 5 — the bot asked "did you mean to vote?".
eq('135', parseInbound('135'), { kind: 'skip', numbers: [1, 3, 5], explicit: false })
eq('skip 2468', parseInbound('skip 2468'), { kind: 'skip', numbers: [2, 4, 6, 8], explicit: true })
eq('#246.', parseInbound('#246.'), { kind: 'skip', numbers: [2, 4, 6], explicit: false })
eq('spaced still works', parseInbound('1 3 5'), { kind: 'skip', numbers: [1, 3, 5], explicit: false })
eq('repeat digits = not picks', parseInbound('2026'), { kind: 'unknown' })
eq('zero = not picks', parseInbound('120'), { kind: 'unknown' })
eq('nine digits = not picks', parseInbound('123456789'), { kind: 'unknown' })
eq('phone number = not picks', parseInbound('8505551234'), { kind: 'unknown' })
eq('digitRun', digitRun('135'), [1, 3, 5])
eq('digitRun two digits', digitRun('12'), null)
// "12" on an 8-dinner ballot = 1 and 2; on a 12-dinner one it stays #12.
eq('12 of 8', splitTwoDigits('12', [12], 8), [1, 2])
eq('12 of 12', splitTwoDigits('12', [12], 12), [12])
eq('11 of 8', splitTwoDigits('11', [11], 8), [11])
eq('1 2 untouched', splitTwoDigits('1 2', [1, 2], 8), [1, 2])
eq('19 of 8', splitTwoDigits('19', [19], 8), [19])
// Thanks with a smiley / "This is perfect" are thanks, not a question for the AI.
eq('thanks smiley', parseInbound('Thanks 🙂'), { kind: 'thanks' })
eq('perfect', parseInbound('This is perfect '), { kind: 'thanks' })
eq('love it', parseInbound('Love it!'), { kind: 'thanks' })
eq('plain thanks', parseInbound('Thanks'), { kind: 'thanks' })
eq('sentence not thanks', parseInbound('Thanks, can you add milk'), { kind: 'unknown' })
// Opt-in words still parse as optin; the handler decides whether it is a first opt-in or an ack.
eq('okay', parseInbound('Okay'), { kind: 'optin' })
eq('ok please', parseInbound('OK please'), { kind: 'optin' })
// Unchanged neighbours.
eq('order total', parseInbound('spent 120'), { kind: 'order_total', total: 120, store: undefined })
eq('swap 2 via skip', parseInbound('2'), { kind: 'skip', numbers: [2], explicit: false })
eq('again', parseInbound('again 1 3'), { kind: 'again', numbers: [1, 3] })
eq('looks good', parseInbound('looks good'), { kind: 'allgood' })

if (fail) { console.log(`${fail} failing`); process.exit(1) }
console.log('parse-inbound: all good')

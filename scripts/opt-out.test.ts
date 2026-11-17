import { parseInbound } from '../lib/texting'
let fail = 0
const kind = (s: string) => parseInbound(s).kind
const is = (s: string, k: string) => { const got = kind(s); if (got !== k) { fail++; console.log('FAIL', JSON.stringify(s), 'got', got, 'want', k) } }
// Plain-English opt-outs (Nov 16 2026) are a STOP.
for (const s of [
  "I'm not interested anymore", 'Take me off on your schedule', 'take me off your list', 'Please remove my number', 'remove me from this',
  'stop texting me', 'Please stop sending me these', "I don't want these texts", 'Not interested', 'no longer interested in this',
  'unsubscribe me please', 'opt out', 'Wrong number', 'leave me alone', 'cancel my account', 'stop the texts', 'STOP', 'Quit',
]) is(s, 'stop')
// Things that must NOT opt anyone out.
is('not interested in 2', 'unknown')
is("I'm not interested in the tacos", 'unknown')
is('stop 3', 'stop') // unchanged: the STOP keyword wins, as on main
is('remove the onions from my list', 'unknown')
is('can you stop adding peppers', 'unknown')
is('yes', 'optin')
is('add milk', 'add')
is('what time', 'unknown')
is('menu', 'menu')
is('I want to cancel pizza night and do tacos', 'unknown')
if (fail) { console.log(fail, 'failures'); process.exit(1) } else console.log('opt-out tests ok')

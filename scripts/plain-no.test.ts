import { parseInbound, liveAsk } from '../lib/texting'
let fail = 0
const eq = (name: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) } }
// Faith, Nov 27 2026: "No thank you" to a care text is a plain no.
eq('no thank you', parseInbound('No thank you').kind, 'none')
eq('no thanks!', parseInbound('No thanks!').kind, 'none')
eq('nope, thanks', parseInbound('Nope, thanks').kind, 'none')
eq('not now', parseInbound('Not now').kind, 'none')
eq('bare no', parseInbound('no').kind, 'none')
eq('a sentence is not a no', parseInbound('no i want that again').kind !== 'none', true)
eq('thanks alone', parseInbound('Thank you').kind, 'thanks')
// A care text after an ask closes it; newest row first.
const out = (intent: string) => ({ direction: 'out', intent })
const inb = (intent: string) => ({ direction: 'in', intent })
eq('care text closes the ask', liveAsk([out('reply'), inb('unknown'), out('admin_message'), out('reply'), inb('pick'), out('vote_request:abc'), out('again_request')]), undefined)
eq('vote request is the ask', liveAsk([out('reply'), inb('pick'), out('vote_request:abc'), out('again_request')])?.intent, 'vote_request:abc')
eq('again request is the ask', liveAsk([out('reply'), inb('again'), out('again_request')])?.intent, 'again_request')
eq('ask after a care text is live', liveAsk([out('again_request'), out('admin_message')])?.intent, 'again_request')
eq('nothing asked', liveAsk([out('reply'), out('first_plan')]), undefined)
console.log(fail ? `${fail} failed` : 'ok')
process.exit(fail ? 1 : 0)

import { parseLeaderCommand, parseLeaderCommands } from '../lib/family-ask'
let fail = 0
const eq = (name: string, a: unknown, b: unknown) => { const ok = JSON.stringify(a) === JSON.stringify(b); if (!ok) { fail++; console.log('FAIL', name, JSON.stringify(a), '!=', JSON.stringify(b)) } }
// Faith, Nov 27 2026: two edits on two lines.
eq('two lines', parseLeaderCommands('Remove 1\nSwap 3 for BBQ Salmon'), [{ kind: 'drop', n: 1 }, { kind: 'swap', n: 3, dish: 'BBQ Salmon' }])
eq('semicolons', parseLeaderCommands('swap 2 for tacos; swap 4'), [{ kind: 'swap', n: 2, dish: 'tacos' }, { kind: 'swap', n: 4, dish: '' }])
eq('windows newlines', parseLeaderCommands('drop 2\r\nadd dinner: pizza'), [{ kind: 'drop', n: 2 }, { kind: 'add_dinner', dish: 'pizza' }])
eq('one line is not a list', parseLeaderCommands('Swap 3 for BBQ Salmon'), null)
eq('one line still parses', parseLeaderCommand('Swap 3 for BBQ Salmon'), { kind: 'swap', n: 3, dish: 'BBQ Salmon' })
eq('a chatty line breaks it', parseLeaderCommands('swap 1\nthanks so much!'), null)
eq('send is not an edit', parseLeaderCommands('swap 1\nsend'), null)
eq('plain two-line note', parseLeaderCommands('Hi there\nwhat is for dinner?'), null)
console.log(fail ? `${fail} failed` : 'ok')
process.exit(fail ? 1 : 0)

/**
 * "Did you mean name@gmail.com?" for common email domain typos. (Sarah, Nov 25 2026)
 *
 * Why: real sign-ups on Nov 25 used @gmil.com, @g.com and @iicloud.com. Those families never get their welcome
 * email or sign-in links, and every bounce hurts our sender reputation. We only suggest; the person can always keep
 * what they typed. Replaces the text-only hint from lib/email-check (Nov 8), which stays for problems we can't fix.
 *
 * Safe to import from client and server code.
 */

/** Big providers: the misspellings we fix to each one. */
const NAME_FIXES: Record<string, string[]> = {
  gmail: ['gmil', 'gmal', 'gmai', 'gmial', 'gamil', 'g', 'gmaill', 'gnail', 'gmaul', 'gmali', 'gmeil', 'gemail', 'gmsil'],
  yahoo: ['yaho', 'yahooo', 'yhoo', 'yahho', 'yaoo', 'yahop'],
  hotmail: ['hotmial', 'hotmai', 'hotmal', 'hotmil', 'hotamil', 'hotmaill', 'hormail', 'hitmail', 'hot'],
  icloud: ['iicloud', 'icoud', 'iclod', 'iclould', 'icloude', 'icluod', 'icload', 'iclud', 'icliud', 'cloud'],
  outlook: ['outlok', 'outloo', 'outllok', 'outlool', 'outloook', 'otlook'],
  aol: ['aoll', 'aal'],
  live: [], msn: [], me: [], ymail: [],
}

/** Internet-provider mail on .net: only the ending is fixed ("comcast.nte"). */
const NET_NAMES = new Set(['comcast', 'att', 'verizon', 'sbcglobal', 'bellsouth', 'charter', 'cox'])
const NET_TYPOS = new Set(['nte', 'ner', 'nt', 'met', 'bet', 'ne', 'nett'])

/** Top-level-domain typos of ".com" for the big providers above. */
const COM_TYPOS = new Set(['co', 'con', 'cmo', 'cm', 'om', 'comm', 'c', 'vom', 'xom', 'cpm', 'ocm', 'coom'])

const FIX_TO_NAME = new Map<string, string>()
for (const [name, typos] of Object.entries(NAME_FIXES)) {
  FIX_TO_NAME.set(name, name)
  for (const t of typos) FIX_TO_NAME.set(t, name)
}

/** The corrected address, or null when the domain looks fine (or isn't one we know). */
export function suggestEmail(raw: string): string | null {
  const email = raw.trim()
  const at = email.lastIndexOf('@')
  if (at < 1 || at === email.length - 1) return null
  const local = email.slice(0, at)
  const domain = email.slice(at + 1).toLowerCase()

  // "gmailcom" (missing dot) and "gmail" (missing .com).
  const glued = /^([a-z]+)com$/.exec(domain)
  if (glued && FIX_TO_NAME.has(glued[1])) return `${local}@${FIX_TO_NAME.get(glued[1])}.com`
  if (!domain.includes('.')) {
    if (NET_NAMES.has(domain)) return `${local}@${domain}.net`
    return FIX_TO_NAME.has(domain) ? `${local}@${FIX_TO_NAME.get(domain)}.com` : null
  }

  const dot = domain.indexOf('.')
  const name = domain.slice(0, dot)
  const tld = domain.slice(dot + 1)
  if (NET_NAMES.has(name)) return NET_TYPOS.has(tld) ? `${local}@${name}.net` : null
  const fixedName = FIX_TO_NAME.get(name)
  if (!fixedName) return null
  // Only fix the ending when it is a typo of ".com" (hotmail.co.uk and yahoo.com.mx are real).
  const fixedTld = tld === 'com' || COM_TYPOS.has(tld) ? 'com' : null
  if (!fixedTld) return null
  const fixed = `${fixedName}.${fixedTld}`
  return fixed === domain ? null : `${local}@${fixed}`
}

/** Domain part only, for tracking (never store the whole address in events). */
export function emailDomain(email: string): string {
  const at = email.lastIndexOf('@')
  return at < 0 ? '' : email.slice(at + 1).trim().toLowerCase().slice(0, 60)
}

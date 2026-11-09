/**
 * Catch mistyped email addresses at sign-up (Nov 8 2026: "…@hot" and "…@cloud.con" accounts got
 * a welcome email that bounced, and the family never heard from us). Returns a message to show, or null.
 */
const DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com', 'msn.com', 'comcast.net', 'att.net', 'me.com', 'verizon.net', 'sbcglobal.net', 'ymail.com', 'protonmail.com']
const FIXES: Record<string, string> = {
  gmial: 'gmail', gmai: 'gmail', gmal: 'gmail', gnail: 'gmail', gamil: 'gmail', gmaill: 'gmail',
  yaho: 'yahoo', yahooo: 'yahoo', yhoo: 'yahoo', hotmial: 'hotmail', hotmal: 'hotmail', hotmai: 'hotmail', hot: 'hotmail',
  outlok: 'outlook', outloo: 'outlook', iclod: 'icloud', icoud: 'icloud', cloud: 'icloud',
}
const TLD_FIXES: Record<string, string> = { con: 'com', cmo: 'com', cm: 'com', om: 'com', comm: 'com', vom: 'com', xom: 'com', co: 'com', nte: 'net', ner: 'net' }

export function emailProblem(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  const m = email.match(/^[^\s@]+@([^\s@]+)$/)
  if (!m) return 'Please check your email address.'
  const domain = m[1]
  const parts = domain.split('.')
  const local = email.slice(0, email.indexOf('@'))
  if (parts.length < 2 || parts.some((p) => !p)) {
    // "name@hot", "name@gmail"
    const guess = DOMAINS.find((d) => d.startsWith((FIXES[parts[0]] ?? parts[0]) + '.'))
    return guess ? `Did you mean ${local}@${guess}?` : 'That email address is missing its ending (like .com).'
  }
  const tld = parts[parts.length - 1]
  const name = parts.slice(0, -1).join('.')
  const fixedName = FIXES[name] ?? name
  const fixedTld = TLD_FIXES[tld] ?? tld
  const fixed = `${fixedName}.${fixedTld}`
  if (fixed !== domain && DOMAINS.includes(fixed)) return `Did you mean ${local}@${fixed}?`
  if (tld.length < 2 || /\d/.test(tld)) return 'Please check the ending of your email address.'
  return null
}

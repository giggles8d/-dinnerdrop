// Checks for lib/resend-webhook.ts (Sarah, Nov 27 2026). Run: npx tsx scripts/resend-webhook.test.ts
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifySvix, stopListFor } from '../lib/resend-webhook'

const secret = 'whsec_' + Buffer.from('test-secret-key-0123456789').toString('base64')
const sign = (id: string, ts: string, body: string) =>
  'v1,' + createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`${id}.${ts}.${body}`).digest('base64')
const now = Date.now(); const ts = String(Math.floor(now / 1000)); const body = '{"type":"contact.updated"}'

assert.equal(verifySvix(secret, 'msg_1', ts, sign('msg_1', ts, body), body, now), true, 'good signature')
assert.equal(verifySvix(secret, 'msg_1', ts, 'v1,AAAA ' + sign('msg_1', ts, body), body, now), true, 'second of two signatures')
assert.equal(verifySvix(secret, 'msg_1', ts, sign('msg_1', ts, body), body + ' ', now), false, 'body changed')
assert.equal(verifySvix(secret, 'msg_2', ts, sign('msg_1', ts, body), body, now), false, 'id changed')
assert.equal(verifySvix(secret, 'msg_1', ts, sign('msg_1', ts, body), body, now + 10 * 60 * 1000), false, 'stale')
assert.equal(verifySvix(secret, 'msg_1', ts, '', body, now), false, 'no signature')

assert.deepEqual(stopListFor({ type: 'contact.updated', data: { email: 'A@B.com', unsubscribed: true } }), { emails: ['a@b.com'], why: 'unsubscribed' })
assert.deepEqual(stopListFor({ type: 'contact.updated', data: { email: 'a@b.com', unsubscribed: false } }), { emails: [], why: null })
assert.deepEqual(stopListFor({ type: 'email.complained', data: { to: ['x@y.com'] } }), { emails: ['x@y.com'], why: 'complained' })
assert.deepEqual(stopListFor({ type: 'email.bounced', data: { to: ['x@y.com'], bounce: { type: 'Permanent' } } }), { emails: ['x@y.com'], why: 'bounced' })
assert.deepEqual(stopListFor({ type: 'email.bounced', data: { to: ['x@y.com'], bounce: { type: 'Temporary' } } }), { emails: [], why: null })
assert.deepEqual(stopListFor({ type: 'email.suppressed', data: { to: 'x@y.com' } }), { emails: ['x@y.com'], why: 'bounced' })
assert.deepEqual(stopListFor({ type: 'email.opened', data: { to: ['x@y.com'] } }), { emails: [], why: null })
console.log('resend-webhook: all 13 checks passed')

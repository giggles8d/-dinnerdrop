/**
 * Summary-first grocery list, 50/50 test (Sarah, Nov 25 2026; plan: CoworkOutputs\AppDev\2026-11-25_Summary-First-
 * List-Test-Plan.md). Built and shipped OFF; Sarah turns it on Mon Dec 7.
 *
 * Switch: app_kv key 'list_summary_test', value { "mode": "off" | "on" | "b_only", "start": "<ISO time>" }.
 *   off (or no row)  nobody is in the test.
 *   on               families who signed up at or after `start` (default Dec 7 00:00 ET) split 50/50 by a stable
 *                    hash of their user id: 'summary_a' (today's list) or 'summary_b' (summary first).
 *   b_only           test accounts only (lib/tracking-env isTestProfile) see 'summary_b', for a preview check.
 * Turn on:  insert into app_kv (key, value, updated_at) values ('list_summary_test', '{"mode":"on","start":"2026-12-07T05:00:00Z"}', now())
 *             on conflict (key) do update set value = excluded.value, updated_at = now();
 * Turn off (guardrail: unsubscribes or STOPs jump in the test group, Sarah: off right away, tell her after):
 *           update app_kv set value = '{"mode":"off"}', updated_at = now() where key = 'list_summary_test';
 * Not on /list (the shared no-sign-in link). Events carry meta.ab = the group (meta.variant is the send button's).
 */
export type SummaryGroup = 'summary_a' | 'summary_b'
export const SUMMARY_TEST_KEY = 'list_summary_test'
export const SUMMARY_TEST_DEFAULT_START = '2026-12-07T05:00:00Z'   // Mon Dec 7 2026, 00:00 ET

/** Stable 50/50 split: FNV-1a of the user id. The same family gets the same group on every device. */
export function summaryGroupFor(userId: string): SummaryGroup {
  let h = 0x811c9dc5
  for (let i = 0; i < userId.length; i++) { h ^= userId.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 }
  return h % 2 === 0 ? 'summary_a' : 'summary_b'
}

/** Which group (or none) a family is in, given the switch value, their signup time and whether they're a test account. */
export function summaryGroup(opts: { value: unknown; userId: string; createdAt: string | null | undefined; isTest: boolean }): SummaryGroup | null {
  const v = (opts.value && typeof opts.value === 'object' ? opts.value : {}) as { mode?: unknown; start?: unknown }
  const mode = v.mode === 'on' || v.mode === 'b_only' ? v.mode : 'off'
  if (mode === 'off') return null
  if (mode === 'b_only') return opts.isTest ? 'summary_b' : null
  const start = typeof v.start === 'string' && !Number.isNaN(Date.parse(v.start)) ? v.start : SUMMARY_TEST_DEFAULT_START
  if (!opts.createdAt || Date.parse(opts.createdAt) < Date.parse(start)) return null
  return summaryGroupFor(opts.userId)
}

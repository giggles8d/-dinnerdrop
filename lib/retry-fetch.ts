/**
 * fetch that retries reads once or twice when the connection drops ("fetch failed", ECONNRESET, "other side closed").
 * Recipe pages hit this ~12 times a week talking to Supabase (Nov 2026). Only GET/HEAD are retried, so a write is
 * never sent twice.
 */
export const retryFetch: typeof fetch = async (input, init) => {
  const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
  const tries = method === 'GET' || method === 'HEAD' ? 3 : 1
  let last: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fetch(input, init)
    } catch (e) {
      last = e
      if (!(e instanceof TypeError) || i === tries - 1) throw e
      await new Promise((r) => setTimeout(r, 200 * (i + 1)))
    }
  }
  throw last
}

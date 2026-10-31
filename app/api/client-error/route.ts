import { NextResponse } from 'next/server'

// Receives client-side exceptions from app/error.tsx and writes them to the
// server log (Vercel runtime logs) so a crash on a phone can be read from here.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { message?: string; stack?: string; url?: string; ua?: string; digest?: string }
    console.error('[client-error]', JSON.stringify({
      message: String(body.message ?? '').slice(0, 500),
      digest: body.digest,
      url: String(body.url ?? '').slice(0, 300),
      ua: String(body.ua ?? '').slice(0, 200),
      stack: String(body.stack ?? '').slice(0, 1500),
    }))
  } catch { /* never fail the client */ }
  return NextResponse.json({ ok: true })
}

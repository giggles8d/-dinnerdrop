import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * Preview-only scratch store (Nov 11 2026, recipe review by ChatGPT and Gemini): the browser saves each model answer
 * here, and the review script reads them back. 404 on production. Rows live in app_kv as review:<source>:<batch>:<part>.
 */
const admin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const SOURCES = ['chatgpt-mom', 'chatgpt-diet', 'gemini-mom', 'gemini-diet']

export async function POST(req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const b = await req.json().catch(() => ({})) as { source?: string; batch?: number; part?: number; body?: string }
  if (!b.source || !SOURCES.includes(b.source) || !(Number(b.batch) > 0) || typeof b.body !== 'string' || b.body.length > 400000) return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  const key = `review:${b.source}:${String(b.batch).padStart(2, '0')}:${Number(b.part) || 1}`
  const { error } = await admin().from('app_kv').upsert({ key, value: { body: b.body, savedAt: new Date().toISOString() }, updated_at: new Date().toISOString() })
  return error ? NextResponse.json({ error: error.message }, { status: 500 }) : NextResponse.json({ ok: true, key, length: b.body.length })
}

export async function GET() {
  if (process.env.VERCEL_ENV !== 'preview') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data } = await admin().from('app_kv').select('key, value').like('key', 'review:%').order('key')
  return NextResponse.json({ rows: (data ?? []).map((r) => ({ key: r.key, body: (r.value as { body?: string }).body ?? '' })) })
}

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// TEMPORARY, preview-only: runs one recipe-triage prompt through Claude for the recipe clean-up batch.
// Auth: x-triage-token, checked against its sha256 in app_kv.triage_token_sha256. 404 outside preview. Never merge.
export const maxDuration = 300

export async function POST(req: NextRequest) {
  if (process.env.VERCEL_ENV !== 'preview') return NextResponse.json({ error: 'not found' }, { status: 404 })
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const token = req.headers.get('x-triage-token') ?? ''
  const { data } = await admin.from('app_kv').select('value').eq('key', 'triage_token_sha256').maybeSingle()
  const want = (data?.value as { sha256?: string } | null)?.sha256
  if (token.length < 32 || !want || createHash('sha256').update(token).digest('hex') !== want) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { prompt, model, maxTokens } = (await req.json()) as { prompt: string; model?: string; maxTokens?: number }
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 })
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const r = await client.messages.create({ model: model || 'claude-sonnet-4-5', max_tokens: maxTokens || 8000, messages: [{ role: 'user', content: prompt }] })
    const text = r.content.map((c) => (c.type === 'text' ? c.text : '')).join('')
    return NextResponse.json({ text, model: r.model, usage: r.usage, stop: r.stop_reason })
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message || e) }, { status: 502 })
  }
}

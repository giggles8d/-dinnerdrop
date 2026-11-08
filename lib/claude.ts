import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  timeout: 55000, // 55s — just under Vercel's 60s serverless timeout
})

export async function generateWithClaude(prompt: string, maxTokens: number = 4000, model: string = 'claude-haiku-4-5-20251001'): Promise<string> {
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  if (!text) throw new Error('Empty response from AI model')
  return text
}

/**
 * Close a JSON document that was cut off or broke mid-way: keep everything up to the last complete array/object
 * element before `upTo`, then close whatever brackets are still open. Loses the broken element, keeps the rest
 * (Nov 8 2026: a store ad with 380 items failed whole on one bad line; meal plans the same).
 */
export function salvageJSON(text: string, upTo = text.length): string | null {
  const s = text.slice(0, upTo)
  // Last place an element ended: a "}" or "]" (outside strings) followed by a comma or the end.
  let inStr = false, esc = false, lastEnd = -1
  const stack: string[] = []
  const stackAt: string[][] = []
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue }
    if (c === '"') { inStr = true; continue }
    if (c === '{' || c === '[') stack.push(c === '{' ? '}' : ']')
    else if (c === '}' || c === ']') { stack.pop(); lastEnd = i; stackAt[i] = [...stack] }
  }
  if (lastEnd < 0) return null
  const open = stackAt[lastEnd] ?? []
  if (!open.length) return s.slice(0, lastEnd + 1)
  return s.slice(0, lastEnd + 1) + open.slice().reverse().join('')
}

export function parseClaudeJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    // 12" pizza / 9x13" pan inside a string: an inch mark the model forgot to escape.
    .replace(/(\d)"(?=\s*(?:[A-Za-z(]|x\s*\d|-))/g, '$1 in')
    // Trailing commas before a closing bracket.
    .replace(/,(\s*[}\]])/g, '$1')
  // Be forgiving: the model occasionally wraps the JSON in a sentence or two.
  // Extract the outermost object/array so stray prose doesn't break parsing.
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const firstObj = cleaned.search(/[{[]/)
    const lastObj = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
    if (firstObj >= 0 && lastObj > firstObj) {
      const body = cleaned.slice(firstObj, lastObj + 1)
      try {
        return JSON.parse(body) as T
      } catch (e) {
        // Cut at the error (or the end, if the reply was truncated) and keep the complete elements before it.
        const at = Number(String((e as Error).message).match(/position (\d+)/)?.[1] ?? body.length)
        for (const cut of [at, body.length]) {
          const fixed = salvageJSON(body, cut)
          if (fixed) { try { return JSON.parse(fixed) as T } catch { /* try the next cut */ } }
        }
        throw e
      }
    }
    const start = cleaned.search(/[{[]/)
    if (start >= 0) {
      const fixed = salvageJSON(cleaned.slice(start))
      if (fixed) return JSON.parse(fixed) as T
    }
    throw new Error('No JSON found in model response')
  }
}

/** Same model, with one image attached (recipe cards, cookbook pages, screenshots). */
export async function generateWithClaudeImage(
  prompt: string,
  image: { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' },
  maxTokens: number = 3000
): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
        { type: 'text', text: prompt },
      ],
    }],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  if (!text) throw new Error('Empty response from AI model')
  return text
}

export type ClaudeImage = { base64: string; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif' }

/** Same model, several images in one request (receipt screenshots that span pages). */
export async function generateWithClaudeImages(prompt: string, images: ClaudeImage[], maxTokens: number = 4000): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{
      role: 'user',
      content: [
        ...images.map((image) => ({ type: 'image' as const, source: { type: 'base64' as const, media_type: image.mediaType, data: image.base64 } })),
        { type: 'text' as const, text: prompt },
      ],
    }],
  })
  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  if (!text) throw new Error('Empty response from AI model')
  return text
}

/**
 * Conversation-grade model for reading what a family member meant (the texting bot). Falls back to
 * the fast model if the stronger one errors, so a text never goes unanswered.
 */
export const SMART_MODEL = process.env.SMS_MODEL || 'claude-sonnet-5-5'
export async function generateSmart(prompt: string, maxTokens = 600): Promise<string> {
  try { return await generateWithClaude(prompt, maxTokens, SMART_MODEL) }
  catch { return generateWithClaude(prompt, maxTokens) }
}

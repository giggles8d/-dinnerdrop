import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  timeout: 55000, // 55s — just under Vercel's 60s serverless timeout
})

export async function generateWithClaude(prompt: string, maxTokens: number = 4000): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''
  if (!text) throw new Error('Empty response from AI model')
  return text
}

export function parseClaudeJSON<T>(text: string): T {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  // Be forgiving: the model occasionally wraps the JSON in a sentence or two.
  // Extract the outermost object/array so stray prose doesn't break parsing.
  try {
    return JSON.parse(cleaned) as T
  } catch {
    const firstObj = cleaned.search(/[{[]/)
    const lastObj = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'))
    if (firstObj >= 0 && lastObj > firstObj) {
      return JSON.parse(cleaned.slice(firstObj, lastObj + 1)) as T
    }
    throw new Error('No JSON found in model response')
  }
}

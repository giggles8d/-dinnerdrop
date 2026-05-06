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
  return JSON.parse(cleaned) as T
}

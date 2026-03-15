import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const { imageBase64, mediaType } = await request.json()

    const client = new Anthropic()

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `Look at this photo of a pantry, fridge, or freezer. List all the food items you can identify.
Return ONLY valid JSON, no markdown:
{
  "items": [
    { "name": "chicken breast", "quantity": "2", "unit": "lbs" },
    { "name": "pasta", "quantity": "1", "unit": "box" }
  ]
}
Be specific with item names. If you cannot determine quantity or unit, use null. Only include actual food items.`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const clean = text.replace(/```json|```/g, '').trim()
    const data = JSON.parse(clean)

    return Response.json(data)
  } catch (error) {
    console.error('Error scanning pantry:', error)
    return Response.json({ error: 'Failed to scan image' }, { status: 500 })
  }
}

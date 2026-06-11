import { auth } from '@/lib/auth'
import { getContextFile, getPageMarkdown } from '@/lib/notion'
import { getTemplate } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const INTERVIEW_SYSTEM = `You are an expert knowledge-base interviewer for Superscript Health.
Your job is to help a staff member fill in a specific context document by asking targeted questions.

Rules:
- Ask ONE focused question at a time
- Questions should be specific, not generic ("What are the 3 most common reasons a claim gets rejected in ALE?" not "Tell me about failures")
- When the user answers, acknowledge it briefly, then generate a formatted markdown snippet they can insert directly into the doc
- Format your markdown snippet in a <insert> tag like: <insert>\n## Section\ncontent here\n</insert>
- Then ask the next question
- After 5-7 exchanges, offer to summarize everything as a complete draft section
- Speak in first person as the interviewer, not as the user

Context doc template to fill in:
{template}

Existing content so far:
{existing}

Author hints (people with relevant knowledge):
{hints}
`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileId, message, history = [] } = await req.json()

  const file = await getContextFile(fileId)
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  // Page body IS the current content
  const existingContent = await getPageMarkdown(fileId).catch(() => '')

  const template = getTemplate(file.section, file.title, file.author_hints?.[0])
  const systemPrompt = INTERVIEW_SYSTEM
    .replace('{template}', template)
    .replace('{existing}', existingContent || '(empty — not started yet)')
    .replace('{hints}', file.author_hints.join(', ') || 'None specified')

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: message || 'Start the interview for this document.' },
  ]

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(chunk.delta.text))
        }
      }
      controller.close()
    },
  })

  return new NextResponse(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Transfer-Encoding': 'chunked' },
  })
}

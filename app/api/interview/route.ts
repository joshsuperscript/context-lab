import { auth } from '@/lib/auth'
import { getContextFile, getPageMarkdown, queryContextFiles } from '@/lib/notion'
import { getTemplate } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are an AI writing assistant for Superscript Health's internal context repository.
You help staff write and improve context documents — either through structured interviews or by answering questions and proposing edits.

## Your capabilities
- Ask targeted, specific questions to help the user fill in the document step by step
- Answer questions about the existing content or related documents
- Propose specific edits or additions to the current draft
- When you have content to add to the doc, wrap it in <insert> tags: <insert>\n## Section\ncontent here\n</insert>

## Rules
- Be specific, not generic. "What are the 3 most common failure modes of the ALE overnight job?" beats "Tell me about failures"
- Keep responses concise — one question or one suggestion at a time
- When proposing an insert, format it as clean markdown ready to paste
- Use the existing content and related docs to avoid repeating what's already written
- You have the voice of a knowledgeable colleague, not a generic assistant

## Document being written
Title: {title}
Section: {section}
Template:
{template}

## Current content
{existing}

## Author hints (people with relevant knowledge)
{hints}

## Related published documents in this section
{related}
`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileId, section, message, history = [] } = await req.json()

  const file = await getContextFile(fileId)
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const contentPageId = file.source_page_id ?? fileId
  const existingContent = await getPageMarkdown(contentPageId).catch(() => '')

  // Load related published docs for context
  let relatedDocs = ''
  try {
    const published = await queryContextFiles({ section: section || file.section, status: 'published' })
    const others = published.filter((f) => f.id !== fileId).slice(0, 3)
    const contents = await Promise.all(
      others.map(async (f) => {
        const md = await getPageMarkdown(f.id).catch(() => '')
        return md ? `### ${f.title}\n${md.slice(0, 1500)}` : null
      })
    )
    relatedDocs = contents.filter(Boolean).join('\n\n---\n\n') || 'None yet'
  } catch {
    relatedDocs = 'Could not load related docs'
  }

  const template = getTemplate(file.section, file.title, file.author_hints?.[0])
  const systemPrompt = SYSTEM_PROMPT
    .replace('{title}', file.title)
    .replace('{section}', file.section)
    .replace('{template}', template)
    .replace('{existing}', existingContent || '(empty — not started yet)')
    .replace('{hints}', file.author_hints.join(', ') || 'None specified')
    .replace('{related}', relatedDocs)

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

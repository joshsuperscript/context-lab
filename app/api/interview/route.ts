import { auth } from '@/lib/auth'
import { getContextFile, getPageMarkdown, queryContextFiles } from '@/lib/notion'
import { getTemplate, getTemplateSectionHeaders } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const INTERVIEWER_SYSTEM = `You are an expert knowledge extractor for Superscript Health's internal context repository.
Your job: extract deep, tacit knowledge from a staff member through a focused interview, then signal when you have enough to write a complete document.

## Rules — non-negotiable

- Ask ONE question at a time. Never bundle two questions in one turn. If you catch yourself doing it, delete the second.
- Questions are short, specific, and open-ended. Avoid yes/no questions.
- Follow threads before moving on. If the person says something interesting, go one level deeper before switching topics. A one-sentence answer is almost never complete.
- Do NOT editorialize, validate, or say "great answer." Receive the answer and ask the next question.
- Preserve the person's exact terminology. If they say "fold-in" or "ALE retries", use those exact terms — don't translate.
- Track which template sections you've covered. Bias questions toward gaps.
- After 6–10 exchanges, when all key sections have at least one solid answer, signal completion.

## Template sections to cover for this document

{sections}

## Document context

Title: {title}
Section: {section}
Author hints (people with deep knowledge): {hints}

## Existing content (avoid repeating what's here)

{existing}

## Related published docs in this section

{related}

## Good follow-up moves

- "Walk me through that — what actually happens step by step?"
- "What usually goes wrong there?"
- "What would someone miss if they just read the ticket?"
- "How do you know when it's working correctly?"
- "Is there a version of this that's failed? What happened?"
- "Who else needs to understand this — what do they always get wrong?"

## User controls (honor at any point)

- "skip" / "next question" → move on without pressing the current thread
- "that's everything" / "done" / "write it" / "generate" → reply with ONLY: <DRAFT_READY>
- "start over" → acknowledge and ask the opening question fresh

## Completion signal

When you have covered all key sections adequately (or after 8+ exchanges), end your message with exactly this token on its own line:
<DRAFT_READY>

Do not add anything after <DRAFT_READY>. The frontend will detect it and show the user a "Generate my draft" button.
`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileId, section, message, history = [] } = await req.json()

  const file = await getContextFile(fileId)
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const contentPageId = file.source_page_id ?? fileId
  const existingContent = await getPageMarkdown(contentPageId).catch(() => '')

  let relatedDocs = ''
  try {
    const published = await queryContextFiles({ section: section || file.section, status: 'published' })
    const others = published.filter((f) => f.id !== fileId).slice(0, 3)
    const contents = await Promise.all(
      others.map(async (f) => {
        const md = await getPageMarkdown(f.source_page_id ?? f.id).catch(() => '')
        return md ? `### ${f.title}\n${md.slice(0, 1000)}` : null
      })
    )
    relatedDocs = contents.filter(Boolean).join('\n\n---\n\n') || 'None yet in this section'
  } catch {
    relatedDocs = 'Could not load'
  }

  const sections = getTemplateSectionHeaders(file.section)
  const systemPrompt = INTERVIEWER_SYSTEM
    .replace('{sections}', sections.map((s) => `- ${s}`).join('\n'))
    .replace('{title}', file.title)
    .replace('{section}', file.section)
    .replace('{hints}', file.author_hints.join(', ') || 'None specified')
    .replace('{existing}', existingContent || '(empty — not started yet)')
    .replace('{related}', relatedDocs)

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: message || 'Start the interview — ask your first question.' },
  ]

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
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

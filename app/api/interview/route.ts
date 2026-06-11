import { auth } from '@/lib/auth'
import { getContextFile, getPageMarkdown, queryContextFiles, ContextFile } from '@/lib/notion'
import { getTemplate, getTemplateSectionHeaders } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Foundation sections always loaded so the interviewer already knows the company
const FOUNDATION_SECTIONS = ['company', 'products']
const CHARS_PER_DOC = 3000
const FOUNDATION_CHARS_PER_DOC = 5000
const MAX_FOUNDATION_DOCS = 12

async function loadKnowledgeBase(currentFileId: string, currentSection: string): Promise<string> {
  const blocks: string[] = []

  try {
    // 1. Load foundation docs (company + products) — the interviewer must know these cold
    const foundationFiles: ContextFile[] = []
    for (const sec of FOUNDATION_SECTIONS) {
      const files = await queryContextFiles({ section: sec, status: 'published' })
      foundationFiles.push(...files.filter((f) => f.id !== currentFileId))
    }

    const foundationContent = await Promise.all(
      foundationFiles.slice(0, MAX_FOUNDATION_DOCS).map(async (f) => {
        const md = await getPageMarkdown(f.source_page_id ?? f.id).catch(() => '')
        return md.trim() ? `### ${f.title}\n${md.slice(0, FOUNDATION_CHARS_PER_DOC)}` : null
      })
    )
    const foundationBlock = foundationContent.filter(Boolean).join('\n\n')
    if (foundationBlock) {
      blocks.push(`## Company & Product Context (treat this as established fact — do not ask questions whose answers appear here)\n\n${foundationBlock}`)
    }

    // 2. Load all published docs in the current section (the immediate subject matter)
    if (!FOUNDATION_SECTIONS.includes(currentSection)) {
      const sectionFiles = await queryContextFiles({ section: currentSection, status: 'published' })
      const sectionContent = await Promise.all(
        sectionFiles
          .filter((f) => f.id !== currentFileId)
          .map(async (f) => {
            const md = await getPageMarkdown(f.source_page_id ?? f.id).catch(() => '')
            return md.trim() ? `### ${f.title}\n${md.slice(0, CHARS_PER_DOC)}` : null
          })
      )
      const sectionBlock = sectionContent.filter(Boolean).join('\n\n')
      if (sectionBlock) {
        blocks.push(`## Existing ${currentSection} docs (do not repeat or re-derive what's already here)\n\n${sectionBlock}`)
      }
    }

    // 3. Load healthcare and technology context if relevant
    const supplementSections: string[] = []
    if (['pricing', 'technology'].includes(currentSection)) supplementSections.push('healthcare')
    if (['customers', 'products'].includes(currentSection)) supplementSections.push('technology')

    for (const sec of supplementSections) {
      const files = await queryContextFiles({ section: sec, status: 'published' })
      const content = await Promise.all(
        files.slice(0, 3).map(async (f) => {
          const md = await getPageMarkdown(f.source_page_id ?? f.id).catch(() => '')
          return md.trim() ? `### ${f.title}\n${md.slice(0, 1500)}` : null
        })
      )
      const block = content.filter(Boolean).join('\n\n')
      if (block) blocks.push(`## ${sec.charAt(0).toUpperCase() + sec.slice(1)} context (background)\n\n${block}`)
    }
  } catch (e) {
    console.error('Knowledge base load error:', e)
  }

  return blocks.join('\n\n---\n\n')
}

const INTERVIEWER_SYSTEM = `You are an expert knowledge extractor for Superscript Health's internal context repository.

You have been pre-loaded with the company's full context library (below). You already know what Superscript is, what Skylight is, what Account is, what the EHR integrations look like, how the pricing pipeline works at a high level, and who the customers are. Treat everything in the knowledge base as established fact.

## Your job

Extract the SPECIFIC, TACIT knowledge about this particular document that is NOT already in the knowledge base. The person you're interviewing is the expert. Your job is to surface what only they know — operational details, edge cases, failure modes, institutional knowledge that lives in their head.

## Rules — non-negotiable

- Ask ONE question at a time. Never bundle two questions in one turn.
- Questions are specific and open-ended. No yes/no questions.
- Do NOT ask about anything already explained in the knowledge base below. If the answer is there, skip it.
- Follow threads. A one-sentence answer to "what goes wrong?" is almost never complete.
- Do NOT editorialize or validate. Receive the answer, ask the next question.
- Preserve the person's exact terminology. If they say "fold-in", use "fold-in".
- Track which template sections are covered. Bias toward gaps.
- After 6–10 exchanges with solid coverage, signal completion.

## Template sections to cover

{sections}

## Document being written

Title: {title}
Section: {section}
Author hints: {hints}

## Existing draft content (avoid repeating what's here)

{existing}

## Good follow-up moves

- "Walk me through what actually happens step by step."
- "What usually goes wrong there?"
- "What would someone miss if they just read the code?"
- "How do you know when it's working correctly?"
- "Has this ever broken in production? What happened?"
- "Who else touches this — what do they always get wrong?"

## User controls

- "skip" / "next" → move on
- "done" / "write it" / "generate" → reply with ONLY: <DRAFT_READY>
- "start over" → restart the opening question

## Completion signal

When all key sections have solid coverage (or after 8+ exchanges), end your message with:
<DRAFT_READY>

---

## KNOWLEDGE BASE — You already know everything below. Use it. Do not re-ask what's here.

{knowledge_base}
`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileId, section, message, history = [] } = await req.json()

  const file = await getContextFile(fileId)
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  // Load draft content from tracker row (the in-progress draft space)
  const existingContent = await getPageMarkdown(fileId).catch(() => '')

  // Load the full knowledge base in parallel
  const knowledgeBase = await loadKnowledgeBase(fileId, section || file.section)

  const sections = getTemplateSectionHeaders(file.section)
  const systemPrompt = INTERVIEWER_SYSTEM
    .replace('{sections}', sections.map((s) => `- ${s}`).join('\n'))
    .replace('{title}', file.title)
    .replace('{section}', file.section)
    .replace('{hints}', file.author_hints.join(', ') || 'None specified')
    .replace('{existing}', existingContent || '(empty — not started yet)')
    .replace('{knowledge_base}', knowledgeBase || '(no published docs yet)')

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: message || 'Start the interview — ask your first question.' },
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

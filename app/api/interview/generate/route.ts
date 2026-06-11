import { auth } from '@/lib/auth'
import { getContextFile, getPageMarkdown, queryContextFiles, ContextFile } from '@/lib/notion'
import { getTemplate } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const FOUNDATION_SECTIONS = ['company', 'products']
const CHARS_PER_DOC = 3000

async function loadWriterContext(currentFileId: string, currentSection: string): Promise<string> {
  const blocks: string[] = []
  try {
    // Foundation: company + products so the writer knows the full product context
    const foundationFiles: ContextFile[] = []
    for (const sec of FOUNDATION_SECTIONS) {
      const files = await queryContextFiles({ section: sec, status: 'published' })
      foundationFiles.push(...files.filter((f) => f.id !== currentFileId))
    }
    const foundationContent = await Promise.all(
      foundationFiles.slice(0, 12).map(async (f) => {
        const md = await getPageMarkdown(f.source_page_id ?? f.id).catch(() => '')
        return md.trim() ? `### ${f.title}\n${md.slice(0, CHARS_PER_DOC)}` : null
      })
    )
    const foundationBlock = foundationContent.filter(Boolean).join('\n\n')
    if (foundationBlock) blocks.push(`## Company & Product Foundation\n\n${foundationBlock}`)

    // Section-specific published docs — the reference for tone and format
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
      if (sectionBlock) blocks.push(`## Existing ${currentSection} docs (match this tone and depth)\n\n${sectionBlock}`)
    }
  } catch { /* ok */ }
  return blocks.join('\n\n---\n\n')
}

const WRITER_SYSTEM = `You are a senior technical writer for Superscript Health.
You have been pre-loaded with the company's knowledge base. Use it freely — you don't need the interview to tell you what Skylight is, how the EHR integrations work, or what the company does. That context is already here.

Your job: synthesize the interview transcript into a complete, publication-ready context document, using the knowledge base to fill in background and the interview to fill in the specific, tacit details only the person would know.

## Rules

- Write in a direct, informative voice — like a senior engineer wrote it after a long conversation.
- Preserve the person's exact terminology. If they said "fold-in", use "fold-in". Never normalize jargon.
- You MAY use facts from the knowledge base to fill in context that wasn't covered in the interview — this is the point of having it.
- For sections where neither the interview nor the knowledge base has enough detail: write <!-- TODO: [specific thing needed] -->
- Never invent specifics (numbers, names, dates). Only invent if it's obvious general context.
- Start directly with # Title. No preamble.
- Add at the very bottom: *Drafted from interview — review before publishing.*

## Template structure

{template}

## Interview transcript

{transcript}

---

## KNOWLEDGE BASE

{knowledge_base}
`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileId, history } = await req.json()
  if (!history?.length) return NextResponse.json({ error: 'No interview history' }, { status: 400 })

  const file = await getContextFile(fileId)
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  const [template, knowledgeBase] = await Promise.all([
    Promise.resolve(getTemplate(file.section, file.title, file.author_hints?.[0])),
    loadWriterContext(fileId, file.section),
  ])

  const transcript = history
    .map((m: { role: string; content: string }) =>
      `${m.role === 'user' ? 'Staff' : 'Interviewer'}: ${m.content.replace(/<DRAFT_READY>/g, '').trim()}`
    )
    .filter((l: string) => l.split(': ')[1]?.trim())
    .join('\n\n')

  const systemPrompt = WRITER_SYSTEM
    .replace('{template}', template)
    .replace('{transcript}', transcript)
    .replace('{knowledge_base}', knowledgeBase || '(no published docs yet)')

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Write the complete context document for: "${file.title}" (section: ${file.section})`,
      },
    ],
  })

  const content = response.content[0].type === 'text' ? response.content[0].text : ''
  return NextResponse.json({ content })
}

import { auth } from '@/lib/auth'
import { getContextFile, getPageMarkdown, queryContextFiles } from '@/lib/notion'
import { getTemplate } from '@/lib/templates'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const WRITER_SYSTEM = `You are a senior technical writer for Superscript Health.
Based on the interview transcript provided, write a complete, publication-ready context document.

## Rules

- Write in a direct, informative voice — like a senior engineer wrote it after a long conversation, not like meeting notes.
- Preserve the person's exact terminology and mental model. If they said "fold-in", use "fold-in". Never normalize jargon away.
- For sections the interview didn't cover, write exactly: <!-- TODO: [specific thing needed here] -->
- Never invent content. If something wasn't said, placeholder it.
- Do not add preamble, meta-commentary, or "here is the document" headers. Start directly with # Title.
- Include this single line at the very bottom: *Drafted from interview — review before publishing.*

## Template structure

{template}

## Interview transcript

{transcript}
`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { fileId, history } = await req.json()

  if (!history?.length) return NextResponse.json({ error: 'No interview history' }, { status: 400 })

  const file = await getContextFile(fileId)
  if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

  // Load related docs for additional context
  let relatedContext = ''
  try {
    const published = await queryContextFiles({ section: file.section, status: 'published' })
    const others = published.filter((f) => f.id !== fileId).slice(0, 2)
    const contents = await Promise.all(
      others.map(async (f) => {
        const md = await getPageMarkdown(f.source_page_id ?? f.id).catch(() => '')
        return md ? `### ${f.title} (published reference)\n${md.slice(0, 800)}` : null
      })
    )
    relatedContext = contents.filter(Boolean).join('\n\n')
  } catch { /* ok */ }

  const template = getTemplate(file.section, file.title, file.author_hints?.[0])

  // Format transcript from history
  const transcript = history
    .map((m: { role: string; content: string }) =>
      `${m.role === 'user' ? 'Staff' : 'Interviewer'}: ${m.content.replace(/<DRAFT_READY>/g, '').trim()}`
    )
    .filter((l: string) => l.split(': ')[1]?.trim())
    .join('\n\n')

  const systemPrompt = WRITER_SYSTEM
    .replace('{template}', template)
    .replace(
      '{transcript}',
      transcript + (relatedContext ? `\n\n## Related published documents for reference\n${relatedContext}` : '')
    )

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

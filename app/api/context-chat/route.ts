import { auth } from '@/lib/auth'
import { queryContextFiles, getPageMarkdown, pathToBreadcrumb } from '@/lib/notion'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { query, history = [] } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'Query required' }, { status: 400 })

  // Load all published pages with their content
  const published = await queryContextFiles({ status: 'published' }).catch(() => [])

  const knowledgeChunks = await Promise.all(
    published.map(async (f) => {
      const md = await getPageMarkdown(f.source_page_id ?? f.id).catch(() => '')
      if (!md.trim()) return null
      const breadcrumb = pathToBreadcrumb(f.path).join(' / ')
      return {
        id: f.id,
        title: f.title,
        path: f.path,
        breadcrumb,
        snippet: md.slice(0, 1500),
      }
    })
  )
  const docs = knowledgeChunks.filter(Boolean) as NonNullable<(typeof knowledgeChunks)[0]>[]

  const knowledgeBase = docs
    .map((d) => `### ${d!.breadcrumb}\n${d!.snippet}`)
    .join('\n\n---\n\n')

  const SYSTEM = `You are a search assistant for Superscript Health's internal context library.
Your job: answer questions and find the most relevant context files based on the user's query.
You have access to the full text of all published context files below.

Rules:
- Answer the user's question directly and concisely
- Identify the most relevant files (up to 5) and include their IDs
- For each relevant file, extract a 1-2 sentence snippet that directly addresses the query
- If no files match, say so clearly
- Respond in JSON with this exact shape:
{
  "answer": "direct answer to the question",
  "files": [
    { "id": "...", "title": "...", "breadcrumb": "...", "snippet": "..." }
  ]
}

## Published context files

${knowledgeBase}`

  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: 'user', content: query },
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: SYSTEM,
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'

  // Parse JSON response — the model returns structured JSON
  let parsed = { answer: '', files: [] }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch {
    parsed = { answer: text, files: [] }
  }

  return NextResponse.json(parsed)
}

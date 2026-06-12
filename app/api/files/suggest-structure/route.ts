import { auth } from '@/lib/auth'
import { queryContextFiles } from '@/lib/notion'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SECTIONS = ['pricing', 'technology', 'customers', 'products', 'healthcare', 'go-to-market', 'design', 'company']

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { description } = await req.json()
  if (!description?.trim()) return NextResponse.json({ error: 'Description required' }, { status: 400 })

  // Load existing paths so the AI knows what already exists
  const existing = await queryContextFiles().catch(() => [])
  const existingPaths = existing.map((f) => f.path).join('\n')

  const SYSTEM = `You are helping a user create a new context document for Superscript Health's internal knowledge base.
Based on their description, suggest the best section, title, and path for the new document.

Sections available: ${SECTIONS.join(', ')}

Existing document paths (do not suggest duplicates):
${existingPaths}

Respond with ONLY valid JSON:
{
  "title": "Human-readable title",
  "section": "one of the available sections",
  "path": "context/section/kebab-case-slug.md",
  "clarifyingQuestion": "one short question if you need more info, otherwise null"
}

Path rules:
- Always starts with "context/"
- Section matches one of the available sections
- Slug is lowercase, hyphens for spaces, no special chars
- If it belongs under an existing parent (e.g. a customer), nest it: context/customers/customer-name/filename.md`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 256,
    system: SYSTEM,
    messages: [{ role: 'user', content: description }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}'
  let parsed = { title: '', section: 'company', path: '', clarifyingQuestion: null }
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
  } catch {
    parsed.title = description
  }

  return NextResponse.json(parsed)
}

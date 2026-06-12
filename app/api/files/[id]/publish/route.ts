import { auth } from '@/lib/auth'
import { getContextFile, updateContextFile, updatePageContent } from '@/lib/notion'
import { updateLinearTicketStatus } from '@/lib/linear'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await req.json()

  const file = await getContextFile(id)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Write content to the source page (live Notion page) if it exists, else tracker row
  const targetPageId = file.source_page_id ?? id
  if (content?.trim()) {
    await updatePageContent(targetPageId, content)
  }

  // Mark published — preserve assigned_to (owner stays)
  const updated = await updateContextFile(id, {
    status: 'published',
    submitted_by: session.user.email,
    submitted_at: new Date().toISOString(),
  })

  if (updated.linear_ticket_id) {
    updateLinearTicketStatus(updated.linear_ticket_id, 'published').catch(console.error)
  }

  return NextResponse.json(updated)
}

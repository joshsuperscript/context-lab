import { auth } from '@/lib/auth'
import { getContextFile, updateContextFile, getPageMarkdown, updatePageContent, isApprover } from '@/lib/notion'
import { updateLinearTicketStatus } from '@/lib/linear'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isApprover(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const file = await getContextFile(id)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // 1. Read draft content from tracker row
  const draftContent = await getPageMarkdown(id).catch(() => '')

  // 2. If file has a source page (existing Content Library page), publish the draft there
  if (file.source_page_id && draftContent.trim()) {
    await updatePageContent(file.source_page_id, draftContent)
  }

  // 3. Update tracker status
  const updated = await updateContextFile(id, {
    status: 'published',
    reviewed_by: session.user.email,
    reviewed_at: new Date().toISOString(),
  })

  // 4. Sync Linear
  if (updated.linear_ticket_id) {
    updateLinearTicketStatus(updated.linear_ticket_id, 'published').catch(console.error)
  }

  return NextResponse.json(updated)
}

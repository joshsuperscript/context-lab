import { auth } from '@/lib/auth'
import { getContextFile, updateContextFile } from '@/lib/notion'
import { updateLinearTicketStatus, updateLinearAssignee } from '@/lib/linear'
import { notifyAssignment } from '@/lib/slack'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const file = await getContextFile(id)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(file)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()

  const current = await getContextFile(id)
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['assigned_to', 'status', 'submitted_by', 'submitted_at', 'review_note', 'reviewed_by', 'reviewed_at', 'linear_ticket_id']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Auto-set status when assigning/claiming
  if ('assigned_to' in updates && updates.assigned_to && current.status === 'requested') {
    updates.status = 'in_progress'
  }
  // Clear assignee when marking stale
  if (updates.status === 'stale' && !('assigned_to' in updates)) {
    updates.assigned_to = null
  }

  const updated = await updateContextFile(id, updates as Parameters<typeof updateContextFile>[1])

  // Fire-and-forget side effects
  const newAssignee = typeof updates.assigned_to === 'string' ? updates.assigned_to : null
  const assigneeChanged = 'assigned_to' in updates && newAssignee && newAssignee !== current.assigned_to

  if (updated.linear_ticket_id) {
    if ('status' in updates) updateLinearTicketStatus(updated.linear_ticket_id, updated.status).catch(console.error)
    if (assigneeChanged) updateLinearAssignee(updated.linear_ticket_id, newAssignee!).catch(console.error)
  }

  if (assigneeChanged) {
    notifyAssignment({
      assigneeEmail: newAssignee!,
      fileTitle: updated.title,
      fileId: updated.id,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? '',
    }).catch(console.error)
  }

  return NextResponse.json(updated)
}

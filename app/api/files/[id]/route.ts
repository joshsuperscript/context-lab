import { auth } from '@/lib/auth'
import { getContextFile, updateContextFile } from '@/lib/notion'
import { updateLinearTicketStatus, updateLinearAssignee } from '@/lib/linear'
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

  // Fetch current state
  const current = await getContextFile(id)
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allowed = ['assigned_to', 'status', 'submitted_by', 'submitted_at', 'review_note', 'reviewed_by', 'reviewed_at', 'linear_ticket_id']
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  // Auto-set status when claiming
  if ('assigned_to' in updates && updates.assigned_to && current.status === 'requested') {
    updates.status = 'in_progress'
  }

  const updated = await updateContextFile(id, updates as Parameters<typeof updateContextFile>[1])

  // Sync to Linear
  if (updated.linear_ticket_id) {
    if ('status' in updates) updateLinearTicketStatus(updated.linear_ticket_id, updated.status).catch(console.error)
    if ('assigned_to' in updates && typeof updates.assigned_to === 'string' && updates.assigned_to) {
      updateLinearAssignee(updated.linear_ticket_id, updates.assigned_to).catch(console.error)
    }
  }

  return NextResponse.json(updated)
}

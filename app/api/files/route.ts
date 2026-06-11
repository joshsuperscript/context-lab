import { auth } from '@/lib/auth'
import { queryContextFiles, createContextFile } from '@/lib/notion'
import { createLinearTicket, updateLinearTicketStatus } from '@/lib/linear'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const filters = {
    section: searchParams.get('section') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    assigned_to: searchParams.get('mine') === '1' ? session.user.email : undefined,
  }

  const files = await queryContextFiles(filters)
  return NextResponse.json(files)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { path, title, section, priority = 'medium', is_expansion = false, author_hints = [], bus_factor = false } = body

  if (!path || !title || !section) {
    return NextResponse.json({ error: 'path, title, section required' }, { status: 400 })
  }

  const file = await createContextFile({
    path, title, section, priority, is_expansion, author_hints, bus_factor,
    status: 'requested', assigned_to: null, submitted_by: null, submitted_at: null,
    reviewed_by: null, reviewed_at: null, review_note: null, linear_ticket_id: null,
  })

  // Create Linear ticket in background
  const appUrl = `${process.env.NEXT_PUBLIC_APP_URL}/write/${file.id}`
  createLinearTicket({ title, description: `Context file requested: ${path}`, priority, appUrl })
    .then(async (ticketId) => {
      if (ticketId) {
        const { updateContextFile } = await import('@/lib/notion')
        await updateContextFile(file.id, { linear_ticket_id: ticketId })
      }
    })
    .catch(console.error)

  return NextResponse.json(file, { status: 201 })
}

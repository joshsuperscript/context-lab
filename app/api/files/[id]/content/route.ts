import { auth } from '@/lib/auth'
import { getContextFile, updatePageContent } from '@/lib/notion'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { content } = await req.json()

  const file = await getContextFile(id)
  if (!file) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Write to source_page_id (original Content Library page) if present, otherwise the tracker row
  const contentPageId = file.source_page_id ?? id
  await updatePageContent(contentPageId, content)

  return NextResponse.json({ ok: true })
}

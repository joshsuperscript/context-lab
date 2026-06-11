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

  // The file's Notion page IS the tracking row — content lives in its page body
  await updatePageContent(id, content)

  return NextResponse.json({ ok: true })
}

import { auth } from '@/lib/auth'
import { getPageMarkdown } from '@/lib/notion'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ pageId: string }> }) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageId } = await params
  const content = await getPageMarkdown(pageId)
  return NextResponse.json({ content })
}

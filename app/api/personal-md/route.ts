import { auth } from '@/lib/auth'
import { getPersonalMd, updatePersonalMd } from '@/lib/notion'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const result = await getPersonalMd(session.user.email)
  if (!result) return NextResponse.json({ error: 'Staff page not found' }, { status: 404 })
  return NextResponse.json(result)
}

export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { pageId, content } = await req.json()
  if (!pageId || !content) return NextResponse.json({ error: 'pageId and content required' }, { status: 400 })

  await updatePersonalMd(pageId, content)
  return NextResponse.json({ ok: true })
}

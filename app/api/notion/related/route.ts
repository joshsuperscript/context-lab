import { auth } from '@/lib/auth'
import { queryContextFiles, getPageMarkdown } from '@/lib/notion'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const section = req.nextUrl.searchParams.get('section') ?? ''

  try {
    const published = await queryContextFiles({ section: section || undefined, status: 'published' })
    const sample = published.slice(0, 3)

    const docs = await Promise.all(
      sample.map(async (f) => {
        const content = await getPageMarkdown(f.id).catch(() => '')
        return { title: f.title, content: content.slice(0, 2000) }
      })
    )

    return NextResponse.json({ docs })
  } catch {
    return NextResponse.json({ docs: [] })
  }
}

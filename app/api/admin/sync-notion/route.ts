import { auth } from '@/lib/auth'
import { isApprover, queryContextFiles, createContextFile, getContextLibraryStubs } from '@/lib/notion'
import { NextResponse } from 'next/server'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isApprover(session.user.email)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Get all stubs from Notion Content Library
  const stubs = await getContextLibraryStubs()

  // Get existing tracker entries
  const existing = await queryContextFiles()
  const existingPageIds = new Set(existing.map((f) => f.id))
  const existingPaths = new Set(existing.map((f) => f.path))

  let added = 0
  let skipped = 0

  for (const stub of stubs) {
    if (existingPageIds.has(stub.notionPageId) || existingPaths.has(stub.path)) {
      skipped++
      continue
    }

    try {
      await createContextFile({
        path: stub.path,
        title: stub.title.replace(/\.md$/i, ''),
        section: stub.section,
        status: 'requested',
        priority: 'medium',
        source_page_id: stub.notionPageId,  // link to original Content Library page
        assigned_to: null,
        submitted_by: null,
        submitted_at: null,
        reviewed_by: null,
        reviewed_at: null,
        review_note: null,
        linear_ticket_id: null,
        is_expansion: true,
        author_hints: [],
        bus_factor: false,
      })
      added++
    } catch (e) {
      console.error('Failed to create entry for', stub.path, e)
      skipped++
    }
  }

  return NextResponse.json({ added, skipped, total: stubs.length })
}

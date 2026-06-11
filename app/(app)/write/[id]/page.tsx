import { auth } from '@/lib/auth'
import { getContextFile, getPageMarkdown, isApprover } from '@/lib/notion'
import { getTemplate } from '@/lib/templates'
import { redirect, notFound } from 'next/navigation'
import WriteClient from '@/components/WriteClient'

export default async function WritePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const email = session?.user?.email!
  const { id } = await params

  const file = await getContextFile(id)
  if (!file) notFound()

  const admin = isApprover(email)
  if (file.assigned_to !== email && !admin) redirect('/library')

  // 1. Try tracker row first — this is the in-progress draft space
  let initialContent = await getPageMarkdown(id).catch(() => '')

  // 2. If no draft yet, fall back to the source page (published/existing content as reference)
  if (!initialContent && file.source_page_id) {
    initialContent = await getPageMarkdown(file.source_page_id).catch(() => '')
  }

  // 3. If nothing, use the section template
  if (!initialContent) {
    initialContent = getTemplate(file.section, file.title, file.author_hints?.[0])
  }

  return <WriteClient file={file} initialContent={initialContent} currentUserEmail={email} />
}

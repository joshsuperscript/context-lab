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

  // Content lives in the page body of the Notion database row
  let initialContent = await getPageMarkdown(id).catch(() => '')
  if (!initialContent) {
    initialContent = getTemplate(file.section, file.title, file.author_hints?.[0])
  }

  return <WriteClient file={file} initialContent={initialContent} currentUserEmail={email} />
}

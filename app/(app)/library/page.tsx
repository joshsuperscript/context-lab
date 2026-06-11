import { auth } from '@/lib/auth'
import { queryContextFiles, isApprover } from '@/lib/notion'
import LibraryClient from '@/components/LibraryClient'

export default async function LibraryPage() {
  const session = await auth()
  const email = session?.user?.email!

  let files: Awaited<ReturnType<typeof queryContextFiles>> = []
  try {
    files = await queryContextFiles()
  } catch (e) {
    console.error('Notion query failed:', e)
  }

  const admin = isApprover(email)

  return <LibraryClient files={files} currentUserEmail={email} isAdmin={admin} />
}

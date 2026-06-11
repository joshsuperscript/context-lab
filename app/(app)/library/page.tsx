import { auth } from '@/lib/auth'
import { queryContextFiles, isApprover } from '@/lib/notion'
import LibraryClient from '@/components/LibraryClient'

export default async function LibraryPage() {
  const session = await auth()
  const email = session?.user?.email!

  const files = await queryContextFiles()
  const admin = isApprover(email)

  return <LibraryClient files={files} currentUserEmail={email} isAdmin={admin} />
}

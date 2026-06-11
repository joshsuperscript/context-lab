import { auth } from '@/lib/auth'
import { queryContextFiles, isApprover } from '@/lib/notion'
import { redirect } from 'next/navigation'
import AdminClient from '@/components/AdminClient'

export default async function AdminPage() {
  const session = await auth()
  const email = session?.user?.email!

  if (!isApprover(email)) redirect('/dashboard')

  let pending: Awaited<ReturnType<typeof queryContextFiles>> = []
  try {
    pending = await queryContextFiles({ status: 'draft_submitted' })
  } catch (e) {
    console.error('Notion query failed:', e)
  }

  return <AdminClient pending={pending} reviewerEmail={email} />
}
